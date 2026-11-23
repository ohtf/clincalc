// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid } from "@mantine/core";
import { IconPill } from "@tabler/icons-react";

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

/** Clinical Opiate Withdrawal Scale (Wesson and Ling 2003). */

const CONTEXT = "clinician_assessment_of_current_possible_opioid_withdrawal";

const CONTEXT_OPTIONS: Choice<typeof CONTEXT>[] = [
  {
    value: CONTEXT,
    label: "Clinician assessment of current possible opioid withdrawal",
    hint: "Rate each finding only for its apparent relationship to opioid withdrawal. The score does not establish tolerance or that a medication is safe to give.",
  },
];

const ITEMS: Array<{ key: string; label: string; hint?: string; options: [number, string][] }> = [
  {
    key: "sweating",
    label: "Sweating",
    hint: "Over the past 30 minutes, excluding room temperature or activity.",
    options: [
      [0, "None"],
      [1, "Subjective chills or flushing"],
      [2, "Flushed or observable facial moisture"],
      [3, "Beads of sweat on brow or face"],
      [4, "Sweat streaming off face"],
    ],
  },
  {
    key: "restlessness",
    label: "Restlessness",
    hint: "During the assessment.",
    options: [
      [0, "Sits still"],
      [1, "Reports difficulty sitting still, but can do so"],
      [3, "Frequent shifting or extraneous limb movement"],
      [5, "Cannot sit still for more than a few seconds"],
    ],
  },
  {
    key: "pupil_size",
    label: "Pupil size",
    hint: "For room light.",
    options: [
      [0, "Pinned or normal size"],
      [1, "Possibly larger than normal"],
      [2, "Moderately dilated"],
      [5, "Only the rim of the iris visible"],
    ],
  },
  {
    key: "bone_or_joint_aches",
    label: "Bone or joint aches",
    hint: "Only the additional aching attributable to withdrawal.",
    options: [
      [0, "Absent"],
      [1, "Mild diffuse discomfort"],
      [2, "Severe diffuse joint or muscle ache reported"],
      [4, "Rubbing joints or muscles and unable to sit still"],
    ],
  },
  {
    key: "runny_nose_or_tearing",
    label: "Runny nose or tearing",
    hint: "Not explained by a cold or allergy.",
    options: [
      [0, "Absent"],
      [1, "Nasal stuffiness or unusually moist eyes"],
      [2, "Nose running or tearing"],
      [4, "Nose constantly running or tears streaming"],
    ],
  },
  {
    key: "gastrointestinal_upset",
    label: "Gastrointestinal upset",
    hint: "Over the past 30 minutes.",
    options: [
      [0, "None"],
      [1, "Stomach cramps"],
      [2, "Nausea or loose stool"],
      [3, "Vomiting or diarrhoea"],
      [5, "Multiple episodes of vomiting or diarrhoea"],
    ],
  },
  {
    key: "tremor",
    label: "Tremor",
    hint: "With hands outstretched.",
    options: [
      [0, "None"],
      [1, "Felt but not observed"],
      [2, "Slight tremor observable"],
      [4, "Gross tremor or muscle twitching"],
    ],
  },
  {
    key: "yawning",
    label: "Yawning",
    hint: "During the assessment.",
    options: [
      [0, "None"],
      [1, "Once or twice"],
      [2, "Three or more times"],
      [4, "Several times per minute"],
    ],
  },
  {
    key: "anxiety_or_irritability",
    label: "Anxiety or irritability",
    options: [
      [0, "None"],
      [1, "Reports increasing irritability or anxiety"],
      [2, "Obviously irritable or anxious"],
      [4, "So irritable or anxious that participation is difficult"],
    ],
  },
  {
    key: "gooseflesh_skin",
    label: "Gooseflesh skin",
    options: [
      [0, "Smooth skin"],
      [3, "Piloerection can be felt, or hairs standing up on arms"],
      [5, "Prominent piloerection"],
    ],
  },
];

