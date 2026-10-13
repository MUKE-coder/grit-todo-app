import { defineResource } from "@/lib/resource";
import { StackedCell } from "@/components/tables/stacked-cell";
import custom from "./contacts.custom";

export const contactResource = defineResource({
  name: "Contact",
  slug: "contacts",
  endpoint: "/api/contacts",
  icon: "Contact",
  label: { singular: "Contact", plural: "Contacts" },
  table: {
    columns: [
      // grit:cols:auto-start
      { key: "name", label: "Contact", sortable: true, searchable: true, cell: (row) => StackedCell({ top: String(row.name ?? ""), bottom: String(row.email ?? "") }) },
      { key: "phone", label: "Phone", sortable: true, searchable: true, format: "tel", onClick: "link" },
      { key: "profile", label: "Profile", format: "file" },
      { key: "created_at", label: "Created", sortable: true, format: "relative" },
      // grit:cols:auto-end
    ],
    filters: [
    ],
    defaultSort: { key: "created_at", direction: "desc" },
    searchable: true,
    pageSize: 20,
    // Shown once rows are ticked. Drop "archive" here and the Archived tab
    // goes with it; the model keeps its archived_at either way.
    bulkActions: ["edit", "archive", "restore", "export", "delete"],
  },
  form: {
    fields: [
      // grit:fields:auto-start
    { key: "name", label: "Name", type: "text", required: true },
    { key: "email", label: "Email", type: "email", unique: true },
    { key: "phone", label: "Phone", type: "tel", defaultCountry: "UG" },
    { key: "profile", label: "Profile", type: "file", accepts: ["image"], maxSizeMB: 5 },
      // grit:fields:auto-end
    ],
  },
  dashboard: {
    widgets: [
      {
        type: "stat",
        label: "Total Contacts",
        endpoint: "/api/contacts",
        icon: "Contact",
        color: "accent",
      },
    ],
  },
}, custom);
