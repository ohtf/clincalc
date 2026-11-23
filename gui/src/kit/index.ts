// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { ComponentType } from "react";

export { CalculatorPage } from "./CalculatorPage";
export { ChoiceField, inRange, NumberField, YesNoField, type Choice } from "./fields";
export { asNumber, asText, compact, fmt, summaryText } from "./format";
export { Facts, ScoreTile } from "./result";
export { useCalculation, type Calculation } from "./useCalculation";
export { BLOOD_GAS_UNITS, CREATININE_UNITS, pressureInUnit, type BloodGasUnit, type CreatinineUnit } from "./units";

/**
 * What each file in `src/calculators/` exports as `calculator`, so it is
 * registered automatically (see `App.tsx`) - adding a form never means
 * editing a shared file.
 */
export interface CalculatorModule {
  /** The engine's calculator name, e.g. "feverpain". */
  name: string;
  Component: ComponentType;
}