type Ratings = Record<string, number | null>;
const unrated = (): Ratings => Object.fromEntries(ITEMS.map((i) => [i.key, null]));

const choices = (options: [number, string][]): Choice<string>[] =>
  options.map(([points, text]) => ({ value: String(points), label: `${text} (${points})` }));

const PULSE = { min: 1, max: 300 };

const BAND_LABEL: Record<string, string> = {
  below_mild_threshold: "below mild threshold",
  mild: "mild",
  moderate: "moderate",
  moderately_severe: "moderately severe",
  severe: "severe",
};
const BAND_COLOUR: Record<string, string> = {
  below_mild_threshold: "teal",
  mild: "lime",
  moderate: "yellow",
  moderately_severe: "orange",
  severe: "red",
};

const optionText = (key: string, points: number | null) =>
  ITEMS.find((i) => i.key === key)?.options.find(([p]) => p === points)?.[1] ?? "";

function CowsCalculator() {
  const [context, setContext] = useState<typeof CONTEXT | null>(null);
  const [pulse, setPulse] = useState<number | null>(null);
  const [ratings, setRatings] = useState<Ratings>(unrated);

  const complete =
    context !== null &&
    inRange(pulse, PULSE.min, PULSE.max) &&
    Number.isInteger(pulse) &&
    ITEMS.every((i) => ratings[i.key] !== null);
  const calc = useCalculation(
    "cows",
    complete ? { assessment_context: context, resting_pulse_rate_bpm: pulse, ...ratings } : null,
  );

  return (
    <CalculatorPage
      icon={IconPill}
      title="COWS"
      badge="Opioid withdrawal"
      description="Clinical Opiate Withdrawal Scale: the severity of current signs and symptoms apparently attributable to opioid withdrawal, scored 0-48 (Wesson and Ling 2003). It does not diagnose withdrawal or determine medication timing or dose."
      onReset={() => {
        setContext(null);
        setPulse(null);
        setRatings(unrated());
      }}
      calc={calc}
      incomplete="Confirm the assessment context, enter the resting pulse, and rate all ten items to calculate."
      form={
        <>
          <ChoiceField
            label="Assessment context"
            value={context}
            onChange={setContext}
            options={CONTEXT_OPTIONS}
          />
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Resting pulse rate"
              hint="After sitting or lying for at least one minute. 80 or under 0; 81-100 1; 101-120 2; over 120 4."
              unit="beats/min"
              value={pulse}
              onChange={setPulse}
              min={PULSE.min}
              max={PULSE.max}
              decimals={0}
            />
          </SimpleGrid>
          {ITEMS.map((i) => (
            <ChoiceField
              key={i.key}
              label={i.label}
              hint={i.hint}
              value={ratings[i.key] === null ? null : String(ratings[i.key])}
              onChange={(v) => setRatings((prev) => ({ ...prev, [i.key]: Number(v) }))}
              options={choices(i.options)}
            />
          ))}
        </>
      }
      result={(r) => {
        const band = asText(r.working.severity_band);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={48}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={BAND_LABEL[band] ?? band}
          />
        );
      }}
      details={(r) => (
        <Facts
          title="Points"
          items={[
            ["Resting pulse", fmt(r.working.resting_pulse_rate_points)],
            ...ITEMS.map((i): [string, string] => [i.label, fmt(r.working[i.key])]),
          ]}
        />
      )}
      summary={(r) => {
        const band = asText(r.working.severity_band);
        return summaryText({
          heading: `COWS ${fmt(r.result)} / 48 (${BAND_LABEL[band] ?? band})`,
          interpretation: r.interpretation,
          findingsTitle: "Items",
          findings: [
            `Resting pulse ${pulse} beats/min (${fmt(r.working.resting_pulse_rate_points)})`,
            ...ITEMS.map(
              (i) => `${i.label}: ${optionText(i.key, ratings[i.key])} (${ratings[i.key]})`,
            ),
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "cows", Component: CowsCalculator };
