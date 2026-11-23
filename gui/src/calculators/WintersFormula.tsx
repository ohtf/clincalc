// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconLungs } from "@tabler/icons-react";

import {
  CalculatorPage,
  BLOOD_GAS_UNITS,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asText,
  fmt,
  pressureInUnit,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type BloodGasUnit,
} from "../kit";

/** Winters' formula for expected PaCO2 in metabolic acidosis (Albert, Dell & Winters 1967). */

const BICARBONATE = { above: 0, max: 50 };
const PACO2 = { above: 0, max: 150 };

const VERDICT: Record<string, string> = {
  appropriate_compensation: "Appropriate compensation",
  concurrent_respiratory_acidosis: "Concurrent respiratory acidosis",
  concurrent_respiratory_alkalosis: "Concurrent respiratory alkalosis",
};

const verdictOf = (v: unknown) => VERDICT[asText(v)] ?? asText(v);

function WintersFormulaCalculator() {
  const [bicarbonate, setBicarbonate] = useState<number | null>(null);
  const [paco2, setPaco2] = useState<number | null>(null);
  const [unit, setUnit] = useState<BloodGasUnit | null>(null);
  const maxPaco2 = pressureInUnit(PACO2.max, unit);

  const complete =
    inRange(bicarbonate, BICARBONATE.above, BICARBONATE.max) &&
    bicarbonate > BICARBONATE.above &&
    unit !== null && inRange(paco2, PACO2.above, maxPaco2) &&
    paco2 > PACO2.above;
  const calc = useCalculation(
    "winters_formula",
    complete ? { bicarbonate_mmol_l: bicarbonate, [unit === "kPa" ? "measured_paco2_kpa" : "measured_paco2_mmhg"]: paco2 } : null,
  );

  return (
    <CalculatorPage
      icon={IconLungs}
      title="Winters' formula"
      badge="Metabolic acidosis"
      description="Expected PaCO2 for a primary metabolic acidosis (1.5 x bicarbonate + 8, plus or minus 2 mmHg), compared with the measured PaCO2 to detect a concurrent respiratory disorder (Albert, Dell and Winters 1967)."
      onReset={() => {
        setBicarbonate(null);
        setPaco2(null);
        setUnit(null);
      }}
      calc={calc}
      incomplete={
        bicarbonate === 0 || paco2 === 0
          ? "Bicarbonate and PaCO2 must be above zero."
          : "Enter bicarbonate and PaCO2 from the same arterial blood gas and select the PaCO2 unit."
      }
      form={
        <SimpleGrid cols={2} spacing="md">
          <NumberField
            label="Bicarbonate"
            hint="Above 0, up to 50 mmol/L."
            unit="mmol/L"
            value={bicarbonate}
            onChange={setBicarbonate}
            min={BICARBONATE.above}
            max={BICARBONATE.max}
          />
          <NumberField
            label="Measured PaCO2"
            hint="Arterial, from the same blood gas."
            unit={unit ?? undefined}
            value={paco2}
            onChange={setPaco2}
            min={PACO2.above}
            max={maxPaco2}
          />
          <ChoiceField label="PaCO2 unit" value={unit} onChange={(value) => { if (unit !== null) setPaco2(null); setUnit(value); }} options={BLOOD_GAS_UNITS} layout="inline" />
        </SimpleGrid>
      }
      result={(r) => (
        <ScoreTile
          value={fmt(r.result)}
          unit="mmHg expected"
          badge={verdictOf(r.working.verdict)}
        />
      )}
      details={(r) => (
        <Facts
          items={[
            [
              "Expected range",
              `${fmt(r.working.expected_range_low_mmhg)}-${fmt(r.working.expected_range_high_mmhg)} mmHg`,
            ],
            ["Measured", `${paco2} ${unit}`],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Winters' formula: expected PaCO2 ${fmt(r.working.expected_range_low_mmhg)}-${fmt(r.working.expected_range_high_mmhg)} mmHg; ${verdictOf(r.working.verdict).toLowerCase()}`,
          interpretation: r.interpretation,
          findingsTitle: "Arterial blood gas",
          findings: [`Bicarbonate ${bicarbonate} mmol/L`, `PaCO2 ${paco2} ${unit}`],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "winters_formula",
  Component: WintersFormulaCalculator,
};
