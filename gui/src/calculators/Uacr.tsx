// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconTestPipe2 } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  inRange,
  NumberField,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Urine albumin-to-creatinine ratio with the KDIGO A-stage (KDIGO 2024). */

type Mode = "ratio" | "raw";
type Unit = "mg/mmol" | "mg/g";

const MODES: Choice<Mode>[] = [
  { value: "ratio", label: "Laboratory-reported ratio" },
  { value: "raw", label: "Urine albumin and creatinine" },
];

const UNITS: Choice<Unit>[] = [
  { value: "mg/mmol", label: "mg/mmol", hint: "UK laboratories." },
  { value: "mg/g", label: "mg/g", hint: "US laboratories; 1 mg/mmol = 8.84 mg/g." },
];

const A_STAGE: Record<string, string> = {
  A1: "normal to mildly increased",
  A2: "moderately increased",
  A3: "severely increased",
};

const positive = (v: number | null): v is number => inRange(v, 0) && v > 0;

function UacrCalculator() {
  const [mode, setMode] = useState<Mode>("ratio");
  const [acr, setAcr] = useState<number | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [albumin, setAlbumin] = useState<number | null>(null);
  const [creatinine, setCreatinine] = useState<number | null>(null);

  const input =
    mode === "ratio"
      ? inRange(acr, 0) && unit !== null
        ? { acr, acr_unit: unit }
        : null
      : inRange(albumin, 0) && positive(creatinine)
        ? { albumin, creatinine }
        : null;
  const calc = useCalculation("uacr", input);

  const stage = (r: { working: Record<string, unknown> }) => asText(r.working.kdigo_a_stage);

  return (
    <CalculatorPage
      icon={IconTestPipe2}
      title="Urine ACR"
      badge="Albuminuria"
      description="Urine albumin-to-creatinine ratio in mg/mmol with the KDIGO albuminuria category A1-A3 (KDIGO 2024), from a laboratory-reported ratio or from urine albumin and creatinine."
      onReset={() => {
        setMode("ratio");
        setAcr(null);
        setUnit(null);
        setAlbumin(null);
        setCreatinine(null);
      }}
      calc={calc}
      incomplete={
        mode === "ratio"
          ? "Enter the ratio and its unit to calculate."
          : "Enter urine albumin and creatinine to calculate."
      }
      form={
        <>
          <ChoiceField label="What do you have?" value={mode} onChange={setMode} options={MODES} />
          {mode === "ratio" ? (
            <SimpleGrid cols={2} spacing="md">
              <NumberField
                label="ACR"
                unit={unit ?? undefined}
                value={acr}
                onChange={setAcr}
                min={0}
                decimals={1}
              />
              <ChoiceField
                label="ACR unit"
                hint="A wrong unit shifts the A-stage."
                value={unit}
                onChange={setUnit}
                options={UNITS}
              />
            </SimpleGrid>
          ) : (
            <SimpleGrid cols={2} spacing="md">
              <NumberField
                label="Urine albumin"
                unit="mg/L"
                value={albumin}
                onChange={setAlbumin}
                min={0}
                decimals={1}
              />
              <NumberField
                label="Urine creatinine"
                hint="Must be above 0."
                unit="mmol/L"
                value={creatinine}
                onChange={setCreatinine}
                min={0}
                decimals={2}
              />
            </SimpleGrid>
          )}
        </>
      }
      result={(r) => (
        <ScoreTile
          value={fmt(r.result)}
          unit="mg/mmol"
          badge={stage(r) && `${stage(r)}: ${A_STAGE[stage(r)] ?? ""}`}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Urine ACR ${fmt(r.result)} mg/mmol (KDIGO ${stage(r)}${A_STAGE[stage(r)] ? `, ${A_STAGE[stage(r)]} albuminuria` : ""})`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings:
            mode === "ratio"
              ? [`Laboratory ACR ${acr} ${unit}`]
              : [`Urine albumin ${albumin} mg/L`, `Urine creatinine ${creatinine} mmol/L`],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "uacr", Component: UacrCalculator };
