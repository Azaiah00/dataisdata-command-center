/**
 * Display-only wording for stored values.
 *
 * "Cyber" is no longer a portal term (Nov 2026). Records saved before that may still hold
 * "Cyber", "Cyber Assessment", "Cybersecurity" or "Cyber Resilience" in a category, theme,
 * challenge, interest, focus or service field. Those values are shown as "Security" instead.
 * The stored value is never rewritten: this only changes what is displayed.
 *
 * Use it where a field value is shown, never on form inputs (an input must show the real
 * stored text, or saving would change the record).
 */
export function securityTerm(value: string): string;
export function securityTerm(value: string | null | undefined): string | null | undefined;
export function securityTerm(value: string | null | undefined) {
  if (!value) return value;
  return value
    .replace(/\bcyber[\s-]?resilien(?:ce|cy)\b/gi, "Security")
    .replace(/\bcyber[\s-]?security\b/gi, "Security")
    .replace(/\bcyber\b/gi, "Security");
}

/** Same, for a list of values (chips, challenges, interests). */
export function securityTerms(values: (string | null | undefined)[] | null | undefined): string[] {
  return ((values || []).filter(Boolean) as string[]).map((v) => securityTerm(v));
}
