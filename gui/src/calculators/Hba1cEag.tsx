// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconDroplet } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
  ChoiceField,
} from "../kit";

/** HbA1c to estimated average glucose (Nathan, ADAG, Diabetes Care 2008) and IFCC/NGSP conversion (Hoelzel 2004). */

type Unit = "mmol/mol" | "%";

const UNITS: Choice<Unit>[] = [
  { value: "mmol/mol", label: "mmol/mol (IFCC)" },
  { value: "%", label: "% (NGSP/DCCT)" },
];

const HBA1C: Record<Unit, { min: number; max: number }> = {
  "mmol/mol": { min: 15, max: 195 },
  "%": { min: 3.5, max: 20 },
};

function Hba1cEagCalculator() {
  const [unit, setUnit] = useState<Unit | null>(null);
  const [hba1c, setHba1c] = useState<number | null>(null);

  const complete = unit !== null && inRange(hba1c, HBA1C[unit].min, HBA1C[unit].max);
  const calc = useCalculation("hba1c_eag", complete ? { hba1c, hba1c_unit: unit } : null);

  return (
    <CalculatorPage
      icon={IconDroplet}
      title="HbA1c and estimated average glucose"
      badge="Diabetes"
      description="Estimated average glucose over the preceding 2-3 months from HbA1c (ADAG study, Nathan 2008), with conversion between IFCC mmol/mol and NGSP %. A population-derived average that does not capture glycaemic variability."
      onReset={() => {
        setUnit(null);
        setHba1c(null);
      }}
      calc={calc}
      incomplete="Choose the HbA1c unit, then enter the value."
      form={
        <SimpleGrid cols={2} spacing="md">
          <ChoiceField layout="inline"
            label="HbA1c unit"
            hint="mmol/mol is the UK and international unit; % is the US unit."
            value={unit}
            onChange={setUnit}
            options={UNITS}
          />
          <NumberField
            label="HbA1c"
            hint={unit === null ? "Choose the unit first." : undefined}
            unit={unit ?? undefined}
            value={hba1c}
            onChange={setHba1c}
            min={unit ? HBA1C[unit].min : undefined}
            max={unit ? HBA1C[unit].max : undefined}
          />
        </SimpleGrid>
      }
      result={(r) => (
        <ScoreTile value={fmt(r.result)} unit="mmol/L" badge="Estimated average glucose" />
      )}
      details={(r) => (
        <Facts
          items={[
            ["eAG", `${fmt(r.working.eag_mg_dl)} mg/dL`],
            ["IFCC", `${fmt(r.working.hba1c_mmol_mol, 0)} mmol/mol`],
            ["NGSP", `${fmt(r.working.hba1c_percent)}%`],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Estimated average glucose ${fmt(r.result)} mmol/L (${fmt(r.working.eag_mg_dl, 0)} mg/dL)`,
          interpretation: r.interpretation,
          findingsTitle: "Measurement",
          findings: [
            `HbA1c ${hba1c}${unit === "%" ? "%" : " mmol/mol"} (${unit === "%" ? `${fmt(r.working.hba1c_mmol_mol, 0)} mmol/mol` : `${fmt(r.working.hba1c_percent)}%`})`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "hba1c_eag", Component: Hba1cEagCalculator };
