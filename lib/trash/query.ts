import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";

/** True when the trash migration has not been applied yet. */
export function isMissingDeletedAtColumn(error: { message?: string } | null) {
  return !!error && /deleted_at/i.test(error.message || "");
}

/**
 * Hide soft-deleted rows in list/search queries.
 * Falls back if deleted_at column does not exist yet.
 */
export async function withActiveRowsOnly<T extends Record<string, unknown>>(
  run: (applyDeletedFilter: boolean) => PromiseLike<{ data: T[] | null; error: { message?: string } | null }>
): Promise<{ data: T[] | null; error: { message?: string } | null }> {
  let res = await run(true);
  if (res.error && isMissingDeletedAtColumn(res.error)) {
    res = await run(false);
  }
  return res;
}

/** Attach .is('deleted_at', null) when the migration is present. */
export function filterActive<T>(q: PostgrestFilterBuilder<any, any, any>, apply: boolean) {
  return apply ? q.is("deleted_at", null) : q;
}
