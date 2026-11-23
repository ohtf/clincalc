// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconMoodConfused } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  ScoreTile,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
  ChoiceField,
} from "../kit";

/** CAM-ICU delirium assessment for ICU patients (Ely 2001). */

/** Two or three short options side by side; starts unselected like ChoiceField. */

type Finding = "positive" | "negative";

const FINDING: Choice<Finding>[] = [
  { value: "positive", label: "Positive" },
  { value: "negative", label: "Negative" },
];

const FEATURES = [
  {
    key: "acute_or_fluctuating_course",
    working: "feature_1_positive",
    label: "Feature 1: acute change or fluctuating course of mental status",
    hint: "From baseline, over the preceding 24 hours.",
  },
  {
    key: "inattention",
    working: "feature_2_positive",
    label: "Feature 2: inattention",
    hint: "For example, errors on a letter-vigilance or picture test.",
  },
  {
    key: "disorganized_thinking",
    working: "feature_3_positive",
    label: "Feature 3: disorganised thinking",
    hint: "For example, errors on yes/no questions or a simple command.",
  },
  {
    key: "altered_consciousness",
    working: "feature_4_positive",
    label: "Feature 4: altered level of consciousness",
    hint: "Any RASS other than 0 (alert and calm).",
  },
] as const;

type Key = (typeof FEATURES)[number]["key"];
type Answers = Record<Key, Finding | null>;

const unanswered = (): Answers =>
  Object.fromEntries(FEATURES.map((f) => [f.key, null])) as Answers;

function CamIcuCalculator() {
  const [answers, setAnswers] = useState<Answers>(unanswered);

  const complete = FEATURES.every((f) => answers[f.key] !== null);
  const calc = useCalculation(
    "cam_icu",
    complete
      ? Object.fromEntries(FEATURES.map((f) => [f.key, answers[f.key] === "positive"]))
      : null,
  );

  return (
    <CalculatorPage
      icon={IconMoodConfused}
      title="CAM-ICU"
      badge="ICU delirium"
      description="Confusion Assessment Method for the ICU (Ely 2001): delirium is present when Feature 1 and Feature 2 and either Feature 3 or Feature 4 are positive. Not assessable at RASS -4 or -5."
      onReset={() => setAnswers(unanswered())}
      formTitle="Record each feature as assessed"
      calc={calc}
      incomplete="Record all four features to calculate."
      form={
        <>
          {FEATURES.map((f) => (
            <ChoiceField layout="inline"
              key={f.key}
              label={f.label}
              hint={f.hint}
              value={answers[f.key]}
              onChange={(v) => setAnswers((prev) => ({ ...prev, [f.key]: v }))}
              options={FINDING}
            />
          ))}
        </>
      }
      result={(r) => (
        <ScoreTile
          value={r.result === "positive" ? "Positive" : "Negative"}
          badge={r.result === "positive" ? "delirium present" : "delirium not detected"}
        />
      )}
      details={(r) => (
        <Facts
          title="Features"
          items={FEATURES.map((f, i) => [
            `Feature ${i + 1}`,
            r.working[f.working] === true ? "positive" : "negative",
          ])}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `CAM-ICU ${r.result === "positive" ? "positive: delirium present" : "negative: delirium not detected"}`,
          interpretation: r.interpretation,
          findingsTitle: "Features",
          findings: FEATURES.map((f) => `${f.label}: ${answers[f.key]}`),
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "cam_icu", Component: CamIcuCalculator };
