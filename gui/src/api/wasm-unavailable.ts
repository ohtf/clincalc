// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

// Stands in for `clincalc-wasm` in desktop builds (see vite.config.ts), which
// never take the WebAssembly path. Reaching this means the frontend was opened
// in a plain browser from a desktop build.

function unavailable(): never {
  throw new Error(
    "This build has no WebAssembly engine. Use s/web-dev for the browser version, or s/gui-dev for the desktop app.",
  );
}

export default async function init(): Promise<never> {
  return unavailable();
}

export const version = unavailable;
export const compiled_locales = unavailable;
export const list_calculators = unavailable;
export const calculate = unavailable;
export const input_template = unavailable;
