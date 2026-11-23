// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState, type ReactNode } from "react";
import { Divider, Group, NumberInput, Radio, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconActivityHeartbeat } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** SOFA organ failure assessment (Vincent 1996; Sepsis-3, Singer 2016). */

type Unit = "mg/dL" | "umol/L";
type Support = "yes" | "no";
type Cardiovascular =
  | "map-at-least70"
  | "map-below70"
  | "dopamine-low"
  | "moderate-vasopressors"
  | "high-vasopressors";

const SUPPORT: Choice<Support>[] = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes - mechanical ventilation or CPAP" },
];

const CARDIOVASCULAR: Choice<Cardiovascular>[] = [
  { value: "map-at-least70", label: "MAP 70 mmHg or more, no vasopressors (0)" },
  { value: "map-below70", label: "MAP under 70 mmHg, no vasopressors (1)" },
  {
    value: "dopamine-low",
    label: "Dopamine 5 or less, or dobutamine at any dose (2)",
  },
  {
    value: "moderate-vasopressors",
    label: "Dopamine over 5, or adrenaline 0.1 or less, or noradrenaline 0.1 or less (3)",
  },
  {
    value: "high-vasopressors",
    label: "Dopamine over 15, or adrenaline over 0.1, or noradrenaline over 0.1 (4)",
  },
];

const UNIT_LABEL: Record<Unit, string> = { "mg/dL": "mg/dL", "umol/L": "µmol/L" };

const PF = { max: 700 };
const PLATELETS = { min: 0, max: 2000 };
const GCS = { min: 3, max: 15 };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap="sm">
      <div>
        <Text fw={600} size="sm">
          {title}
        </Text>
        <Divider mt={4} />
      </div>
      {children}
    </Stack>
  );
}

function UnitChoice({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Unit | null;
  onChange: (u: Unit) => void;
}) {
  return (
    <Radio.Group label={label} value={value} onChange={(v) => onChange(v as Unit)}>
      <Group gap="lg" mt={8}>
        <Radio value="umol/L" label="µmol/L" />
        <Radio value="mg/dL" label="mg/dL" />
      </Group>
    </Radio.Group>
  );
}

