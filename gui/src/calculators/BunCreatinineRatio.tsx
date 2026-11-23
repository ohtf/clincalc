// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconDivide } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
  ChoiceField,
} from "../kit";

/** BUN:creatinine ratio, a teaching heuristic for prerenal azotaemia (Brenner and Rector's The Kidney). */

type UreaUnit = "mmol/L" | "mg/dL";
type CreatinineUnit = "umol/L" | "mg/dL";

const UREA_UNITS: Choice<UreaUnit>[] = [
  { value: "mmol/L", label: "Urea, mmol/L" },
  { value: "mg/dL", label: "BUN, mg/dL" },
];
const CREATININE_UNITS: Choice<CreatinineUnit>[] = [
  { value: "umol/L", label: "µmol/L" },
  { value: "mg/dL", label: "mg/dL" },
];

const UREA: Record<UreaUnit, { min: number; max: number }> = {
  "mmol/L": { min: 0.5, max: 60 },
  "mg/dL": { min: 1.4, max: 168 },
};
const CREATININE: Record<CreatinineUnit, { min: number; max: number }> = {
  "umol/L": { min: 10, max: 2000 },
  "mg/dL": { min: 0.11, max: 22.6 },
};

const CREATININE_LABEL: Record<CreatinineUnit, string> = { "umol/L": "µmol/L", "mg/dL": "mg/dL" };

function BunCreatinineRatioCalculator() {
  const [ureaUnit, setUreaUnit] = useState<UreaUnit | null>(null);
  const [urea, setUrea] = useState<number | null>(null);
  const [creatinineUnit, setCreatinineUnit] = useState<CreatinineUnit | null>(null);
  const [creatinine, setCreatinine] = useState<number | null>(null);

  const complete =
    ureaUnit !== null &&
    creatinineUnit !== null &&
    inRange(urea, UREA[ureaUnit].min, UREA[ureaUnit].max) &&
    inRange(creatinine, CREATININE[creatinineUnit].min, CREATININE[creatinineUnit].max);
  const calc = useCalculation(
    "bun_creatinine_ratio",
    complete ? { urea, urea_unit: ureaUnit, creatinine, creatinine_unit: creatinineUnit } : null,
  );

  const ureaName = ureaUnit === "mg/dL" ? "BUN" : "Urea";

  return (
    <CalculatorPage
      icon={IconDivide}
      title="BUN:creatinine ratio"
      badge="Acute kidney injury"
      description="Blood urea nitrogen to creatinine ratio, both in mg/dL, for prerenal-versus-intrinsic azotaemia. A teaching heuristic, not a validated diagnostic rule. UK urea in mmol/L is converted to BUN by the engine."
      onReset={() => {
        setUreaUnit(null);
        setUrea(null);
        setCreatinineUnit(null);
        setCreatinine(null);
      }}
      calc={calc}
      incomplete="Choose each unit, then enter urea (or BUN) and creatinine."
      form={
        <SimpleGrid cols={2} spacing="md" verticalSpacing="lg">
          <ChoiceField layout="inline"
            label="Urea unit"
            hint="mmol/L reports urea (UK); mg/dL reports blood urea nitrogen (US)."
            value={ureaUnit}
            onChange={setUreaUnit}
            options={UREA_UNITS}
          />
          <NumberField
            label={ureaUnit === null ? "Urea or BUN" : ureaName}
            hint={ureaUnit === null ? "Choose the unit first." : undefined}
            unit={ureaUnit ?? undefined}
            value={urea}
            onChange={setUrea}
            min={ureaUnit ? UREA[ureaUnit].min : undefined}
            max={ureaUnit ? UREA[ureaUnit].max : undefined}
          />
          <ChoiceField layout="inline"
            label="Creatinine unit"
            value={creatinineUnit}
            onChange={setCreatinineUnit}
            options={CREATININE_UNITS}
          />
          <NumberField
            label="Creatinine"
            hint={creatinineUnit === null ? "Choose the unit first." : undefined}
            unit={creatinineUnit ? CREATININE_LABEL[creatinineUnit] : undefined}
            value={creatinine}
            onChange={setCreatinine}
            min={creatinineUnit ? CREATININE[creatinineUnit].min : undefined}
            max={creatinineUnit ? CREATININE[creatinineUnit].max : undefined}
          />
        </SimpleGrid>
      }
      result={(r) => <ScoreTile value={`${fmt(r.result)}:1`} badge={asText(r.working.pattern)} />}
      details={(r) => (
        <Facts
          title="Converted to mg/dL"
          items={[
            ["BUN", `${fmt(r.working.bun_mg_dl)} mg/dL`],
            ["Creatinine", `${fmt(r.working.creatinine_mg_dl, 2)} mg/dL`],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `BUN:creatinine ratio ${fmt(r.result)}:1 (${asText(r.working.pattern)})`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [
            `${ureaName} ${urea} ${ureaUnit}`,
            `Creatinine ${creatinine} ${creatinineUnit ? CREATININE_LABEL[creatinineUnit] : ""}`,
            ureaUnit === "mmol/L" && `BUN ${fmt(r.working.bun_mg_dl)} mg/dL (converted)`,
            creatinineUnit === "umol/L" &&
              `Creatinine ${fmt(r.working.creatinine_mg_dl, 2)} mg/dL (converted)`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "bun_creatinine_ratio",
  Component: BunCreatinineRatioCalculator,
};
