// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, Group, Radio, Text } from "@mantine/core";
import { IconLungs } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  YesNoField,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Pneumonia Severity Index (PSI/PORT) for community-acquired pneumonia (Fine 1997). */

type Sex = "female" | "male";
type FlagKey =
  | "nursing_home_resident"
  | "neoplastic_disease"
  | "liver_disease"
  | "congestive_heart_failure"
  | "cerebrovascular_disease"
  | "renal_disease"
  | "altered_mental_status"
  | "respiratory_rate_30_or_more"
  | "systolic_bp_below_90"
  | "temperature_below_35_or_40_or_more"
  | "pulse_125_or_more";
type LabKey =
  | "arterial_ph_below_7_35"
  | "bun_30_or_more_mg_dl"
  | "sodium_below_130"
  | "glucose_250_or_more_mg_dl"
  | "hematocrit_below_30_percent"
  | "pao2_below_60_mm_hg"
  | "pleural_effusion";
type Item<K> = { key: K; label: string };

const SEX: Choice<Sex>[] = [
  { value: "female", label: "Female (age - 10)" },
  { value: "male", label: "Male (age)" },
];

const NURSING_HOME: Item<FlagKey> = { key: "nursing_home_resident", label: "Nursing-home resident (+10)" };

const COMORBIDITIES: Item<FlagKey>[] = [
  { key: "neoplastic_disease", label: "Neoplastic disease (+30)" },
  { key: "liver_disease", label: "Liver disease (+20)" },
  { key: "congestive_heart_failure", label: "Congestive heart failure (+10)" },
  { key: "cerebrovascular_disease", label: "Cerebrovascular disease (+10)" },
  { key: "renal_disease", label: "Renal disease (+10)" },
];

const EXAMINATION: Item<FlagKey>[] = [
  { key: "altered_mental_status", label: "Altered mental status (+20)" },
  { key: "respiratory_rate_30_or_more", label: "Respiratory rate 30/min or more (+20)" },
  { key: "systolic_bp_below_90", label: "Systolic BP below 90 mmHg (+20)" },
  { key: "temperature_below_35_or_40_or_more", label: "Temperature below 35 °C or 40 °C or more (+15)" },
  { key: "pulse_125_or_more", label: "Pulse 125/min or more (+10)" },
];

const LABS: Item<LabKey>[] = [
  { key: "arterial_ph_below_7_35", label: "Arterial pH below 7.35 (+30)" },
  { key: "bun_30_or_more_mg_dl", label: "Blood urea nitrogen 30 mg/dL or more (+20)" },
  { key: "sodium_below_130", label: "Sodium below 130 mmol/L (+20)" },
  { key: "glucose_250_or_more_mg_dl", label: "Glucose 250 mg/dL or more (+10)" },
  { key: "hematocrit_below_30_percent", label: "Haematocrit below 30% (+10)" },
  { key: "pao2_below_60_mm_hg", label: "PaO2 below 60 mmHg (+10)" },
  { key: "pleural_effusion", label: "Pleural effusion on imaging (+10)" },
];

const FLAGS = [NURSING_HOME, ...COMORBIDITIES, ...EXAMINATION];
const AGE = { min: 1, max: 120 };

type Flags = Record<FlagKey, boolean>;
type Labs = Record<LabKey, boolean | null>;
const noneTicked = (): Flags => Object.fromEntries(FLAGS.map((f) => [f.key, false])) as Flags;
const unanswered = (): Labs => Object.fromEntries(LABS.map((l) => [l.key, null])) as Labs;

/** A required yes/no answer laid out on one line; starts unanswered. */
function YesNoRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <Radio.Group
      value={value === null ? null : value ? "yes" : "no"}
      onChange={(v) => onChange(v === "yes")}
    >
      <Group justify="space-between" wrap="nowrap" gap="md">
        <Text size="sm">{label}</Text>
        <Group gap="md" wrap="nowrap">
          <Radio value="yes" label="Yes" />
          <Radio value="no" label="No" />
        </Group>
      </Group>
    </Radio.Group>
  );
}

