"use client";

import { ResourcePage } from "@/components/resource/resource-page";
import { todoResource } from "@/resources/todos/todos";

export default function TodosPage() {
  return <ResourcePage resource={todoResource} />;
}
