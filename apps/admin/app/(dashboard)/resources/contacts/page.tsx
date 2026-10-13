"use client";

import { ResourcePage } from "@/components/resource/resource-page";
import { contactResource } from "@/resources/contacts/contacts";

export default function ContactsPage() {
  return <ResourcePage resource={contactResource} />;
}
