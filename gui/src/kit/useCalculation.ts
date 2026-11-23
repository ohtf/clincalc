// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useState } from "react";

import { calculate, type CalculationResponse } from "../api/calc";

export interface Calculation {
  /** The input last sent, or null while the form is incomplete. */
  input: Record<string, unknown> | null;
  response: CalculationResponse | null;
  error: string | null;
  pending: boolean;
}

/**
 * Recompute on every change. `input` is null until the form is complete; the
 * engine is never called with a partial or out-of-range input, and a result
 * never outlives the input that produced it.
 */
export function useCalculation(
  name: string,
  input: Record<string, unknown> | null,
): Calculation {
  const key = input === null ? null : JSON.stringify(input);
  const [state, setState] = useState<Omit<Calculation, "input">>({
    response: null,
    error: null,
    pending: false,
  });

  useEffect(() => {
    if (key === null) {
      setState({ response: null, error: null, pending: false });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, pending: true }));
    calculate(name, JSON.parse(key) as Record<string, unknown>)
      .then((response) => {
        if (!cancelled) setState({ response, error: null, pending: false });
      })
      .catch((e: unknown) => {
        if (!cancelled) setState({ response: null, error: String(e), pending: false });
      });
    return () => {
      cancelled = true;
    };
  }, [name, key]);

  return { input, ...state };
}