function PfRatioField({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const invalid = value !== null && !(value > 0 && value <= PF.max);
  return (
    <NumberInput
      label="PaO2/FiO2 ratio"
      description="400 or more scores 0; under 300 1; under 200 2. Under 200 scores 3, and under 100 scores 4, only with respiratory support."
      value={value ?? ""}
      onChange={(v) => {
        if (v === "" || v === "-") return onChange(null);
        const n = typeof v === "number" ? v : Number(v);
        onChange(Number.isFinite(n) ? n : null);
      }}
      decimalScale={0}
      allowDecimal={false}
      allowNegative={false}
      clampBehavior="none"
      hideControls
      rightSection={
        <Text size="xs" c="dimmed" pr={8}>
          mmHg
        </Text>
      }
      rightSectionWidth="auto"
      error={invalid ? `Expected more than 0, up to ${PF.max} mmHg` : undefined}
      data-min={0}
      data-max={PF.max}
    />
  );
}

const cvLabel = (v: Cardiovascular | null) => CARDIOVASCULAR.find((c) => c.value === v)?.label ?? "";

function SofaCalculator() {
  const [pf, setPf] = useState<number | null>(null);
  const [support, setSupport] = useState<Support | null>(null);
  const [platelets, setPlatelets] = useState<number | null>(null);
  const [bilirubin, setBilirubin] = useState<number | null>(null);
  const [bilirubinUnit, setBilirubinUnit] = useState<Unit | null>(null);
  const [cardiovascular, setCardiovascular] = useState<Cardiovascular | null>(null);
  const [gcs, setGcs] = useState<number | null>(null);
  const [creatinine, setCreatinine] = useState<number | null>(null);
  const [creatinineUnit, setCreatinineUnit] = useState<Unit | null>(null);

  const complete =
    pf !== null &&
    pf > 0 &&
    pf <= PF.max &&
    support !== null &&
    inRange(platelets, PLATELETS.min, PLATELETS.max) &&
    inRange(bilirubin, 0) &&
    bilirubinUnit !== null &&
    cardiovascular !== null &&
    inRange(gcs, GCS.min, GCS.max) &&
    Number.isInteger(gcs) &&
    inRange(creatinine, 0) &&
    creatinineUnit !== null;
  const calc = useCalculation(
    "sofa",
    complete
      ? {
          pao2_fio2: pf,
          respiratory_support: support === "yes",
          platelets,
          bilirubin,
          bilirubin_unit: bilirubinUnit,
          cardiovascular,
          gcs,
          creatinine,
          creatinine_unit: creatinineUnit,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconActivityHeartbeat}
      title="SOFA score"
      badge="Organ dysfunction"
      description="Sequential Organ Failure Assessment: six organ systems each scored 0-4, total 0-24 (Vincent 1996). In suspected infection, an acute rise of 2 or more from baseline indicates sepsis (Sepsis-3)."
      onReset={() => {
        setPf(null);
        setSupport(null);
        setPlatelets(null);
        setBilirubin(null);
        setBilirubinUnit(null);
        setCardiovascular(null);
        setGcs(null);
        setCreatinine(null);
        setCreatinineUnit(null);
      }}
      calc={calc}
      incomplete="Complete all six organ systems, including the units, to calculate."
      form={
        <Stack gap="md">
          <Section title="Respiration">
            <SimpleGrid cols={2} spacing="md">
              <PfRatioField value={pf} onChange={setPf} />
              <ChoiceField
                label="Respiratory support"
                value={support}
                onChange={setSupport}
                options={SUPPORT}
              />
            </SimpleGrid>
          </Section>
          <Section title="Coagulation">
            <SimpleGrid cols={2} spacing="md">
              <NumberField
                label="Platelets"
                hint="150 or more scores 0; under 150 1; under 100 2; under 50 3; under 20 4."
                unit="x10⁹/L"
                value={platelets}
                onChange={setPlatelets}
                min={PLATELETS.min}
                max={PLATELETS.max}
                decimals={0}
              />
            </SimpleGrid>
          </Section>
          <Section title="Liver">
            <SimpleGrid cols={2} spacing="md">
              <NumberField
                label="Bilirubin"
                hint="Scored in mg/dL: under 1.2 scores 0, 12 or more scores 4."
                unit={bilirubinUnit ? UNIT_LABEL[bilirubinUnit] : undefined}
                value={bilirubin}
                onChange={setBilirubin}
                min={0}
                decimals={bilirubinUnit === "mg/dL" ? 2 : 0}
              />
              <UnitChoice label="Bilirubin unit" value={bilirubinUnit} onChange={setBilirubinUnit} />
            </SimpleGrid>
          </Section>
          <Section title="Cardiovascular">
            <ChoiceField
              label="Highest applicable support"
              hint="Vasoactive doses in mcg/kg/min."
              value={cardiovascular}
              onChange={setCardiovascular}
              options={CARDIOVASCULAR}
            />
          </Section>
          <Section title="Central nervous system">
            <SimpleGrid cols={2} spacing="md">
              <NumberField
                label="Glasgow Coma Scale"
                hint="15 scores 0; 13-14 1; 10-12 2; 6-9 3; under 6 4."
                value={gcs}
                onChange={setGcs}
                min={GCS.min}
                max={GCS.max}
                decimals={0}
              />
            </SimpleGrid>
          </Section>
          <Section title="Renal">
            <SimpleGrid cols={2} spacing="md">
              <NumberField
                label="Creatinine"
                hint="Scored in mg/dL: under 1.2 scores 0, 5.0 or more scores 4. Urine output is not used."
                unit={creatinineUnit ? UNIT_LABEL[creatinineUnit] : undefined}
                value={creatinine}
                onChange={setCreatinine}
                min={0}
                decimals={creatinineUnit === "mg/dL" ? 2 : 0}
              />
              <UnitChoice
                label="Creatinine unit"
                value={creatinineUnit}
                onChange={setCreatinineUnit}
              />
            </SimpleGrid>
          </Section>
        </Stack>
      }
      result={(r) => <ScoreTile value={fmt(r.result)} outOf={24} />}
      details={(r) => (
        <Facts
          title="Organ sub-scores"
          items={[
            ["Respiration", fmt(r.working.respiration_score)],
            ["Coagulation", fmt(r.working.coagulation_score)],
            ["Liver", fmt(r.working.liver_score)],
            ["Cardiovascular", fmt(r.working.cardiovascular_score)],
            ["CNS", fmt(r.working.cns_score)],
            ["Renal", fmt(r.working.renal_score)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `SOFA ${fmt(r.result)} / 24`,
          interpretation: r.interpretation,
          findingsTitle: "Values",
          findings: [
            `PaO2/FiO2 ${fmt(pf)} mmHg, ${support === "yes" ? "on mechanical ventilation or CPAP" : "no respiratory support"} (${fmt(r.working.respiration_score)})`,
            `Platelets ${fmt(platelets)} x10⁹/L (${fmt(r.working.coagulation_score)})`,
            `Bilirubin ${fmt(bilirubin, 2)} ${bilirubinUnit ? UNIT_LABEL[bilirubinUnit] : ""} (${fmt(r.working.liver_score)})`,
            `Cardiovascular: ${cvLabel(cardiovascular)}`,
            `GCS ${gcs} (${fmt(r.working.cns_score)})`,
            `Creatinine ${fmt(creatinine, 2)} ${creatinineUnit ? UNIT_LABEL[creatinineUnit] : ""} (${fmt(r.working.renal_score)})`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "sofa", Component: SofaCalculator };
