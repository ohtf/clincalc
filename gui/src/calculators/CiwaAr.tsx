// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, Group, Radio } from "@mantine/core";
import { IconBottle } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** CIWA-Ar alcohol withdrawal severity (Sullivan 1989; ASAM 2020 bands). */

const CONTEXT = "clinically_identified_alcohol_withdrawal_with_reliable_patient_participation";

const CONTEXT_OPTIONS: Choice<typeof CONTEXT>[] = [
  {
    value: CONTEXT,
    label: "Alcohol withdrawal is clinically identified and the patient can participate reliably",
    hint: "Not for diagnosis. Do not use where delirium, dementia, psychosis, intubation, severe cognitive impairment, or a mechanical or unmanaged language barrier prevents reliable answers.",
  },
];

const ITEMS = [
  {
    key: "nausea_and_vomiting",
    label: "Nausea and vomiting",
    max: 7,
    hint: "0 none; 1 mild nausea without vomiting; 4 intermittent nausea with dry heaves; 7 constant nausea with frequent dry heaves and vomiting.",
  },
  {
    key: "tremor",
    label: "Tremor",
    max: 7,
    hint: "Arms extended and fingers spread. 0 none; 1 felt fingertip-to-fingertip but not visible; 4 moderate with arms extended; 7 severe even without extension.",
  },
  {
    key: "paroxysmal_sweats",
    label: "Paroxysmal sweats",
    max: 7,
    hint: "0 none visible; 1 barely perceptible, palms moist; 4 beads obvious on forehead; 7 drenching sweats.",
  },
  {
    key: "anxiety",
    label: "Anxiety",
    max: 7,
    hint: "0 at ease; 1 mildly anxious; 4 moderately anxious or guarded so anxiety is inferred; 7 equivalent to an acute panic state.",
  },
  {
    key: "agitation",
    label: "Agitation",
    max: 7,
    hint: "0 normal activity; 1 somewhat increased; 4 moderately fidgety and restless; 7 pacing most of the interview or constantly thrashing.",
  },
  {
    key: "tactile_disturbances",
    label: "Tactile disturbances",
    max: 7,
    hint: "From none through increasing itching, pins-and-needles, burning, numbness, or tactile hallucinations; 4 moderately severe hallucinations; 7 continuous hallucinations.",
  },
  {
    key: "auditory_disturbances",
    label: "Auditory disturbances",
    max: 7,
    hint: "From none through increasing harshness or frightening sounds, or auditory hallucinations; 4 moderately severe hallucinations; 7 continuous hallucinations.",
  },
  {
    key: "visual_disturbances",
    label: "Visual disturbances",
    max: 7,
    hint: "From none through increasing light sensitivity, visual disturbance, or hallucinations; 4 moderately severe hallucinations; 7 continuous hallucinations.",
  },
  {
    key: "headache_or_fullness",
    label: "Headache or fullness",
    max: 7,
    hint: "Severity from absent to extremely severe, excluding dizziness or light-headedness.",
  },
  {
    key: "orientation_and_clouding",
    label: "Orientation and clouding",
    max: 4,
    hint: "0 oriented and can do serial additions; 1 cannot do additions or uncertain date; 2 date error no more than 2 days; 3 date error over 2 days; 4 disoriented to place or person.",
  },
] as const;

type Key = (typeof ITEMS)[number]["key"];
type Ratings = Record<Key, number | null>;

const unrated = (): Ratings => Object.fromEntries(ITEMS.map((i) => [i.key, null])) as Ratings;

/** A 0-max rating as a single row of radios (compact, unlike one option per line). */
function RatingField({
  label,
  hint,
  max,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  max: number;
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <Radio.Group
      label={label}
      description={hint}
      value={value === null ? null : String(value)}
      onChange={(v) => onChange(Number(v))}
    >
      <Group gap="sm" mt={8}>
        {Array.from({ length: max + 1 }, (_, n) => (
          <Radio key={n} value={String(n)} label={String(n)} />
        ))}
      </Group>
    </Radio.Group>
  );
}

const BAND_COLOUR: Record<string, string> = { mild: "teal", moderate: "yellow", severe: "red" };

function CiwaArCalculator() {
  const [context, setContext] = useState<typeof CONTEXT | null>(null);
  const [ratings, setRatings] = useState<Ratings>(unrated);

  const complete = context !== null && ITEMS.every((i) => ratings[i.key] !== null);
  const calc = useCalculation(
    "ciwa_ar",
    complete ? { assessment_context: context, ...ratings } : null,
  );

  return (
    <CalculatorPage
      icon={IconBottle}
      title="CIWA-Ar"
      badge="Alcohol withdrawal"
      description="Current severity of clinically identified alcohol withdrawal from ten clinician ratings, scored 0-67 (Sullivan 1989; severity ranges from the ASAM 2020 guideline). Not a diagnostic test or a prescribing protocol."
      onReset={() => {
        setContext(null);
        setRatings(unrated());
      }}
      calc={calc}
      incomplete="Confirm the assessment context and rate all ten items to calculate."
      form={
        <>
          <ChoiceField
            label="Assessment context"
            value={context}
            onChange={setContext}
            options={CONTEXT_OPTIONS}
          />
          <Divider />
          {ITEMS.map((i) => (
            <RatingField
              key={i.key}
              label={`${i.label} (0-${i.max})`}
              hint={i.hint}
              max={i.max}
              value={ratings[i.key]}
              onChange={(v) => setRatings((prev) => ({ ...prev, [i.key]: v }))}
            />
          ))}
        </>
      }
      result={(r) => {
        const band = asText(r.working.severity_band);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={67}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={band && `${band} range`}
          />
        );
      }}
      details={(r) => (
        <Facts
          title="Item ratings"
          items={ITEMS.map((i) => [i.label, `${fmt(r.working[i.key])} / ${i.max}`])}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `CIWA-Ar ${fmt(r.result)} / 67 (${asText(r.working.severity_band)} withdrawal-severity range)`,
          interpretation: r.interpretation,
          findingsTitle: "Item ratings",
          findings: ITEMS.map((i) => `${i.label}: ${ratings[i.key]} / ${i.max}`),
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "ciwa_ar", Component: CiwaArCalculator };
