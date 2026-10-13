import { expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ContactAvatar, contactImageUrl } from "@/components/contacts/contact-avatar";

it("shows initials for missing and broken profile photos", () => {
  const { rerender } = render(<ContactAvatar contact={{ name: "Jane Doe", profile: null }} />);
  expect(screen.getByLabelText("Jane Doe initials")).toHaveTextContent("JD");
  rerender(
    <ContactAvatar
      contact={{
        name: "Jane Doe",
        profile: {
          url: "/files/missing.jpg",
          key: "missing.jpg",
          name: "Jane",
          size: 1,
          mime: "image/jpeg",
        },
      }}
    />
  );
  fireEvent.error(screen.getByRole("img"));
  expect(screen.getByLabelText("Jane Doe initials")).toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

it("resolves storage paths against the API and refuses non-web URLs", () => {
  expect(contactImageUrl("/files/photo.jpg")).toMatch(/\/files\/photo.jpg$/);
  expect(contactImageUrl("javascript:alert(1)")).toBeUndefined();
});
