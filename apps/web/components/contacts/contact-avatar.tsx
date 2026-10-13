"use client";

import { useState } from "react";
import type { PublicContact } from "@/lib/contacts-public";

export function contactImageUrl(url?: string) {
  if (!url) return undefined;
  try {
    const resolved = new URL(url, process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080");
    return ["http:", "https:"].includes(resolved.protocol) ? resolved.href : undefined;
  } catch {
    return undefined;
  }
}

export function ContactAvatar({
  contact,
  large = false,
}: {
  contact: Pick<PublicContact, "name" | "profile">;
  large?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const url = contactImageUrl(contact.profile?.url);
  const initials =
    contact.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?";
  const colors = [
    "bg-teal-100 text-teal-800",
    "bg-violet-100 text-violet-800",
    "bg-amber-100 text-amber-800",
    "bg-sky-100 text-sky-800",
  ];
  const color =
    colors[
      Array.from(contact.name).reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length
    ];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden font-semibold ring-1 ring-black/5 ${large ? "size-24 rounded-3xl text-3xl" : "size-11 rounded-2xl text-sm"} ${color}`}
    >
      {url && url !== failedUrl ? (
        // User-uploaded URLs can come from any configured storage provider.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={contact.name || "Contact photo"}
          className="h-full w-full object-cover"
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <span aria-label={`${contact.name || "Unnamed contact"} initials`}>{initials}</span>
      )}
    </span>
  );
}
