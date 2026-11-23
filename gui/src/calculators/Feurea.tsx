// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid, Text } from "@mantine/core";
import { IconTestPipe2 } from "@tabler/icons-react";

import {
  CalculatorPage,
  inRange,
  NumberField,
  ScoreTile,
  asText,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** Fractional excretion of urea (Carvounis, Kidney Int 2002). */

const positive = (v: number | null): v is number => inRange(v, 0) && v > 0;

function FeureaCalculator() {
  const [urineUrea, setUrineUrea] = useState<number | null>(null);
  const [plasmaUrea, setPlasmaUrea] = useState<number | null>(null);
  const [urineCr, setUrineCr] = useState<number | null>(null);
  const [plasmaCr, setPlasmaCr] = useState<number | null>(null);

  const complete =
    positive(urineUrea) && positive(plasmaUrea) && positive(urineCr) && positive(plasmaCr);
  const calc = useCalculation(
    "feurea",
    complete
      ? {
          urine_urea: urineUrea,
          plasma_urea: plasmaUrea,
          urine_creatinine: urineCr,
          plasma_creatinine: plasmaCr,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconTestPipe2}
      title="FEUrea"
      badge="Acute kidney injury"
      description="Fractional excretion of urea, to help separate pre-renal from intrinsic renal causes of acute kidney injury (Carvounis 2002). Less affected by loop and thiazide diuretics than FENa."
      onReset={() => {
        setUrineUrea(null);
        setPlasmaUrea(null);
        setUrineCr(null);
        setPlasmaCr(null);
      }}
      calc={calc}
      incomplete="Enter all four values, each above zero, to calculate."
      form={
        <>
          <Text size="xs" c="dimmed">
            Use paired urine and plasma samples. Units cancel out, but each pair must share a unit:
            both urea values in the same unit, and both creatinine values in the same unit. UK
            laboratories often report urine creatinine in mmol/L and plasma creatinine in µmol/L (1
            mmol/L = 1000 µmol/L).
          </Text>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Urine urea"
              hint="Same unit as plasma urea."
              value={urineUrea}
              onChange={setUrineUrea}
              min={0}
            />
            <NumberField
              label="Plasma urea"
              hint="Same unit as urine urea."
              value={plasmaUrea}
              onChange={setPlasmaUrea}
              min={0}
            />
            <NumberField
              label="Urine creatinine"
              hint="Same unit as plasma creatinine."
              value={urineCr}
              onChange={setUrineCr}
              min={0}
            />
            <NumberField
              label="Plasma creatinine"
              hint="Same unit as urine creatinine."
              value={plasmaCr}
              onChange={setPlasmaCr}
              min={0}
            />
          </SimpleGrid>
        </>
      }
      result={(r) => <ScoreTile value={asText(r.result)} unit="%" badge="FEUrea" />}
      summary={(r) =>
        summaryText({
          heading: `FEUrea ${asText(r.result)}%`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [
            `Urine urea ${urineUrea} and plasma urea ${plasmaUrea} (same unit)`,
            `Urine creatinine ${urineCr} and plasma creatinine ${plasmaCr} (same unit)`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "feurea", Component: FeureaCalculator };
