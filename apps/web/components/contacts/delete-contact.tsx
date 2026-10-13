"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deletePublicContact, type PublicContact } from "@/lib/contacts-public";

export function DeleteContact({
  contact,
  onDeleted,
  iconOnly = false,
}: {
  contact: PublicContact;
  onDeleted: () => void;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await deletePublicContact(contact.id);
      setOpen(false);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete contact.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) {
          setOpen(value);
          setError("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size={iconOnly ? "icon" : "default"}
          className="text-slate-500 hover:bg-red-50 hover:text-red-600"
          aria-label={`Delete ${contact.name || "unnamed contact"}`}
        >
          <Trash2 className="size-4" />
          {!iconOnly && "Delete contact"}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-[calc(100%-2rem)] rounded-2xl bg-white text-slate-900 sm:max-w-md"
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <Trash2 />
        </div>
        <DialogHeader>
          <DialogTitle>Delete contact?</DialogTitle>
          <DialogDescription className="text-slate-500">
            {contact.name || "This unnamed contact"} will be removed from your contacts. You won’t
            be able to undo this here.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Keep contact
          </Button>
          <Button
            className="bg-red-600 text-white hover:bg-red-700"
            disabled={busy}
            onClick={remove}
          >
            {busy && <Loader2 className="animate-spin" />}Delete contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
