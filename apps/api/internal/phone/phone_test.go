package phone

import (
	"testing"

	"todo-app/apps/api/internal/fieldtypes"
)

func TestNormalize(t *testing.T) {
	good := map[[2]string]string{
		{"+256 772 123456", ""}:  "+256772123456",
		{"0772 123456", "UG"}:    "+256772123456",
		{"+44 7400 123456", ""}:  "+447400123456",
		{"(201) 555-0123", "US"}: "+12015550123",
	}
	for in, want := range good {
		got, err := Normalize(in[0], in[1])
		if err != nil || got != want {
			t.Errorf("Normalize(%q, %q) = %q, %v; want %q", in[0], in[1], got, err, want)
		}
	}
	for _, bad := range []string{"+256 12", "12345", "not a number", "+1 555 0000"} {
		if _, err := Normalize(bad, ""); err == nil {
			t.Errorf("Normalize accepted %q", bad)
		}
	}
}

func TestTheTelFormatIsRegistered(t *testing.T) {
	got, err := fieldtypes.Normalize("tel:UG", "0772 123456")
	if err != nil || got != "+256772123456" {
		t.Fatalf("tel:UG = %v, %v", got, err)
	}
}

func TestSamplesAreValidAndDistinct(t *testing.T) {
	seen := map[string]bool{}
	for n := 0; n < 5000; n++ {
		s := Sample(n)
		if _, err := Normalize(s, ""); err != nil {
			t.Fatalf("Sample(%d) = %q is not valid: %v", n, s, err)
		}
		if seen[s] {
			t.Fatalf("Sample(%d) repeats %q", n, s)
		}
		seen[s] = true
	}
}
