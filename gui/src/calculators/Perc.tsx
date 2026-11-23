// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Badge, Divider, Group, SimpleGrid, Text, Title } from "@mantine/core";
import { IconLungs } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  inRange,
  NumberField,
  YesNoField,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** PERC rule for suspected pulmonary embolism (Kline 2004, 2008; Freund 2018). */

type YesNo = "yes" | "no";
type Key =
  | "unilateral_leg_swelling"
  | "haemoptysis"
  | "recent_surgery_or_trauma_requiring_hospitalisation"
  | "prior_vte"
  | "exogenous_oestrogen_use";

const YES_NO: Choice<YesNo>[] = [
  { value: "yes", label: "Yes - gestalt below 15%" },
  { value: "no", label: "No" },
];

const CRITERIA: Array<{ key: Key; label: string; hint?: string }> = [
  {
    key: "unilateral_leg_swelling",
    label: "Unilateral leg swelling",
    hint: "Not bilateral oedema with no lateralising finding.",
  },
  {
    key: "haemoptysis",
    label: "Haemoptysis",
    hint: "Frank haemoptysis or blood-streaked sputum; not haematemesis or blood from the nose or upper airway.",
  },
  {
    key: "recent_surgery_or_trauma_requiring_hospitalisation",
    label: "Surgery or trauma requiring hospitalisation in the past 4 weeks",
  },
  { key: "prior_vte", label: "Prior DVT or PE" },
  {
    key: "exogenous_oestrogen_use",
    label: "Current exogenous oestrogen use",
    hint: "Combined oestrogen-containing contraception, oestrogen-containing HRT, or other oestrogen therapy; not progestogen-only.",
  },
];

const AGE = { min: 18, max: 120 };
const HR = { min: 1, max: 300 };
const SPO2 = { min: 1, max: 100 };

type Criteria = Record<Key, boolean>;
const noneTicked = (): Criteria =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, false])) as Criteria;

const isInt = (v: number | null, r: { min: number; max: number }): v is number =>
  inRange(v, r.min, r.max) && Number.isInteger(v);

function PercCalculator() {
  const [gestalt, setGestalt] = useState<YesNo | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [hr, setHr] = useState<number | null>(null);
  const [spo2, setSpo2] = useState<number | null>(null);
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);

  const complete = gestalt === "yes" && isInt(age, AGE) && isInt(hr, HR) && isInt(spo2, SPO2);
  const calc = useCalculation(
    "perc",
    complete
      ? {
          low_pretest_probability_confirmed: true,
          age_years: age,
          heart_rate_bpm: hr,
          room_air_oxygen_saturation_percent: spo2,
          ...criteria,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconLungs}
      title="PERC rule"
      badge="Suspected PE"
      description="Eight-item rule-out for stable adult emergency-department outpatients with suspected pulmonary embolism, applied only after the treating clinician has judged the pretest probability below 15% (Kline 2004, 2008)."
      onReset={() => {
        setGestalt(null);
        setAge(null);
        setHr(null);
        setSpo2(null);
        setCriteria(noneTicked());
      }}
      calc={calc}
      incomplete={
        gestalt === "no"
          ? "PERC does not apply: it is validated only after the treating clinician estimates the pretest probability of PE below 15% by unstructured gestalt."
          : "Confirm low pretest probability and enter age, heart rate, and saturation to apply the rule."
      }
      form={
        <>
          <ChoiceField
            label="Has the treating clinician estimated the pretest probability of PE below 15%?"
            hint="By unstructured clinical gestalt, before applying PERC. Do not substitute a low Wells or Geneva score."
            value={gestalt}
            onChange={setGestalt}
            options={YES_NO}
          />
          <Divider />
          <Text fw={600} size="sm">
            Measurements
          </Text>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Age"
              hint="50 or over is positive."
              unit="years"
              value={age}
              onChange={setAge}
              min={AGE.min}
              max={AGE.max}
              decimals={0}
            />
            <NumberField
              label="Heart rate"
              hint="100 or over is positive."
              unit="bpm"
              value={hr}
              onChange={setHr}
              min={HR.min}
              max={HR.max}
              decimals={0}
            />
            <NumberField
              label="Oxygen saturation on room air"
              hint="Below 95% is positive. Not measured on supplemental oxygen."
              unit="%"
              value={spo2}
              onChange={setSpo2}
              min={SPO2.min}
              max={SPO2.max}
              decimals={0}
            />
          </SimpleGrid>
          <Divider />
          <Text fw={600} size="sm">
            Tick each criterion that is present
          </Text>
          {CRITERIA.map((c) => (
            <YesNoField
              key={c.key}
              label={c.label}
              hint={c.hint}
              checked={criteria[c.key]}
              onChange={(checked) => setCriteria((prev) => ({ ...prev, [c.key]: checked }))}
            />
          ))}
        </>
      }
      result={(r) => (
        <Group justify="space-between" align="center" gap="xs" wrap="wrap">
          <Title order={2} c="teal">
            {asText(r.result) === "perc-negative" ? "PERC negative" : "PERC positive"}
          </Title>
          <Badge color="teal" variant="light" size="lg">
            {fmt(r.working.positive_count)} of 8 present
          </Badge>
        </Group>
      )}
      summary={(r) =>
        summaryText({
          heading: `${asText(r.result) === "perc-negative" ? "PERC negative" : "PERC positive"} (${fmt(r.working.positive_count)} of 8 criteria present)`,
          interpretation: r.interpretation,
          findingsTitle: "Findings",
          findings: [
            "Pretest probability below 15% by clinician gestalt",
            `Age ${age} years${r.working.age_50_or_over === true ? " (positive)" : ""}`,
            `Heart rate ${hr} bpm${r.working.heart_rate_100_or_over === true ? " (positive)" : ""}`,
            `Room-air saturation ${spo2}%${r.working.room_air_oxygen_saturation_below_95 === true ? " (positive)" : ""}`,
            ...CRITERIA.filter((c) => criteria[c.key]).map((c) => c.label),
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "perc", Component: PercCalculator };
