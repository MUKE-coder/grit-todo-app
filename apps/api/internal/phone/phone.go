// Package phone validates, normalises and formats phone numbers with
// libphonenumber's metadata (github.com/nyaruka/phonenumbers, MIT).
//
// Importing it registers the tel format with internal/fieldtypes, which is
// why a model with a tel field imports it for effect:
//
//	import _ "todo-app/apps/api/internal/phone"
package phone

import (
	"errors"
	"fmt"
	"strings"

	"github.com/nyaruka/phonenumbers"

	"todo-app/apps/api/internal/fieldtypes"
)

func init() {
	fieldtypes.Register("tel", func(value any, region string) (any, error) {
		switch v := value.(type) {
		case string:
			if v == "" {
				return v, nil
			}
			return Normalize(v, region)
		case *string:
			if v == nil || *v == "" {
				return v, nil
			}
			out, err := Normalize(*v, region)
			if err != nil {
				return nil, err
			}
			return &out, nil
		case nil:
			return nil, nil
		}
		return nil, errors.New("must be text")
	})
}

// Normalize returns raw in E.164 (+256772123456), or an error when it is not
// a number that can be dialled in its country. region is the ISO 3166-1 code
// a number written without its country code is read in; with none, the number
// has to start with + and its country code.
func Normalize(raw, region string) (string, error) {
	region = strings.ToUpper(strings.TrimSpace(region))
	if region == "" {
		region = "ZZ"
	}
	num, err := phonenumbers.Parse(strings.TrimSpace(raw), region)
	if err != nil {
		if region == "ZZ" {
			return "", errors.New("must be an international number starting with + and the country code, such as +256772123456")
		}
		return "", errors.New("is not a phone number")
	}
	if !phonenumbers.IsValidNumber(num) {
		country := phonenumbers.GetRegionCodeForNumber(num)
		if country == "" || country == "ZZ" {
			return "", errors.New("is not a valid phone number")
		}
		return "", fmt.Errorf("is not a valid phone number for %s", country)
	}
	return phonenumbers.Format(num, phonenumbers.E164), nil
}

// Country is the ISO 3166-1 code a stored E.164 number belongs to, or "".
func Country(e164 string) string {
	num, err := phonenumbers.Parse(e164, "ZZ")
	if err != nil {
		return ""
	}
	return phonenumbers.GetRegionCodeForNumber(num)
}

// International formats a stored number for people: +256 772 123456.
func International(e164 string) string {
	num, err := phonenumbers.Parse(e164, "ZZ")
	if err != nil {
		return e164
	}
	return phonenumbers.Format(num, phonenumbers.INTERNATIONAL)
}

// sampleRegions is the spread seeded numbers come from.
var sampleRegions = []string{
	"UG", "KE", "TZ", "RW", "NG", "GH", "ZA", "EG", "GB", "US",
	"CA", "DE", "FR", "IN", "BR", "AU", "JP", "AE", "MX", "NL",
}

// Sample returns a valid mobile number in E.164 for seeders, a different one
// for every n. It starts from libphonenumber's example mobile number for a
// country and replaces its last five digits with digits derived from n, then
// checks the result against the country's metadata, so the numbers are real
// shapes rather than random digits.
func Sample(n int) string {
	if n < 0 {
		n = -n
	}
	region := sampleRegions[n%len(sampleRegions)]
	k := n / len(sampleRegions)
	example := phonenumbers.GetExampleNumberForType(region, phonenumbers.MOBILE)
	if example == nil {
		return ""
	}
	national := phonenumbers.GetNationalSignificantNumber(example)
	if len(national) <= 5 {
		return phonenumbers.Format(example, phonenumbers.E164)
	}
	prefix := fmt.Sprintf("+%d%s", example.GetCountryCode(), national[:len(national)-5])
	for attempt := 0; attempt < 10; attempt++ {
		// 7919 is prime and coprime with 10^5, so k maps to distinct suffixes
		// for the first hundred thousand rows per country.
		suffix := ((k+attempt*10000)*7919 + 12345) % 100000
		candidate, err := phonenumbers.Parse(fmt.Sprintf("%s%05d", prefix, suffix), "ZZ")
		if err == nil && phonenumbers.IsValidNumber(candidate) {
			return phonenumbers.Format(candidate, phonenumbers.E164)
		}
	}
	return phonenumbers.Format(example, phonenumbers.E164)
}
