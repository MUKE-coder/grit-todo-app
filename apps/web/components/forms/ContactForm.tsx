"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { CreateContactSchema } from "@repo/shared/schemas";
import { publicCreate, type PublicContact } from "@/lib/contacts-public";
import { ContactAvatar } from "@/components/contacts/contact-avatar";

type ContactFormData = z.infer<typeof CreateContactSchema>;

export function ContactForm({
  contact,
  onSaved,
  iconOnly = false,
}: {
  contact?: PublicContact;
  onSaved?: () => void;
  iconOnly?: boolean;
}) {
  const id = useId();
  const defaults = {
    name: contact?.name ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    profile: contact?.profile ?? null,
  };
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setError,
  } = useForm<ContactFormData>({
    resolver: zodResolver(CreateContactSchema),
    defaultValues: defaults,
  });

  const handleFormSubmit = async (data: ContactFormData) => {
    setSubmitError(null);
    data.name = data.name.trim();
    if (!data.name) {
      setError("name", { message: "Name is required" });
      return;
    }
    const res = contact
      ? await publicCreate<PublicContact, ContactFormData>(
          `/api/v1/public/contacts/${contact.id}`,
          data,
          "PUT",
          contact.version
        )
      : await publicCreate<PublicContact, ContactFormData>("/api/v1/public/contacts", data);
    if (!res.body) {
      setSubmitError(res.message ?? "Failed to create contact. Please try again.");
      return;
    }
    reset();
    setOpen(false);
    onSaved?.();
  };

  const handleCancel = () => {
    setSubmitError(null);
    reset();
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!isSubmitting) {
          setOpen(value);
          if (value) {
            reset(defaults);
            setSubmitError(null);
          }
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant={contact ? "ghost" : "default"}
          size={iconOnly ? "icon" : "default"}
          className={
            contact
              ? "text-slate-500 hover:bg-teal-50 hover:text-teal-700"
              : "h-11 rounded-xl bg-teal-700 px-5 text-white shadow-sm hover:bg-teal-800"
          }
          aria-label={contact ? `Edit ${contact.name || "unnamed contact"}` : undefined}
        >
          {contact ? <Pencil className="size-4" /> : <Plus className="size-4" />}
          {!iconOnly && (contact ? "Edit contact" : "Add Contact")}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90vh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-white text-slate-900 sm:max-w-[460px]"
        onEscapeKeyDown={(event) => {
          if (isSubmitting) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (isSubmitting) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{contact ? "Edit contact" : "Add New Contact"}</DialogTitle>
          <DialogDescription className="text-slate-500">
            {contact ? "Keep their details up to date." : "Make room for a new connection."} Name is
            required; other details are optional.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="grid gap-5 py-5">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <ContactAvatar
                contact={{
                  name: watch("name") || "New contact",
                  profile: contact?.profile ?? null,
                }}
              />
              <div>
                <p className="text-sm font-medium">{watch("name") || "Your new contact"}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {contact?.profile
                    ? "Profile photo"
                    : "A personal touch, with automatic initials."}
                </p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-name`}>Contact Name</Label>
              <Input
                id={`${id}-name`}
                placeholder="e.g. Jane Doe"
                autoComplete="name"
                aria-invalid={!!errors.name}
                {...register("name")}
                className={`h-11 rounded-lg border-slate-200 ${errors.name ? "border-red-500" : ""}`}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-email`}>Contact Email</Label>
              <Input
                id={`${id}-email`}
                type="email"
                autoComplete="email"
                aria-invalid={!!errors.email}
                placeholder="johndoe@gmail.com"
                {...register("email")}
                className={`h-11 rounded-lg border-slate-200 ${errors.email ? "border-red-500" : ""}`}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-phone`}>Phone</Label>
              <Input
                id={`${id}-phone`}
                type="tel"
                autoComplete="tel"
                aria-invalid={!!errors.phone}
                placeholder="e.g.+256784143872"
                {...register("phone")}
                className={`h-11 rounded-lg border-slate-200 ${errors.phone ? "border-red-500" : ""}`}
              />
              {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
            </div>
          </div>
          {submitError && (
            <p role="alert" className="mb-4 text-sm text-red-500">
              {submitError}
            </p>
          )}
          <DialogFooter className="gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-teal-700 text-white hover:bg-teal-800"
            >
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isSubmitting ? "Saving..." : contact ? "Save changes" : "Save Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
