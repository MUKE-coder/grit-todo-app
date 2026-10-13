"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Mail, Phone, ContactRound, ArrowUpRight } from "lucide-react";
import { getPublicContact } from "@/lib/contacts-public";
import { ContactAvatar } from "./contact-avatar";
import { ContactForm } from "@/components/forms/ContactForm";
import { DeleteContact } from "./delete-contact";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function ContactDetail({ id }: { id: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const [notice, setNotice] = useState("");
  const query = useQuery({ queryKey: ["public-contact", id], queryFn: () => getPublicContact(id) });
  const contact = query.data;
  return (
    <div className="min-h-[80vh] bg-[#f7f9fb] px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/contacts"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-teal-700"
        >
          <ArrowLeft className="size-4" />
          Back to contacts
        </Link>
        {query.isPending ? (
          <div role="status" className="h-80 animate-pulse rounded-2xl bg-slate-200">
            <span className="sr-only">Loading contact</span>
          </div>
        ) : query.isError ? (
          <div role="alert" className="rounded-2xl border bg-white p-12 text-center">
            <h1 className="mb-4 text-xl font-semibold">Unable to load this contact</h1>
            <Button variant="outline" onClick={() => void query.refetch()}>
              Try again
            </Button>
          </div>
        ) : !contact ? (
          <div className="rounded-2xl border bg-white p-12 text-center">
            <ContactRound className="mx-auto mb-4 size-10 text-slate-400" />
            <h1 className="text-2xl font-semibold">Contact not found</h1>
            <p className="mb-6 mt-2 text-slate-500">
              This contact may have been deleted or is no longer available.
            </p>
            <Button asChild variant="outline">
              <Link href="/contacts">Browse contacts</Link>
            </Button>
          </div>
        ) : (
          <>
            {notice && (
              <p role="status" className="mb-4 rounded-xl bg-teal-50 p-4 text-sm text-teal-800">
                {notice}
              </p>
            )}
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-28 bg-teal-800 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-600 to-teal-900 sm:h-36" />
              <div className="px-6 pb-8 sm:px-9">
                <div className="-mt-12 mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div className="rounded-[28px] bg-white p-1.5">
                    <ContactAvatar contact={contact} large />
                  </div>
                  <div className="flex items-center gap-2">
                    <ContactForm
                      contact={contact}
                      onSaved={() => {
                        setNotice("Contact updated successfully.");
                        void client.invalidateQueries({ queryKey: ["public-contact", id] });
                        void client.invalidateQueries({ queryKey: ["public-contacts"] });
                      }}
                    />
                    <DeleteContact
                      contact={contact}
                      onDeleted={() => {
                        void client.invalidateQueries({ queryKey: ["public-contacts"] });
                        client.removeQueries({ queryKey: ["public-contact", id] });
                        router.push("/contacts");
                      }}
                    />
                  </div>
                </div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-teal-700">
                  Contact profile
                </p>
                <h1 className="break-words text-3xl font-semibold tracking-tight">
                  {contact.name || "Unnamed contact"}
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  All the details you need to stay in touch.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      label: "Email address",
                      value: contact.email,
                      href: `mailto:${contact.email}`,
                      Icon: Mail,
                    },
                    {
                      label: "Phone number",
                      value: contact.phone,
                      href: `tel:${contact.phone}`,
                      Icon: Phone,
                    },
                  ].map(({ label, value, href, Icon }) => (
                    <div key={label} className="min-w-0 rounded-xl border border-slate-200 p-5">
                      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500">
                        <Icon className="size-4 text-teal-700" />
                        {label}
                      </div>
                      {value ? (
                        <a
                          href={href}
                          className="break-all text-sm font-medium text-slate-800 hover:text-teal-700"
                        >
                          {value}
                          <ArrowUpRight className="ml-1 inline size-3.5 text-slate-400" />
                        </a>
                      ) : (
                        <span className="text-sm text-slate-400">Not provided</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  {contact.email && (
                    <Button
                      asChild
                      className="h-10 rounded-lg bg-teal-700 text-white hover:bg-teal-800"
                    >
                      <a href={`mailto:${contact.email}`}>
                        <Mail />
                        Send email
                      </a>
                    </Button>
                  )}
                  {contact.phone && (
                    <Button asChild variant="outline" className="h-10 rounded-lg border-slate-200">
                      <a href={`tel:${contact.phone}`}>
                        <Phone />
                        Call contact
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </article>
          </>
        )}
      </div>
    </div>
  );
}
