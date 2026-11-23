// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

// Types for the wasm-bindgen output of `clincalc-wasm/` (see
// clincalc-wasm/src/lib.rs). Declared here so the desktop build type-checks
// without that package having been built; vite.config.ts aliases the real
// module in for web builds and a stub otherwise.
declare module "clincalc-wasm" {
  export default function init(): Promise<unknown>;
  export function version(): string;
  export function compiled_locales(): string;
  export function list_calculators(locale?: string | null): string;
  export function calculate(
    name: string,
    input_json: string,
    locale?: string | null,
  ): string;
  export function input_template(name: string, locale?: string | null): string;
}
