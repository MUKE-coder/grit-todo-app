import { z } from "zod";
import { FileRefSchema } from "./file-ref";
import { EmailSchema } from "./field-formats";
import { PhoneSchema } from "./phone";

export const CreateContactSchema = z.object({
  name: z.string().min(1, "Required"),
  // empty string is treated as absent so it is never stored in the DB's unique
  // email column (two blank-email rows would otherwise conflict on the index)
  email: z
    .string()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(EmailSchema.optional())
    .optional(),
  phone: z
    .string()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(PhoneSchema.optional())
    .optional(),
  profile: FileRefSchema.nullable().optional().default(null),
});

export const UpdateContactSchema = z.object({
  name: z.string().min(1, "Required").optional(),
  email: z
    .string()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(EmailSchema.optional())
    .optional(),
  phone: z
    .string()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(PhoneSchema.optional())
    .optional(),
  profile: FileRefSchema.nullable(),
});

export type CreateContactInput = z.infer<typeof CreateContactSchema>;
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;
