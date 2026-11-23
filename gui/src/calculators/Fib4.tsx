// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconMicroscope } from "@tabler/icons-react";

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
} from "../kit";

/** FIB-4 index for advanced liver fibrosis (Sterling 2006), with NICE NG49 thresholds. */

const AGE = { min: 18, max: 120 };

const BAND_COLOUR: Record<string, string> = { low: "teal", indeterminate: "yellow", high: "red" };

const positive = (v: number | null): v is number => v !== null && Number.isFinite(v) && v > 0;

function Fib4Calculator() {
  const [age, setAge] = useState<number | null>(null);
  const [ast, setAst] = useState<number | null>(null);
  const [alt, setAlt] = useState<number | null>(null);
  const [platelets, setPlatelets] = useState<number | null>(null);

  const complete =
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age) &&
    positive(ast) &&
    positive(alt) &&
    positive(platelets);
  const calc = useCalculation("fib4", complete ? { age, ast, alt, platelets } : null);

  return (
    <CalculatorPage
      icon={IconMicroscope}
      title="FIB-4"
      badge="Liver fibrosis"
      description="Non-invasive screen for advanced liver fibrosis from age, AST, ALT, and platelets (Sterling 2006), with the NICE NG49 cut-offs: low risk below 1.30 (2.0 at 65 or over), high risk above 2.67."
      onReset={() => {
        setAge(null);
        setAst(null);
        setAlt(null);
        setPlatelets(null);
      }}
      calc={calc}
      incomplete="Enter age, AST, ALT, and platelet count to calculate."
      form={
        <SimpleGrid cols={2} spacing="md">
          <NumberField
            label="Age"
            hint="The low-risk cut-off rises to 2.0 at 65 or over."
            unit="years"
            value={age}
            onChange={setAge}
            min={AGE.min}
            max={AGE.max}
            decimals={0}
          />
          <NumberField
            label="Platelets"
            hint="In ×10⁹/L, e.g. 250, not 250000."
            unit="×10⁹/L"
            value={platelets}
            onChange={setPlatelets}
            min={0}
            decimals={0}
          />
          <NumberField label="AST" unit="U/L" value={ast} onChange={setAst} min={0} decimals={0} />
          <NumberField label="ALT" unit="U/L" value={alt} onChange={setAlt} min={0} decimals={0} />
        </SimpleGrid>
      }
      result={(r) => {
        const risk = asText(r.working.risk);
        return (
          <ScoreTile
            value={fmt(r.result, 2)}
            colour={BAND_COLOUR[risk] ?? "teal"}
            badge={risk && `${risk} risk`}
          />
        );
      }}
      details={(r) => (
        <Facts
          title="Cut-offs applied"
          items={[
            ["Low risk below", fmt(r.working.low_risk_cutoff, 2)],
            ["High risk above", fmt(r.working.high_risk_cutoff, 2)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `FIB-4 ${fmt(r.result, 2)} (${asText(r.working.risk)} risk of advanced fibrosis)`,
          interpretation: r.interpretation,
          findingsTitle: "Inputs",
          findings: [
            `Age ${age} years`,
            `AST ${ast} U/L`,
            `ALT ${alt} U/L`,
            `Platelets ${platelets} ×10⁹/L`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "fib4", Component: Fib4Calculator };
