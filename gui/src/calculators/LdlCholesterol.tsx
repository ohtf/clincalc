// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconFlask } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asNumber,
  asText,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Non-HDL-C and LDL-C by Friedewald (1972), Martin-Hopkins (Martin 2013; Sajja 2021), and Sampson-NIH (2020). */

type Unit = "mmol/L" | "mg/dL";

const UNITS: Choice<Unit>[] = [
  { value: "mmol/L", label: "mmol/L" },
  { value: "mg/dL", label: "mg/dL" },
];

const MIN = 0;

const METHODS = [
  { key: "ldl_friedewald", label: "Friedewald" },
  { key: "ldl_martin_hopkins", label: "Martin-Hopkins" },
  { key: "ldl_sampson_nih", label: "Sampson-NIH" },
] as const;

function LdlCholesterolCalculator() {
  const [unit, setUnit] = useState<Unit | null>(null);
  const [tc, setTc] = useState<number | null>(null);
  const [hdl, setHdl] = useState<number | null>(null);
  const [tg, setTg] = useState<number | null>(null);

  const decimals = unit === "mg/dL" ? 0 : 2;
  const valuesOk =
    inRange(tc, MIN) && tc > MIN && inRange(hdl, MIN) && inRange(tg, MIN) && unit !== null;
  const hdlTooHigh = valuesOk && hdl > tc;
  const complete = valuesOk && !hdlTooHigh;
  const calc = useCalculation(
    "ldl_cholesterol",
    complete ? { total_cholesterol: tc, hdl_cholesterol: hdl, triglycerides: tg, unit } : null,
  );

  const show = (v: unknown) => {
    const n = asNumber(v);
    return n === null ? "not reported" : `${n.toFixed(decimals)} ${unit ?? ""}`.trim();
  };
  const results = (r: { result: unknown }) =>
    (typeof r.result === "object" && r.result !== null ? r.result : {}) as Record<string, unknown>;

  return (
    <CalculatorPage
      icon={IconFlask}
      title="LDL and non-HDL cholesterol"
      badge="Lipids"
      description="Non-HDL cholesterol from a standard lipid panel, with LDL-C estimated by the Friedewald, Martin-Hopkins, and Sampson-NIH equations, each reported only within its triglyceride range. Unreliable in type III dysbetalipoproteinaemia."
      onReset={() => {
        setUnit(null);
        setTc(null);
        setHdl(null);
        setTg(null);
      }}
      calc={calc}
      incomplete={
        hdlTooHigh
          ? "HDL cholesterol cannot exceed total cholesterol. Check the values come from the same panel and unit."
          : "Choose the unit, then enter total cholesterol, HDL cholesterol, and triglycerides to calculate."
      }
      form={
        <>
          <ChoiceField
            label="Unit"
            hint="One unit for all three results, from the same lipid panel. Do not mix units."
            value={unit}
            onChange={setUnit}
            options={UNITS}
          />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Total cholesterol"
              unit={unit ?? undefined}
              value={tc}
              onChange={setTc}
              min={MIN}
              decimals={decimals}
            />
            <NumberField
              label="HDL cholesterol"
              hint="Must not exceed total cholesterol."
              unit={unit ?? undefined}
              value={hdl}
              onChange={setHdl}
              min={MIN}
              decimals={decimals}
            />
            <NumberField
              label="Triglycerides"
              hint="Determines which LDL-C equations are within range."
              unit={unit ?? undefined}
              value={tg}
              onChange={setTg}
              min={MIN}
              decimals={decimals}
            />
          </SimpleGrid>
        </>
      }
      result={(r) => {
        const res = results(r);
        const nonHdl = asNumber(res.non_hdl_cholesterol);
        return (
          <ScoreTile
            value={nonHdl === null ? "" : nonHdl.toFixed(decimals)}
            unit={asText(res.unit)}
            badge="Non-HDL-C"
          />
        );
      }}
      details={(r) => {
        const res = results(r);
        return (
          <Facts
            title="LDL-C estimates"
            items={METHODS.map((m) => [m.label, show(res[m.key])])}
          />
        );
      }}
      summary={(r) => {
        const res = results(r);
        return summaryText({
          heading: `Non-HDL cholesterol ${show(res.non_hdl_cholesterol)}`,
          interpretation: r.interpretation,
          findingsTitle: "LDL-C estimates",
          findings: METHODS.map((m) => `${m.label}: ${show(res[m.key])}`),
          extra: [
            `Lipid panel: total cholesterol ${tc} ${unit}, HDL cholesterol ${hdl} ${unit}, triglycerides ${tg} ${unit}`,
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "ldl_cholesterol", Component: LdlCholesterolCalculator };
