// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid, Text } from "@mantine/core";
import { IconSalt } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  CREATININE_UNITS,
  inRange,
  NumberField,
  ScoreTile,
  asText,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type CreatinineUnit,
} from "../kit";

/** Fractional excretion of sodium (Espinel, JAMA 1976). */

const positive = (v: number | null): v is number => inRange(v, 0) && v > 0;

function FenaCalculator() {
  const [urineNa, setUrineNa] = useState<number | null>(null);
  const [plasmaNa, setPlasmaNa] = useState<number | null>(null);
  const [urineCr, setUrineCr] = useState<number | null>(null);
  const [plasmaCr, setPlasmaCr] = useState<number | null>(null);
  const [urineCrUnit, setUrineCrUnit] = useState<CreatinineUnit | null>(null);
  const [plasmaCrUnit, setPlasmaCrUnit] = useState<CreatinineUnit | null>(null);

  const complete =
    positive(urineNa) && positive(plasmaNa) && positive(urineCr) && positive(plasmaCr) &&
    urineCrUnit !== null && plasmaCrUnit !== null;
  const calc = useCalculation(
    "fena",
    complete
      ? {
          urine_sodium: urineNa,
          plasma_sodium: plasmaNa,
          urine_creatinine: urineCr,
          plasma_creatinine: plasmaCr,
          urine_creatinine_unit: urineCrUnit,
          plasma_creatinine_unit: plasmaCrUnit,
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
        setUrineCrUnit(null);
        setPlasmaCrUnit(null);
      }}
      calc={calc}
      incomplete="Enter all four values above zero and select both creatinine units."
      form={
        <>
          <Text size="xs" c="dimmed">
            Use paired urine and plasma samples. Select each creatinine unit as reported by the lab.
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
              value={urineCr}
              onChange={setUrineCr}
              min={0}
            />
            <NumberField
              label="Plasma creatinine"
              value={plasmaCr}
              onChange={setPlasmaCr}
              min={0}
            />
          </SimpleGrid>
          <SimpleGrid cols={2} spacing="md">
            <ChoiceField label="Urine creatinine unit" value={urineCrUnit} onChange={setUrineCrUnit} options={CREATININE_UNITS} layout="inline" />
            <ChoiceField label="Plasma creatinine unit" value={plasmaCrUnit} onChange={setPlasmaCrUnit} options={CREATININE_UNITS} layout="inline" />
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
            `Urine creatinine ${urineCr} ${CREATININE_UNITS.find((u) => u.value === urineCrUnit)?.label ?? ""}`,
            `Plasma creatinine ${plasmaCr} ${CREATININE_UNITS.find((u) => u.value === plasmaCrUnit)?.label ?? ""}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "fena", Component: FenaCalculator };
