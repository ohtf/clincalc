// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

/** Read a `working` value as display text; missing values render empty. */
export function asText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "yes" : "no";
  return String(v);
}

/** Read a `working` value as a number, or null. */
export function asNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Format a number for display, trimming float noise. */
export function fmt(v: unknown, decimals = 1): string {
  const n = asNumber(v);
  if (n === null) return asText(v);
  return Number.isInteger(n) ? String(n) : n.toFixed(decimals);
}

/**
 * The paste-ready text: a heading line, the engine's interpretation, then any
 * findings and extra lines. Empty entries are dropped so callers can write
 * `condition && "line"` inline.
 */
export function summaryText({
  heading,
  interpretation,
  findingsTitle = "Findings",
  findings = [],
  extra = [],
}: {
  heading: string;
  interpretation?: string;
  findingsTitle?: string;
  findings?: Array<string | false | null | undefined>;
  extra?: Array<string | false | null | undefined>;
}): string {
  const shownFindings = findings.filter(Boolean) as string[];
  const shownExtra = extra.filter(Boolean) as string[];
  return [
    heading,
    interpretation,
    shownFindings.length > 0 && `${findingsTitle}:\n${shownFindings.map((f) => `- ${f}`).join("\n")}`,
    shownExtra.length > 0 && shownExtra.join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Drop null/undefined entries so optional fields are omitted, not sent as null. */
export function compact<T extends Record<string, unknown>>(input: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== null && v !== undefined),
  );
}
