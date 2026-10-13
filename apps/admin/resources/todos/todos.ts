import { defineResource } from "@/lib/resource";
import custom from "./todos.custom";

export const todoResource = defineResource({
  name: "Todo",
  slug: "todos",
  endpoint: "/api/todos",
  icon: "Database",
  label: { singular: "Todo", plural: "Todos" },
  table: {
    columns: [
      // grit:cols:auto-start
      { key: "title", label: "Title", sortable: true, searchable: true, onClick: "link" },
      { key: "completed", label: "Completed", format: "boolean" },
      { key: "created_at", label: "Created", sortable: true, format: "relative" },
      // grit:cols:auto-end
    ],
    filters: [
    { key: "completed", label: "Completed", type: "boolean" },
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
    { key: "title", label: "Title", type: "text", required: true },
    { key: "completed", label: "Completed", type: "toggle" },
      // grit:fields:auto-end
    ],
  },
  dashboard: {
    widgets: [
      {
        type: "stat",
        label: "Total Todos",
        endpoint: "/api/todos",
        icon: "Database",
        color: "accent",
      },
    ],
  },
  // One card per value, counted over the rows the table is showing. Generated
  // from the model: completed. Delete a line to drop its cards, or set
  // stats: { countBy: [] } to keep only the four defaults.
  stats: {
    countBy: [
      {
        field: "completed",
        labels: { "true": "Completed", "1": "Completed", "false": "Not Completed", "0": "Not Completed" },
        only: ["true", "false"],
        icon: "ToggleLeft",
      },
    ],
  },
  // The collapsible charts above the table: created over time, and these
  // columns by value. Nothing is requested until somebody opens the panel.
  insights: {
    breakdown: ["completed"],
    labels: {
      completed: { "true": "Completed", "1": "Completed", "false": "Not Completed", "0": "Not Completed" },
    },
  },
}, custom);
