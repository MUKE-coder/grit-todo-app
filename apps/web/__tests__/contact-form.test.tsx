import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactForm } from "@/components/forms/ContactForm";
import { publicCreate } from "@/lib/contacts-public";

vi.mock("@/lib/contacts-public", () => ({ publicCreate: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

it("keeps entered values on conflict and closes after a successful retry", async () => {
  vi.mocked(publicCreate).mockResolvedValueOnce({
    status: 409, body: null, message: "That email is already taken",
  }).mockResolvedValueOnce({ status: 201, body: { id: "contact-id" } });
  const user = userEvent.setup();
  render(<ContactForm />);
  await user.click(screen.getByRole("button", { name: "Add Contact" }));
  await user.type(screen.getByLabelText("Contact Name"), "Test Contact");
  await user.type(screen.getByLabelText("Contact Email"), "first@example.com");
  await user.click(screen.getByRole("button", { name: "Save Contact" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("That email is already taken");
  expect(screen.getByLabelText("Contact Name")).toHaveValue("Test Contact");
  expect(publicCreate).toHaveBeenCalledWith("/api/v1/public/contacts", expect.objectContaining({
    name: "Test Contact", email: "first@example.com",
  }));
  await user.clear(screen.getByLabelText("Contact Email"));
  await user.type(screen.getByLabelText("Contact Email"), "second@example.com");
  await user.click(screen.getByRole("button", { name: "Save Contact" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
