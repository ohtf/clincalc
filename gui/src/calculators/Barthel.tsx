// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconWheelchair } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  ScoreTile,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Barthel Index of activities of daily living (Mahoney and Barthel 1965). */

const BOWELS_BLADDER: Choice<string>[] = [
  { value: "incontinent", label: "Incontinent (0)" },
  { value: "occasional_accident", label: "Occasional accident (5)" },
  { value: "continent", label: "Continent (10)" },
];

const DOMAINS = [
  {
    key: "feeding",
    label: "Feeding",
    options: [
      { value: "unable", label: "Unable (0)" },
      { value: "needs_help", label: "Needs help (5)" },
      { value: "independent", label: "Independent (10)" },
    ],
  },
  {
    key: "bathing",
    label: "Bathing",
    options: [
      { value: "dependent", label: "Dependent (0)" },
      { value: "independent", label: "Independent (5)" },
    ],
  },
  {
    key: "grooming",
    label: "Grooming",
    options: [
      { value: "needs_help", label: "Needs help (0)" },
      { value: "independent", label: "Independent (5)" },
    ],
  },
  {
    key: "dressing",
    label: "Dressing",
    options: [
      { value: "dependent", label: "Dependent (0)" },
      { value: "needs_help", label: "Needs help (5)" },
      { value: "independent", label: "Independent (10)" },
    ],
  },
  { key: "bowels", label: "Bowels", options: BOWELS_BLADDER },
  { key: "bladder", label: "Bladder", options: BOWELS_BLADDER },
  {
    key: "toilet_use",
    label: "Toilet use",
    options: [
      { value: "dependent", label: "Dependent (0)" },
      { value: "needs_help", label: "Needs help (5)" },
      { value: "independent", label: "Independent (10)" },
    ],
  },
  {
    key: "transfers",
    label: "Transfers",
    options: [
      { value: "unable", label: "Unable (0)" },
      { value: "major_help", label: "Major help (5)" },
      { value: "minor_help", label: "Minor help (10)" },
      { value: "independent", label: "Independent (15)" },
    ],
  },
  {
    key: "mobility",
    label: "Mobility",
    options: [
      { value: "immobile", label: "Immobile (0)" },
      { value: "wheelchair_independent", label: "Wheelchair independent (5)" },
      { value: "walks_with_help", label: "Walks with help (10)" },
      { value: "independent", label: "Independent (15)" },
    ],
  },
  {
    key: "stairs",
    label: "Stairs",
    options: [
      { value: "unable", label: "Unable (0)" },
      { value: "needs_help", label: "Needs help (5)" },
      { value: "independent", label: "Independent (10)" },
    ],
  },
] as const satisfies ReadonlyArray<{ key: string; label: string; options: readonly Choice<string>[] }>;

type Key = (typeof DOMAINS)[number]["key"];
type Answers = Record<Key, string | null>;

const unanswered = (): Answers =>
  Object.fromEntries(DOMAINS.map((d) => [d.key, null])) as Answers;

const labelOf = (options: readonly Choice<string>[], value: string | null) =>
  options.find((o) => o.value === value)?.label ?? "";

function BarthelCalculator() {
  const [answers, setAnswers] = useState<Answers>(unanswered);

  const complete = DOMAINS.every((d) => answers[d.key] !== null);
  const calc = useCalculation("barthel", complete ? answers : null);

  return (
    <CalculatorPage
      icon={IconWheelchair}
      title="Barthel Index"
      badge="Activities of daily living"
      description="Observed function in ten basic activities of daily living, scored 0-100 (Mahoney and Barthel 1965). It measures what the patient does, not a diagnosis."
      onReset={() => setAnswers(unanswered())}
      formTitle="Record what the patient actually does"
      calc={calc}
      incomplete="Answer all ten activities to calculate."
      form={
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" verticalSpacing="lg">
          {DOMAINS.map((d) => (
            <ChoiceField
              key={d.key}
              label={d.label}
              value={answers[d.key]}
              onChange={(v) => setAnswers((prev) => ({ ...prev, [d.key]: v }))}
              options={[...d.options]}
            />
          ))}
        </SimpleGrid>
      }
      result={(r) => <ScoreTile value={fmt(r.result)} outOf={100} badge={String(r.working.band ?? "")} />}
      details={(r) => (
        <Facts
          title="Points"
          items={DOMAINS.map((d) => [d.label, fmt(r.working[d.key])])}
        />
      )}
      summary={(r) => {
        const band = String(r.working.band ?? "");
        return summaryText({
          heading: `Barthel Index ${fmt(r.result)} / 100${band ? ` (${band})` : ""}`,
          interpretation: r.interpretation,
          findingsTitle: "Activities",
          findings: DOMAINS.map(
            (d) => `${d.label}: ${labelOf(d.options, answers[d.key])}`,
          ),
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "barthel", Component: BarthelCalculator };
