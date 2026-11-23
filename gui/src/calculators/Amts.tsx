// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconMessageQuestion } from "@tabler/icons-react";

import {
  CalculatorPage,
  ScoreTile,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
  ChoiceField,
} from "../kit";

/** Abbreviated Mental Test Score (Hodkinson 1972). */

/** Two or three short options side by side; starts unselected like ChoiceField. */

type Answer = "correct" | "incorrect";

const ANSWER: Choice<Answer>[] = [
  { value: "correct", label: "Correct (1)" },
  { value: "incorrect", label: "Incorrect (0)" },
];

const ITEMS = [
  { key: "age", label: "1. Age", hint: "States their own age correctly." },
  { key: "time", label: "2. Time", hint: "States the time to the nearest hour, with no clock or watch." },
  {
    key: "address_recall",
    label: "3. Address recall",
    hint: "Recalls, at the end of the test, an address given at the start (e.g. \"42 West Street\"). Score correct recall, not correct repetition when given.",
  },
  { key: "year", label: "4. Year", hint: "States the current year correctly." },
  {
    key: "place",
    label: "5. Place",
    hint: "Names the present place (e.g. the hospital or building) correctly.",
  },
  {
    key: "recognise_two_persons",
    label: "6. Recognition of two persons",
    hint: "Recognises two persons present (e.g. doctor and nurse, or relative and carer) - their role, not necessarily their name.",
  },
  { key: "date_of_birth", label: "7. Date of birth", hint: "States their date of birth correctly." },
  {
    key: "year_ww1",
    label: "8. Year World War I started",
    hint: "1914, or another agreed well-known date.",
  },
  {
    key: "monarch",
    label: "9. Present monarch",
    hint: "Names the present monarch or head of state correctly.",
  },
  {
    key: "count_backwards",
    label: "10. Count backwards from 20 to 1",
    hint: "Without error.",
  },
] as const;

type Key = (typeof ITEMS)[number]["key"];
type Answers = Record<Key, Answer | null>;

const unanswered = (): Answers =>
  Object.fromEntries(ITEMS.map((i) => [i.key, null])) as Answers;

function AmtsCalculator() {
  const [answers, setAnswers] = useState<Answers>(unanswered);

  const complete = ITEMS.every((i) => answers[i.key] !== null);
  const calc = useCalculation(
    "amts",
    complete ? Object.fromEntries(ITEMS.map((i) => [i.key, answers[i.key] === "correct"])) : null,
  );

  return (
    <CalculatorPage
      icon={IconMessageQuestion}
      title="AMTS"
      badge="Cognitive screen"
      description="Abbreviated Mental Test Score: a ten-item bedside screen for cognitive impairment in older patients (Hodkinson 1972). A score of 7 or less suggests impairment at the time of testing; it does not distinguish dementia from delirium."
      onReset={() => setAnswers(unanswered())}
      formTitle="Give the address at the start; ask for recall at the end"
      calc={calc}
      incomplete="Record an answer for all ten questions to calculate."
      form={
        <>
          {ITEMS.map((i) => (
            <ChoiceField layout="inline"
              key={i.key}
              label={i.label}
              hint={i.hint}
              value={answers[i.key]}
              onChange={(v) => setAnswers((prev) => ({ ...prev, [i.key]: v }))}
              options={ANSWER}
            />
          ))}
        </>
      }
      result={(r) => (
        <ScoreTile
          value={fmt(r.result)}
          outOf={10}
          badge={
            r.working.suggests_impairment === true
              ? "suggests cognitive impairment"
              : "not suggestive of impairment"
          }
        />
      )}
      summary={(r) => {
        const incorrect = ITEMS.filter((i) => answers[i.key] === "incorrect");
        return summaryText({
          heading: `AMTS ${fmt(r.result)} / 10 (${
            r.working.suggests_impairment === true
              ? "below the cut-off of 8"
              : "at or above the cut-off of 8"
          })`,
          interpretation: r.interpretation,
          findingsTitle: "Questions answered incorrectly",
          findings: incorrect.map((i) => i.label.replace(/^\d+\. /, "")),
          extra: [incorrect.length === 0 && "All ten questions answered correctly."],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "amts", Component: AmtsCalculator };
