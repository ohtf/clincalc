// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid, Text } from "@mantine/core";
import { IconSalt } from "@tabler/icons-react";

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

/** Fractional excretion of sodium (Espinel, JAMA 1976). */

const positive = (v: number | null): v is number => inRange(v, 0) && v > 0;

function FenaCalculator() {
  const [urineNa, setUrineNa] = useState<number | null>(null);
  const [plasmaNa, setPlasmaNa] = useState<number | null>(null);
  const [urineCr, setUrineCr] = useState<number | null>(null);
  const [plasmaCr, setPlasmaCr] = useState<number | null>(null);

  const complete =
    positive(urineNa) && positive(plasmaNa) && positive(urineCr) && positive(plasmaCr);
  const calc = useCalculation(
    "fena",
    complete
      ? {
          urine_sodium: urineNa,
          plasma_sodium: plasmaNa,
          urine_creatinine: urineCr,
          plasma_creatinine: plasmaCr,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconSalt}
      title="FENa"
      badge="Acute kidney injury"
      description="Fractional excretion of sodium, to help separate pre-renal from intrinsic renal causes of acute kidney injury (Espinel 1976). Unreliable after diuretics, in CKD, non-oliguric ATN, or early obstruction."
      onReset={() => {
        setUrineNa(null);
        setPlasmaNa(null);
        setUrineCr(null);
        setPlasmaCr(null);
      }}
      calc={calc}
      incomplete="Enter all four values, each above zero, to calculate."
      form={
        <>
          <Text size="xs" c="dimmed">
            Use paired urine and plasma samples. The creatinine unit cancels out, but both
            creatinine values must be in the same unit: UK laboratories often report urine
            creatinine in mmol/L and plasma creatinine in µmol/L (1 mmol/L = 1000 µmol/L).
          </Text>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Urine sodium"
              unit="mmol/L"
              value={urineNa}
              onChange={setUrineNa}
              min={0}
            />
            <NumberField
              label="Plasma sodium"
              unit="mmol/L"
              value={plasmaNa}
              onChange={setPlasmaNa}
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
      result={(r) => <ScoreTile value={asText(r.result)} unit="%" badge="FENa" />}
      summary={(r) =>
        summaryText({
          heading: `FENa ${asText(r.result)}%`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [
            `Urine sodium ${urineNa} mmol/L`,
            `Plasma sodium ${plasmaNa} mmol/L`,
            `Urine creatinine ${urineCr} and plasma creatinine ${plasmaCr} (same unit)`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "fena", Component: FenaCalculator };
