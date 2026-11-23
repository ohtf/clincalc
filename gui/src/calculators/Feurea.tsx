// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid, Text } from "@mantine/core";
import { IconTestPipe2 } from "@tabler/icons-react";

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
  type Choice,
  type CreatinineUnit,
} from "../kit";

/** Fractional excretion of urea (Carvounis, Kidney Int 2002). */

const positive = (v: number | null): v is number => inRange(v, 0) && v > 0;
type UreaUnit = "mmol_l" | "urea_mg_dl" | "urea_nitrogen_mg_dl";
const UREA_UNITS: Choice<UreaUnit>[] = [
  { value: "mmol_l", label: "Urea mmol/L" },
  { value: "urea_mg_dl", label: "Urea mg/dL" },
  { value: "urea_nitrogen_mg_dl", label: "Urea nitrogen mg/dL" },
];
const unitLabel = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((u) => u.value === value)?.label ?? "";

function FeureaCalculator() {
  const [urineUrea, setUrineUrea] = useState<number | null>(null);
  const [plasmaUrea, setPlasmaUrea] = useState<number | null>(null);
  const [urineCr, setUrineCr] = useState<number | null>(null);
  const [plasmaCr, setPlasmaCr] = useState<number | null>(null);
  const [urineCrUnit, setUrineCrUnit] = useState<CreatinineUnit | null>(null);
  const [plasmaCrUnit, setPlasmaCrUnit] = useState<CreatinineUnit | null>(null);
  const [urineUreaUnit, setUrineUreaUnit] = useState<UreaUnit | null>(null);
  const [plasmaUreaUnit, setPlasmaUreaUnit] = useState<UreaUnit | null>(null);

  const complete =
    positive(urineUrea) && positive(plasmaUrea) && positive(urineCr) && positive(plasmaCr) &&
    urineCrUnit !== null && plasmaCrUnit !== null && urineUreaUnit !== null && plasmaUreaUnit !== null;
  const calc = useCalculation(
    "feurea",
    complete
      ? {
          urine_urea: urineUrea,
          plasma_urea: plasmaUrea,
          urine_creatinine: urineCr,
          plasma_creatinine: plasmaCr,
          urine_creatinine_unit: urineCrUnit,
          plasma_creatinine_unit: plasmaCrUnit,
          urine_urea_unit: urineUreaUnit,
          plasma_urea_unit: plasmaUreaUnit,
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
        setUrineCrUnit(null);
        setPlasmaCrUnit(null);
        setUrineUreaUnit(null);
        setPlasmaUreaUnit(null);
      }}
      calc={calc}
      incomplete="Enter all four values above zero and select the unit for each."
      form={
        <>
          <Text size="xs" c="dimmed">
            Use paired urine and plasma samples. Select each unit as reported by the lab, distinguishing urea from urea nitrogen (BUN or UUN).
          </Text>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Urine urea"
              value={urineUrea}
              onChange={setUrineUrea}
              min={0}
            />
            <NumberField
              label="Plasma urea"
              value={plasmaUrea}
              onChange={setPlasmaUrea}
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
            <ChoiceField label="Urine urea unit" value={urineUreaUnit} onChange={setUrineUreaUnit} options={UREA_UNITS} />
            <ChoiceField label="Plasma urea unit" value={plasmaUreaUnit} onChange={setPlasmaUreaUnit} options={UREA_UNITS} />
            <ChoiceField label="Urine creatinine unit" value={urineCrUnit} onChange={setUrineCrUnit} options={CREATININE_UNITS} layout="inline" />
            <ChoiceField label="Plasma creatinine unit" value={plasmaCrUnit} onChange={setPlasmaCrUnit} options={CREATININE_UNITS} layout="inline" />
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
            `Urine ${urineUrea} (${unitLabel(UREA_UNITS, urineUreaUnit)})`,
            `Plasma ${plasmaUrea} (${unitLabel(UREA_UNITS, plasmaUreaUnit)})`,
            `Urine creatinine ${urineCr} ${unitLabel(CREATININE_UNITS, urineCrUnit)}`,
            `Plasma creatinine ${plasmaCr} ${unitLabel(CREATININE_UNITS, plasmaCrUnit)}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "feurea", Component: FeureaCalculator };
