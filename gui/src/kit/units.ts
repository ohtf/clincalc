// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Choice } from "./fields";

export type CreatinineUnit = "umol_l" | "mmol_l" | "mg_dl";
export const CREATININE_UNITS: Choice<CreatinineUnit>[] = [
  { value: "umol_l", label: "µmol/L" },
  { value: "mmol_l", label: "mmol/L" },
  { value: "mg_dl", label: "mg/dL" },
];

export type BloodGasUnit = "mmHg" | "kPa";
export const BLOOD_GAS_UNITS: Choice<BloodGasUnit>[] = [
  { value: "mmHg", label: "mmHg" },
  { value: "kPa", label: "kPa" },
];
// NIST SP 811; mirrors the engine conversion for input bounds only.
export const pressureInUnit = (mmHg: number, unit: BloodGasUnit | null) =>
  unit === "kPa" ? mmHg / (1000 / 133.322387415) : mmHg;
