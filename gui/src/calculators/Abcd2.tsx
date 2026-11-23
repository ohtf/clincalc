// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Alert, Divider, SimpleGrid, Text } from "@mantine/core";
import { IconBrain } from "@tabler/icons-react";

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

/** ABCD2 score for early stroke risk after TIA (Johnston 2007). */

type Features = "unilateral-weakness" | "speech-disturbance" | "other";
type Duration = "60min-or-more" | "10-59min" | "under-10min";

const FEATURES: Choice<Features>[] = [
  {
    value: "unilateral-weakness",
    label: "Unilateral weakness (2)",
    hint: "Any unilateral motor weakness, with or without speech disturbance.",
  },
  {
    value: "speech-disturbance",
    label: "Speech disturbance without weakness (1)",
    hint: "Dysphasia or dysarthria with no weakness.",
  },
  {
    value: "other",
    label: "Other (0)",
    hint: "Any other deficit, e.g. isolated sensory or visual symptoms.",
  },
];

const DURATION: Choice<Duration>[] = [
  { value: "60min-or-more", label: "60 minutes or more (2)" },
  { value: "10-59min", label: "10-59 minutes (1)" },
  { value: "under-10min", label: "Under 10 minutes (0)" },
];

const AGE = { min: 16, max: 120 };
const SYSTOLIC = { min: 50, max: 300 };
const DIASTOLIC = { min: 20, max: 200 };

const BAND_COLOUR: Record<string, string> = { low: "teal", moderate: "yellow", high: "red" };

const isInt = (v: number | null, r: { min: number; max: number }) =>
  inRange(v, r.min, r.max) && Number.isInteger(v);
const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

function Abcd2Calculator() {
  const [age, setAge] = useState<number | null>(null);
  const [systolic, setSystolic] = useState<number | null>(null);
  const [diastolic, setDiastolic] = useState<number | null>(null);
  const [features, setFeatures] = useState<Features | null>(null);
  const [duration, setDuration] = useState<Duration | null>(null);
  const [diabetes, setDiabetes] = useState(false);

  const complete =
    isInt(age, AGE) &&
    isInt(systolic, SYSTOLIC) &&
    isInt(diastolic, DIASTOLIC) &&
    features !== null &&
    duration !== null;
  const calc = useCalculation(
    "abcd2",
    complete
      ? {
          age,
          systolic_bp: systolic,
          diastolic_bp: diastolic,
          clinical_features: features,
          duration,
          diabetes,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconBrain}
      title="ABCD2 score"
      badge="After suspected TIA"
      description="Two-day stroke risk after a transient ischaemic attack (Johnston 2007)."
      onReset={() => {
        setAge(null);
        setSystolic(null);
        setDiastolic(null);
        setFeatures(null);
        setDuration(null);
        setDiabetes(false);
      }}
      calc={calc}
      incomplete="Enter age and blood pressure and choose the clinical features and duration to calculate."
      form={
        <>
          <Alert color="yellow" variant="light" p="sm">
            NICE NG128 advises not using ABCD2 to assess stroke risk or decide referral urgency:
            refer everyone with a suspected TIA for specialist assessment within 24 hours,
            whatever the score.
          </Alert>
          <NumberField
            label="Age"
            hint="60 or over scores 1."
            unit="years"
            value={age}
            onChange={setAge}
            min={AGE.min}
            max={AGE.max}
            decimals={0}
          />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Systolic BP"
              hint="At presentation."
              unit="mmHg"
              value={systolic}
              onChange={setSystolic}
              min={SYSTOLIC.min}
              max={SYSTOLIC.max}
              decimals={0}
            />
            <NumberField
              label="Diastolic BP"
              hint="At presentation."
              unit="mmHg"
              value={diastolic}
              onChange={setDiastolic}
              min={DIASTOLIC.min}
              max={DIASTOLIC.max}
              decimals={0}
            />
          </SimpleGrid>
          <Text size="xs" c="dimmed" mt={-8}>
            One blood pressure point if systolic is 140 or more, or diastolic is 90 or more.
          </Text>
          <Divider />
          <ChoiceField
            label="Clinical features"
            hint="Score the most weighty feature only; weakness and speech points are not added together."
            value={features}
            onChange={setFeatures}
            options={FEATURES}
          />
          <ChoiceField
            label="Duration of symptoms"
            value={duration}
            onChange={setDuration}
            options={DURATION}
          />
          <Divider />
          <YesNoField
            label="Diabetes (1)"
            hint="Established type 1 or type 2 diabetes. Pre-diabetes does not count."
            checked={diabetes}
            onChange={setDiabetes}
          />
        </>
      }
      result={(r) => {
        const band = asText(r.working.risk_band);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={7}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={band && `${band} risk`}
          />
        );
      }}
      details={(r) => (
        <Facts
          title="Points"
          items={[
            ["Age", fmt(r.working.age_points)],
            ["Blood pressure", fmt(r.working.blood_pressure_points)],
            ["Clinical features", fmt(r.working.clinical_features_points)],
            ["Duration", fmt(r.working.duration_points)],
            ["Diabetes", fmt(r.working.diabetes_points)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `ABCD2 score ${fmt(r.result)} / 7 (${asText(r.working.risk_band)} risk)`,
          interpretation: r.interpretation,
          findingsTitle: "Components",
          findings: [
            `Age ${age} years (${fmt(r.working.age_points)})`,
            `Blood pressure ${systolic}/${diastolic} mmHg (${fmt(r.working.blood_pressure_points)})`,
            `Clinical features: ${labelOf(FEATURES, features)}`,
            `Duration: ${labelOf(DURATION, duration)}`,
            diabetes ? "Diabetes (1)" : "No diabetes (0)",
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "abcd2", Component: Abcd2Calculator };
