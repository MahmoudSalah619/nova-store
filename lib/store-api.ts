// Plain fetchers for the Route store API. No Next.js imports, so this also runs in
// standalone Node scripts (scripts/sync-graph.ts). lib/api.ts adds Next caching on top.

import { API_BASE, type ListResponse } from "./types";

export async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
  return res.json();
}

/** Every item of a paginated list. The API caps a page at 50, so walk all pages. */
export async function getAllPages<T>(path: string): Promise<T[]> {
  const sep = path.includes("?") ? "&" : "?";
  const first = await getJSON<ListResponse<T>>(`${path}${sep}limit=50&page=1`);
  const rest = await Promise.all(
    Array.from({ length: first.metadata.numberOfPages - 1 }, (_, i) =>
      getJSON<ListResponse<T>>(`${path}${sep}limit=50&page=${i + 2}`),
    ),
  );
  return [first, ...rest].flatMap((r) => r.data);
}
