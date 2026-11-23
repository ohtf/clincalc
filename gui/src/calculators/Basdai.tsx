// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid, Text } from "@mantine/core";
import { IconWalk } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asNumber,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** Bath Ankylosing Spondylitis Disease Activity Index (Garrett 1994). */

const ITEMS = [
  { key: "fatigue", label: "Fatigue / tiredness" },
  { key: "spinal_pain", label: "Neck, back, or hip pain" },
  { key: "peripheral_joint_pain_swelling", label: "Peripheral joint pain / swelling" },
  { key: "enthesitis", label: "Areas tender to touch or pressure" },
  { key: "morning_stiffness_severity", label: "Morning stiffness severity" },
  { key: "morning_stiffness_duration", label: "Morning stiffness duration" },
] as const;

type Key = (typeof ITEMS)[number]["key"];
type Answers = Record<Key, number | null>;

const SCALE = { min: 0, max: 10 };

const empty = (): Answers => Object.fromEntries(ITEMS.map((i) => [i.key, null])) as Answers;

function BasdaiCalculator() {
  const [answers, setAnswers] = useState<Answers>(empty);

  const complete = ITEMS.every((i) => inRange(answers[i.key], SCALE.min, SCALE.max));
  const calc = useCalculation("basdai", complete ? answers : null);

  return (
    <CalculatorPage
      icon={IconWalk}
      title="BASDAI"
      badge="Axial spondyloarthritis"
      description="Bath Ankylosing Spondylitis Disease Activity Index (0-10): the mean of fatigue, spinal pain, peripheral joint pain/swelling, enthesitis, and the average of the two morning-stiffness items (Garrett 1994)."
      onReset={() => setAnswers(empty())}
      formTitle="Patient ratings, each 0 to 10"
      calc={calc}
      incomplete="Enter all six ratings to calculate."
      form={
        <>
          <Text size="xs" c="dimmed">
            The two morning-stiffness items are averaged into one component before the mean is
            taken.
          </Text>
          <SimpleGrid cols={2} spacing="md">
            {ITEMS.map((i) => (
              <NumberField
                key={i.key}
                label={i.label}
                unit="/ 10"
                value={answers[i.key]}
                onChange={(v) => setAnswers((prev) => ({ ...prev, [i.key]: v }))}
                min={SCALE.min}
                max={SCALE.max}
                decimals={1}
              />
            ))}
          </SimpleGrid>
        </>
      }
      result={(r) => {
        const score = asNumber(r.result);
        const threshold = asNumber(r.working.active_disease_threshold);
        const met = score !== null && threshold !== null && score >= threshold;
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={10}
            badge={
              threshold !== null
                ? met
                  ? `at or above ${fmt(threshold)}`
                  : `below ${fmt(threshold)}`
                : undefined
            }
          />
        );
      }}
      details={(r) => (
        <Facts
          items={[
            ["Morning stiffness component", fmt(r.working.morning_stiffness_component)],
            ["Active-disease threshold", fmt(r.working.active_disease_threshold)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `BASDAI ${fmt(r.result)} / 10`,
          interpretation: r.interpretation,
          findingsTitle: "Ratings (0-10)",
          findings: ITEMS.map((i) => `${i.label}: ${answers[i.key]}`),
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "basdai", Component: BasdaiCalculator };