function PsiPortCalculator() {
  const [age, setAge] = useState<number | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [flags, setFlags] = useState<Flags>(noneTicked);
  const [labs, setLabs] = useState<Labs>(unanswered);

  const ageOk = inRange(age, AGE.min, AGE.max) && Number.isInteger(age);
  const anyFlag = FLAGS.some((f) => flags[f.key]);
  const step1ClassI = ageOk && age <= 50 && !anyFlag;
  const labsAnswered = LABS.every((l) => labs[l.key] !== null);

  const complete = ageOk && sex !== null && (step1ClassI || labsAnswered);
  const calc = useCalculation(
    "psi_port",
    complete
      ? {
          age_years: age,
          female: sex === "female",
          ...flags,
          ...(step1ClassI ? {} : labs),
        }
      : null,
  );

  const field = (f: Item<FlagKey>) => (
    <YesNoField
      key={f.key}
      label={f.label}
      checked={flags[f.key]}
      onChange={(checked) => setFlags((prev) => ({ ...prev, [f.key]: checked }))}
    />
  );

  return (
    <CalculatorPage
      icon={IconLungs}
      title="Pneumonia Severity Index (PORT)"
      badge="Community-acquired pneumonia"
      description="30-day mortality risk class (I-V) for community-acquired pneumonia (Fine 1997). Step 1 assigns class I on clinical findings alone; otherwise step 2 adds laboratory and imaging points."
      onReset={() => {
        setAge(null);
        setSex(null);
        setFlags(noneTicked());
        setLabs(unanswered());
      }}
      calc={calc}
      incomplete={
        ageOk && sex !== null && !step1ClassI
          ? "Step 1 does not assign class I: answer all seven laboratory and imaging findings."
          : "Enter age and sex to calculate."
      }
      form={
        <>
          <Text fw={600} size="sm">
            Demographics
          </Text>
          <NumberField
            label="Age"
            hint="Age in years scores the same number of points (minus 10 for females)."
            unit="years"
            value={age}
            onChange={setAge}
            min={AGE.min}
            max={AGE.max}
            decimals={0}
          />
          <ChoiceField label="Sex" value={sex} onChange={setSex} options={SEX} />
          {field(NURSING_HOME)}
          <Divider />
          <Text fw={600} size="sm">
            Comorbidities - tick each present
          </Text>
          {COMORBIDITIES.map(field)}
          <Divider />
          <Text fw={600} size="sm">
            Physical examination - tick each present
          </Text>
          {EXAMINATION.map(field)}
          <Divider />
          <Text fw={600} size="sm">
            Laboratory and imaging (step 2)
          </Text>
          {step1ClassI ? (
            <Text size="sm" c="dimmed">
              Not needed: step 1 assigns class I (age 50 or under, not a nursing-home resident, no listed
              comorbidity, and no abnormal examination finding).
            </Text>
          ) : !ageOk ? (
            <Text size="sm" c="dimmed">
              Enter age first: laboratory and imaging findings are needed only if step 1 does not assign
              class I.
            </Text>
          ) : (
            LABS.map((l) => (
              <YesNoRow
                key={l.key}
                label={l.label}
                value={labs[l.key]}
                onChange={(v) => setLabs((prev) => ({ ...prev, [l.key]: v }))}
              />
            ))
          )}
        </>
      }
      result={(r) => (
        <ScoreTile
          value={`Class ${asText(r.result)}`}
          badge={r.working.points !== undefined ? `${fmt(r.working.points)} points` : "Step 1"}
        />
      )}
      details={(r) => (
        <Facts
          items={[
            r.working.points !== undefined && ["Points", fmt(r.working.points)],
            ["30-day mortality", `${fmt(r.working.mortality_30_day_percent)}%`],
          ]}
        />
      )}
      summary={(r) => {
        const positiveLabs = step1ClassI ? [] : LABS.filter((l) => labs[l.key] === true);
        return summaryText({
          heading: `PSI/PORT class ${asText(r.result)}${
            r.working.points !== undefined ? ` (${fmt(r.working.points)} points)` : " (step 1)"
          }`,
          interpretation: r.interpretation,
          findingsTitle: "Findings",
          findings: [
            `Age ${age} years, ${sex}`,
            ...FLAGS.filter((f) => flags[f.key]).map((f) => f.label),
            ...positiveLabs.map((l) => l.label),
            !step1ClassI && positiveLabs.length === 0 && "No abnormal laboratory or imaging finding",
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "psi_port", Component: PsiPortCalculator };
