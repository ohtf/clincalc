// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * The frontend's one doorway into the clincalc engine.
 *
 * Two transports, one contract: inside the Tauri desktop app every call is a
 * Tauri `invoke` into `src-tauri/src/lib.rs`; in a browser it is a call into
 * `clincalc-wasm` (the same engine compiled to WebAssembly). Both return the
 * same shapes, which mirror the Rust types exactly - if you change the Rust
 * side, change these in the same commit.
 */

import { invoke, isTauri } from "@tauri-apps/api/core";

import { getLocale } from "../locale";

export type Runtime = "desktop" | "web";

export const runtime: Runtime = isTauri() ? "desktop" : "web";

/** One catalogue entry (mirrors `CalcSummary` in lib.rs). */
export interface CalcSummary {
  name: string;
  title: string;
  description: string;
  /**
   * The locale this title/description actually render in: the requested
   * locale when the calculator has a complete bundle for it, otherwise
   * `"en"`.
   */
  content_locale: string;
  tags: string[];
  /** True for confirmed proprietary or licence-locked entries. */
  proprietary: boolean;
  /** True when invoking the entry returns an explanation instead of a score. */
  unavailable: boolean;
}

/** A computed result (mirrors `clincalc::CalculationResponse`). */
export interface CalculationResponse {
  calculator: string;
  /** Number for most scores; a short string for categorical results. */
  result: number | string;
  interpretation: string;
  /** Every intermediate value the score depended on, snake_case keys. */
  working: Record<string, unknown>;
  reference: string;
}

interface Engine {
  version(): Promise<string>;
  compiledLocales(): Promise<string[]>;
  listCalculators(locale: string): Promise<CalcSummary[]>;
  calculate(
    name: string,
    input: Record<string, unknown>,
    locale: string,
  ): Promise<CalculationResponse>;
  inputTemplate(name: string, locale: string): Promise<Record<string, unknown>>;
}

const tauriEngine: Engine = {
  version: () => invoke<string>("engine_version"),
  compiledLocales: () => invoke<string[]>("compiled_locales"),
  listCalculators: (locale) =>
    invoke<CalcSummary[]>("list_calculators", { locale }),
  calculate: (name, input, locale) =>
    invoke<CalculationResponse>("calculate", { name, input, locale }),
  inputTemplate: (name, locale) =>
    invoke<Record<string, unknown>>("input_template", { name, locale }),
};

let wasm: Promise<typeof import("clincalc-wasm")> | null = null;

function loadWasm() {
  wasm ??= import("clincalc-wasm").then(async (module) => {
    await module.default();
    return module;
  });
  return wasm;
}

const wasmEngine: Engine = {
  version: async () => (await loadWasm()).version(),
  compiledLocales: async () =>
    JSON.parse((await loadWasm()).compiled_locales()) as string[],
  listCalculators: async (locale) =>
    JSON.parse((await loadWasm()).list_calculators(locale)) as CalcSummary[],
  calculate: async (name, input, locale) =>
    JSON.parse(
      (await loadWasm()).calculate(name, JSON.stringify(input), locale),
    ) as CalculationResponse,
  inputTemplate: async (name, locale) =>
    JSON.parse((await loadWasm()).input_template(name, locale)) as Record<
      string,
      unknown
    >,
};

const engine = runtime === "desktop" ? tauriEngine : wasmEngine;

async function logged<T>(label: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[calc] ${label} failed:`, err);
    throw err;
  }
}

/**
 * The most recent calculation a calculator form ran, so the engine panel can
 * show exactly what the form sent and received without any per-calculator
 * wiring.
 */
export interface CalculationRecord {
  name: string;
  input: Record<string, unknown>;
  response: CalculationResponse | null;
  error: string | null;
}

let lastCalculation: CalculationRecord | null = null;
const listeners = new Set<() => void>();

export function subscribeLastCalculation(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLastCalculation(): CalculationRecord | null {
  return lastCalculation;
}

function record(next: CalculationRecord) {
  lastCalculation = next;
  listeners.forEach((listener) => listener());
}

export function engineVersion(): Promise<string> {
  return logged("engine_version", () => engine.version());
}

export function listCalculators(): Promise<CalcSummary[]> {
  return logged("list_calculators", () =>
    engine.listCalculators(getLocale()),
  );
}

/** Every locale bundle compiled into this build, for the locale picker. */
export function compiledLocales(): Promise<string[]> {
  return logged("compiled_locales", () => engine.compiledLocales());
}

export function inputTemplate(name: string): Promise<Record<string, unknown>> {
  return logged(`input_template(${name})`, () =>
    engine.inputTemplate(name, getLocale()),
  );
}

/**
 * Compute a result. Calls from calculator forms are recorded for the engine
 * panel; the panel's own runs pass `{ record: false }` so they never
 * masquerade as the form's state.
 */
export async function calculate(
  name: string,
  input: Record<string, unknown>,
  options: { record?: boolean } = {},
): Promise<CalculationResponse> {
  const shouldRecord = options.record ?? true;
  try {
    const response = await logged(`calculate(${name})`, () =>
      engine.calculate(name, input, getLocale()),
    );
    if (shouldRecord) record({ name, input, response, error: null });
    return response;
  } catch (err) {
    if (shouldRecord) record({ name, input, response: null, error: String(err) });
    throw err;
  }
}
