"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ContactRound,
  Search,
  Users,
  RotateCw,
  Mail,
  Phone,
  X,
} from "lucide-react";
import { getPublicContacts } from "@/lib/contacts-public";
import { ContactForm } from "@/components/forms/ContactForm";
import { ContactAvatar } from "./contact-avatar";
import { DeleteContact } from "./delete-contact";
import { Button } from "@/components/ui/button";

export function ContactsDirectory() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const client = useQueryClient();
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const contacts = useQuery({
    queryKey: ["public-contacts", query, sort, page],
    queryFn: () =>
      getPublicContacts({
        search: query,
        page,
        page_size: 10,
        sort_by: sort === "newest" ? "created_at" : "name",
        sort_order: sort === "newest" ? "desc" : "asc",
      }),
  });
  const rows = contacts.data?.data ?? [];
  const meta = contacts.data?.meta;
  useEffect(() => {
    if (meta && page > Math.max(1, meta.pages)) setPage(Math.max(1, meta.pages));
  }, [meta, page]);
  function changed(message: string) {
    setNotice(message);
    void client.invalidateQueries({ queryKey: ["public-contacts"] });
    void client.invalidateQueries({ queryKey: ["public-contact"] });
  }
  return (
    <div className="min-h-[80vh] bg-[#f7f9fb] px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              <ContactRound className="size-4" />
              Your address book
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Good connections start here.
            </h1>
            <p className="mt-3 text-sm text-slate-500 sm:text-base">
              A little more organized. A lot more connected. All your people, in one place.
            </p>
          </div>
          <ContactForm
            onSaved={() => {
              setPage(1);
              changed("Contact created successfully.");
            }}
          />
        </div>
        {notice && (
          <div
            role="status"
            className="mb-5 flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800"
          >
            {notice}
            <button aria-label="Dismiss notification" onClick={() => setNotice("")} className="p-1">
              <X className="size-4" />
            </button>
          </div>
        )}
        <section
          aria-label="Contact directory"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-teal-50 p-2.5 text-teal-700">
                <Users className="size-5" />
              </div>
              <div>
                <h2 className="flex items-center gap-2 font-semibold">
                  {query ? "Search results" : "All contacts"}
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {meta?.total ?? "—"}
                  </span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">Keep the people who matter close.</p>
              </div>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <div className="relative min-w-0 basis-full sm:w-64 sm:basis-auto sm:flex-1">
                <Search className="absolute left-3 top-3 size-4 text-slate-400" />
                <input
                  aria-label="Search contacts"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, email or phone…"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </div>
              <select
                aria-label="Sort contacts"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600"
              >
                <option value="newest">Newest first</option>
                <option value="name">Name A–Z</option>
              </select>
              <Button
                variant="outline"
                size="icon"
                aria-label="Refresh contacts"
                className="h-10 w-10 border-slate-200"
                onClick={() => void contacts.refetch()}
              >
                <RotateCw className={contacts.isFetching ? "animate-spin" : ""} />
              </Button>
            </div>
          </div>
          {contacts.isPending ? (
            <div role="status" className="space-y-6 p-6">
              {[0, 1, 2, 3].map((key) => (
                <div key={key} className="h-12 animate-pulse rounded-xl bg-slate-100" />
              ))}
              <span className="sr-only">Loading contacts</span>
            </div>
          ) : contacts.isError ? (
            <div role="alert" className="p-12 text-center">
              <p className="mb-4 text-slate-600">We couldn’t load your contacts.</p>
              <Button variant="outline" onClick={() => void contacts.refetch()}>
                Try again
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-20 text-center">
              <div className="mb-5 rounded-2xl bg-teal-50 p-4 text-teal-700">
                <Users className="size-8" />
              </div>
              <h3 className="text-lg font-semibold">
                {query ? "No matching contacts" : "Your next connection starts here"}
              </h3>
              <p className="mb-6 mt-2 max-w-sm text-sm text-slate-500">
                {query
                  ? "Try a different name, email address or phone number."
                  : "Add your first contact and keep their details handy."}
              </p>
              {query ? (
                <Button variant="outline" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              ) : (
                <ContactForm onSaved={() => changed("Contact created successfully.")} />
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-left text-sm md:table-auto">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-medium uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3.5">Contact</th>
                    <th className="hidden px-6 py-3.5 md:table-cell">Email address</th>
                    <th className="hidden px-6 py-3.5 lg:table-cell">Phone number</th>
                    <th className="w-[92px] px-2 py-3.5 text-right sm:w-[160px] sm:px-6 md:w-auto">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((contact) => (
                    <tr key={contact.id} className="group transition-colors hover:bg-slate-50/70">
                      <td className="px-4 py-5 sm:px-6">
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                        >
                          <ContactAvatar contact={contact} />
                          <div className="min-w-0">
                            <p className="max-w-[145px] truncate font-semibold text-slate-800 group-hover:text-teal-700 sm:max-w-none">
                              {contact.name || "Unnamed contact"}
                            </p>
                            <p className="mt-1 max-w-[145px] truncate text-xs text-slate-500 md:hidden">
                              {contact.email || contact.phone || "No contact details"}
                            </p>
                            <p className="mt-1 hidden text-xs text-slate-400 md:block">
                              {contact.name
                                ? "Personal contact"
                                : "Add details to complete this contact"}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="hidden px-6 py-5 md:table-cell">
                        {contact.email ? (
                          <a
                            href={`mailto:${contact.email}`}
                            className="inline-flex items-center gap-2 text-slate-600 hover:text-teal-700"
                          >
                            <Mail className="size-3.5 text-slate-400" />
                            {contact.email}
                          </a>
                        ) : (
                          <span className="text-slate-400">Not provided</span>
                        )}
                      </td>
                      <td className="hidden px-6 py-5 lg:table-cell">
                        {contact.phone ? (
                          <a
                            href={`tel:${contact.phone}`}
                            className="inline-flex items-center gap-2 whitespace-nowrap text-slate-600 hover:text-teal-700"
                          >
                            <Phone className="size-3.5 text-slate-400" />
                            {contact.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400">Not provided</span>
                        )}
                      </td>
                      <td className="px-2 py-5 sm:px-6">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="hidden text-slate-500 hover:bg-teal-50 hover:text-teal-700 sm:inline-flex"
                          >
                            <Link
                              href={`/contacts/${contact.id}`}
                              aria-label={`View ${contact.name || "unnamed contact"}`}
                            >
                              <ArrowUpRight />
                            </Link>
                          </Button>
                          <ContactForm
                            contact={contact}
                            iconOnly
                            onSaved={() => changed("Contact updated successfully.")}
                          />
                          <DeleteContact
                            contact={contact}
                            iconOnly
                            onDeleted={() => changed("Contact deleted successfully.")}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 text-xs text-slate-500">
            <p>
              {meta?.total
                ? `Showing ${(page - 1) * 10 + 1}–${Math.min(page * 10, meta.total)} of ${meta.total} contacts`
                : "0 contacts"}
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous page"
                disabled={page <= 1 || contacts.isFetching}
                onClick={() => setPage((value) => value - 1)}
              >
                <ChevronLeft />
              </Button>
              <span>
                Page {page} of {Math.max(1, meta?.pages ?? 1)}
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next page"
                disabled={page >= (meta?.pages ?? 1) || contacts.isFetching}
                onClick={() => setPage((value) => value + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </section>
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ContactRound className="size-3.5" />
          Less searching. More connecting.
        </p>
      </div>
    </div>
  );
}
