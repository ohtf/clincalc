// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconTestPipe } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asText,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** KDIGO CKD risk category, the eGFR by ACR heatmap (KDIGO 2024). */

const HEATMAP_COLOUR: Record<string, string> = {
  "Low risk (green)": "green",
  "Moderately increased risk (yellow)": "yellow",
  "High risk (orange)": "orange",
  "Very high risk (red)": "red",
};

const positive = (v: number | null): v is number => inRange(v, 0) && v > 0;

function CkdRiskCalculator() {
  const [egfr, setEgfr] = useState<number | null>(null);
  const [acr, setAcr] = useState<number | null>(null);

  const complete = positive(egfr) && inRange(acr, 0);
  const calc = useCalculation("ckd_risk", complete ? { egfr, acr } : null);

  return (
    <CalculatorPage
      icon={IconTestPipe}
      title="KDIGO CKD risk category"
      badge="CKD prognosis"
      description="Combines the eGFR G-stage and the albuminuria A-stage into the KDIGO risk category (the green, yellow, orange, and red heatmap) for CKD progression, kidney failure, acute kidney injury, cardiovascular events, and death (KDIGO 2024)."
      onReset={() => {
        setEgfr(null);
        setAcr(null);
      }}
      calc={calc}
      incomplete="Enter eGFR and ACR to classify."
      form={
        <SimpleGrid cols={2} spacing="md">
          <NumberField
            label="eGFR"
            hint="Sets the G-stage. Must be above 0."
            unit="mL/min/1.73m²"
            value={egfr}
            onChange={setEgfr}
            min={0}
            decimals={1}
          />
          <NumberField
            label="Urine ACR"
            hint="Sets the A-stage. In mg/mmol, as UK laboratories report it."
            unit="mg/mmol"
            value={acr}
            onChange={setAcr}
            min={0}
            decimals={1}
          />
        </SimpleGrid>
      }
      result={(r) => {
        const risk = asText(r.working.risk_category);
        return (
          <ScoreTile
            value={`${asText(r.working.g_stage)} ${asText(r.working.a_stage)}`}
            colour={HEATMAP_COLOUR[risk] ?? "teal"}
            badge={risk}
          />
        );
      }}
      details={(r) => (
        <Facts
          items={[
            ["G-stage", asText(r.working.g_stage)],
            ["A-stage", asText(r.working.a_stage)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `KDIGO CKD ${asText(r.working.g_stage)}${asText(r.working.a_stage)}: ${asText(r.working.risk_category)}`,
          interpretation: r.interpretation,
          findingsTitle: "Results",
          findings: [`eGFR ${egfr} mL/min/1.73m²`, `Urine ACR ${acr} mg/mmol`],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "ckd_risk", Component: CkdRiskCalculator };
