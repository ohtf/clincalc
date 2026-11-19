// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * The GUI's currently selected locale, as a BCP 47 tag.
 *
 * This is a plain module-level value, not React state, because
 * `api/calc.ts` reads it from ordinary async functions, not hooks - every
 * `calculate`/`listCalculators` call picks up whatever locale is current at
 * call time. Components that need to re-render on a locale change (the
 * selector itself, the HTML `lang`/`dir` effect in `App.tsx`) subscribe via
 * `useLocale`.
 *
 * This is the GUI's one resolved default at a surface boundary, the same
 * role `CLINCALC_LOCALE` plays for the CLI or the configured default plays
 * for the REST server - not a mutable engine-side global (`spec/multilingual.md`
 * still holds: the Rust engine itself takes locale as an explicit argument
 * on every call).
 */

import { useEffect, useState } from "react";

const LISTENERS = new Set<(locale: string) => void>();
let currentLocale = "en";

export function getLocale(): string {
  return currentLocale;
}

export function setLocale(locale: string): void {
  if (locale === currentLocale) return;
  currentLocale = locale;
  for (const listener of LISTENERS) listener(locale);
}

/** Subscribe a component to the current locale; re-renders on change. */
export function useLocale(): string {
  const [locale, setLocalState] = useState(currentLocale);
  useEffect(() => {
    LISTENERS.add(setLocalState);
    return () => {
      LISTENERS.delete(setLocalState);
    };
  }, []);
  return locale;
}

/**
 * Right-to-left locales. Empty today - `en`, `es`, and `ca` are all
 * left-to-right - but named so the day a compiled RTL bundle (e.g. `ar`)
 * ships, this is the one place that needs it, per `spec/multilingual.md`'s
 * "sets text direction when right-to-left locales are introduced."
 */
const RTL_LOCALES = new Set<string>();

export function textDirectionFor(locale: string): "ltr" | "rtl" {
  return RTL_LOCALES.has(locale) ? "rtl" : "ltr";
}

/** Human-readable label for a compiled locale's own picker entry. */
const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  es: "Español",
  ca: "Català",
};

export function localeLabel(locale: string): string {
  return LOCALE_LABELS[locale] ?? locale;
}
