// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Group, Radio } from "@mantine/core";
import { IconBottle } from "@tabler/icons-react";

import {
  CalculatorPage,
  ScoreTile,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** CAGE questionnaire for alcohol misuse (Ewing 1984). */

type YesNo = "no" | "yes";

const QUESTIONS = [
  { key: "cut_down", label: "Cut down", text: "Ever felt you should cut down on your drinking?" },
  {
    key: "annoyed",
    label: "Annoyed",
    text: "Have people annoyed you by criticising your drinking?",
  },
  { key: "guilty", label: "Guilty", text: "Have you ever felt bad or guilty about your drinking?" },
  {
    key: "eye_opener",
    label: "Eye-opener",
    text: "Ever had a drink first thing in the morning (eye-opener) to steady your nerves or get rid of a hangover?",
  },
] as const;

type Key = (typeof QUESTIONS)[number]["key"];
type Answers = Record<Key, YesNo | null>;

const OPTIONS: Choice<YesNo>[] = [
  { value: "no", label: "No (0)" },
  { value: "yes", label: "Yes (1)" },
];

const blank = (): Answers => Object.fromEntries(QUESTIONS.map((q) => [q.key, null])) as Answers;

function CageCalculator() {
  const [answers, setAnswers] = useState<Answers>(blank);

  const complete = QUESTIONS.every((q) => answers[q.key] !== null);
  const calc = useCalculation(
    "cage",
    complete ? Object.fromEntries(QUESTIONS.map((q) => [q.key, answers[q.key] === "yes"])) : null,
  );

  return (
    <CalculatorPage
      icon={IconBottle}
      title="CAGE"
      badge="Alcohol misuse screen"
      description="Four-question screen for alcohol misuse (Ewing 1984). A score of 2 or more out of 4 is a positive screen, which warrants a fuller history rather than a diagnosis."
      onReset={() => setAnswers(blank())}
      calc={calc}
      incomplete="Answer all four questions to calculate."
      form={
        <>
          {QUESTIONS.map((q) => (
            <Radio.Group
              key={q.key}
              label={`${q.label}: ${q.text}`}
              value={answers[q.key]}
              onChange={(v) => setAnswers((prev) => ({ ...prev, [q.key]: v as YesNo }))}
            >
              <Group gap="xl" mt={6}>
                {OPTIONS.map((o) => (
                  <Radio key={o.value} value={o.value} label={o.label} />
                ))}
              </Group>
            </Radio.Group>
          ))}
        </>
      }
      result={(r) => {
        const positive = r.working.likely_problem_drinking === true;
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={4}
            colour={positive ? "orange" : "teal"}
            badge={positive ? "Positive screen" : "Negative screen"}
          />
        );
      }}
      summary={(r) => {
        const yes = QUESTIONS.filter((q) => answers[q.key] === "yes");
        return summaryText({
          heading: `CAGE ${fmt(r.result)} / 4 (${r.working.likely_problem_drinking === true ? "positive" : "negative"} screen)`,
          interpretation: r.interpretation,
          findingsTitle: "Answered yes",
          findings: yes.map((q) => `${q.label}: ${q.text}`),
          extra: [yes.length === 0 && "Answered no to all four questions."],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "cage", Component: CageCalculator };
