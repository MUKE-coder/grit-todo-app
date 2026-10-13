import type { Metadata } from "next";
import { ContactsDirectory } from "@/components/contacts/contacts-directory";

export const metadata: Metadata = { title: "Contacts | todo-app" };

export default function ContactsPage() {
  return <ContactsDirectory />;
}
