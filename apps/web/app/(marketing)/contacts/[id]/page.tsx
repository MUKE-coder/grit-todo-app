import type { Metadata } from "next";
import { ContactDetail } from "@/components/contacts/contact-detail";

export const metadata: Metadata = { title: "Contact details | todo-app" };

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContactDetail id={id} />;
}
