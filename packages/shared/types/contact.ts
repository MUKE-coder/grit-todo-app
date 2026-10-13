import type { FileRef } from "../schemas/file-ref";

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  profile: FileRef | null;
  created_at: string;
  updated_at: string;
}
