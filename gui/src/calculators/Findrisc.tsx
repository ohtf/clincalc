// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, Group, Radio, Text } from "@mantine/core";
import { IconApple } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** FINDRISC, the Finnish Diabetes Risk Score (Lindström & Tuomilehto 2003). */

type Sex = "male" | "female";
type YesNo = "yes" | "no";
type Family = "none" | "second_degree" | "first_degree";

const SEX: Choice<Sex>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const FAMILY: Choice<Family>[] = [
  { value: "none", label: "No (0)" },
  {
    value: "second_degree",
    label: "Yes: second-degree relative only (3)",
    hint: "Grandparent, aunt, uncle, or cousin.",
  },
  {
    value: "first_degree",
    label: "Yes: first-degree relative (5)",
    hint: "Parent, sibling, or child - with or without a second-degree relative.",
  },
];

const QUESTIONS = [
  {
    key: "physically_active",
    label: "At least 30 minutes of moderate physical activity every day?",
    points: { yes: 0, no: 2 },
    summaryYes: "Physically active at least 30 minutes daily",
    summaryNo: "Not physically active 30 minutes daily",
  },
  {
    key: "daily_vegetables_fruit",
    label: "Eats vegetables, fruit, or berries every day?",
    points: { yes: 0, no: 1 },
    summaryYes: "Eats vegetables, fruit, or berries daily",
    summaryNo: "Does not eat vegetables, fruit, or berries daily",
  },
  {
    key: "antihypertensive_medication",
    label: "Currently taking antihypertensive medication?",
    points: { yes: 2, no: 0 },
    summaryYes: "On antihypertensive medication",
    summaryNo: "Not on antihypertensive medication",
  },
  {
    key: "high_blood_glucose_history",
    label: "History of high blood glucose, including during pregnancy?",
    points: { yes: 5, no: 0 },
    summaryYes: "History of high blood glucose",
    summaryNo: "No history of high blood glucose",
  },
] as const;

type Key = (typeof QUESTIONS)[number]["key"];
type Answers = Record<Key, YesNo | null>;

const AGE = { min: 18, max: 120 };

const BAND_COLOUR: Record<string, string> = {
  Low: "teal",
  "Slightly elevated": "yellow",
  Moderate: "orange",
  High: "red",
  "Very high": "red",
};

const positive = (v: number | null): v is number => inRange(v, 0) && v > 0;
const blankAnswers = (): Answers =>
  Object.fromEntries(QUESTIONS.map((q) => [q.key, null])) as Answers;

function FindriscCalculator() {
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [bmi, setBmi] = useState<number | null>(null);
  const [waist, setWaist] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answers>(blankAnswers);
  const [family, setFamily] = useState<Family | null>(null);

  const complete =
    sex !== null &&
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age) &&
    positive(bmi) &&
    positive(waist) &&
    QUESTIONS.every((q) => answers[q.key] !== null) &&
    family !== null;
  const calc = useCalculation(
    "findrisc",
    complete
      ? {
          sex,
          age,
          bmi,
          waist_cm: waist,
          ...Object.fromEntries(QUESTIONS.map((q) => [q.key, answers[q.key] === "yes"])),
          family_history: family,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconApple}
      title="FINDRISC"
      badge="Type 2 diabetes risk"
      description="Finnish Diabetes Risk Score: eight items predicting the 10-year risk of developing type 2 diabetes, scored 0-26 (Lindström & Tuomilehto 2003)."
      onReset={() => {
        setSex(null);
        setAge(null);
        setBmi(null);
        setWaist(null);
        setAnswers(blankAnswers());
        setFamily(null);
      }}
      calc={calc}
      incomplete="Answer every item to calculate."
      form={
        <>
          <ChoiceField
            label="Sex"
            hint="Selects the sex-specific waist circumference thresholds."
            value={sex}
            onChange={setSex}
            options={SEX}
          />
          <NumberField
            label="Age"
            hint="Under 45: 0, 45-54: 2, 55-64: 3, 65 or over: 4."
            unit="years"
            value={age}
            onChange={setAge}
            min={AGE.min}
            max={AGE.max}
            decimals={0}
          />
          <NumberField
            label="BMI"
            hint="Under 25: 0, 25-30: 1, over 30: 3."
            unit="kg/m²"
            value={bmi}
            onChange={setBmi}
            min={0}
            decimals={1}
          />
          <NumberField
            label="Waist circumference"
            hint="Men: under 94 cm 0, 94-102 cm 3, over 102 cm 4. Women: under 80 cm 0, 80-88 cm 3, over 88 cm 4."
            unit="cm"
            value={waist}
            onChange={setWaist}
            min={0}
            decimals={1}
          />
          <Divider />
          {QUESTIONS.map((q) => (
            <Radio.Group
              key={q.key}
              label={q.label}
              value={answers[q.key]}
              onChange={(v) => setAnswers((prev) => ({ ...prev, [q.key]: v as YesNo }))}
            >
              <Group gap="xl" mt={6}>
                <Radio value="yes" label={`Yes (${q.points.yes})`} />
                <Radio value="no" label={`No (${q.points.no})`} />
              </Group>
            </Radio.Group>
          ))}
          <ChoiceField
            label="Family history of diabetes"
            value={family}
            onChange={setFamily}
            options={FAMILY}
          />
          <Text size="xs" c="dimmed">
            Points for each answer are shown in brackets.
          </Text>
        </>
      }
      result={(r) => {
        const band = asText(r.working.risk_band);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={26}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={band && `${band} risk`}
          />
        );
      }}
      details={(r) => <Facts items={[["10-year risk", asText(r.working.ten_year_risk)]]} />}
      summary={(r) =>
        summaryText({
          heading: `FINDRISC ${fmt(r.result)} / 26 (${asText(r.working.risk_band)} risk; ${asText(r.working.ten_year_risk)} over 10 years)`,
          interpretation: r.interpretation,
          findingsTitle: "Items",
          findings: [
            `Sex: ${sex}`,
            `Age ${age} years`,
            `BMI ${bmi} kg/m²`,
            `Waist ${waist} cm`,
            ...QUESTIONS.map((q) => (answers[q.key] === "yes" ? q.summaryYes : q.summaryNo)),
            `Family history of diabetes: ${FAMILY.find((f) => f.value === family)?.label ?? ""}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "findrisc", Component: FindriscCalculator };
