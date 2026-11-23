// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, Text } from "@mantine/core";
import { IconMoodKid } from "@tabler/icons-react";

import {
  CalculatorPage,
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
  ChoiceField,
} from "../kit";

/** CHALICE paediatric head injury CT rule (Dunning 2006; NICE NG232). */

const HISTORY = [
  { key: "loss_of_consciousness_over_5_min", label: "Witnessed loss of consciousness over 5 minutes" },
  { key: "amnesia_over_5_min", label: "Amnesia (antegrade or retrograde) over 5 minutes" },
  { key: "abnormal_drowsiness", label: "Abnormal drowsiness", hint: "Beyond the level the examining doctor would expect." },
  { key: "vomiting_3_or_more", label: "3 or more discrete episodes of vomiting after the injury" },
  { key: "suspected_nai", label: "Suspicion of non-accidental injury" },
  { key: "seizure_no_epilepsy_history", label: "Seizure after the injury, with no history of epilepsy" },
] as const;

const EXAMINATION = [
  {
    key: "penetrating_or_depressed_skull_injury_or_tense_fontanelle",
    label: "Suspected penetrating or depressed skull injury, or tense fontanelle",
  },
  {
    key: "basal_skull_fracture_signs",
    label: "Signs of a basal skull fracture",
    hint: "e.g. CSF or blood from ear or nose, panda eyes, Battle's sign, haemotympanum.",
  },
  { key: "focal_neurology", label: "Positive focal neurology" },
  {
    key: "bruise_swelling_laceration_over_5cm",
    label: "Bruise, swelling, or laceration over 5 cm",
    hint: "Only a CHALICE criterion for infants under 1 year old.",
  },
] as const;

const MECHANISM = [
  { key: "high_speed_rta", label: "High-speed road traffic accident (over 40 mph)", hint: "As pedestrian, cyclist, or occupant." },
  { key: "fall_over_3m", label: "Fall of over 3 m in height" },
  { key: "high_speed_projectile", label: "High-speed injury from a projectile or object" },
] as const;

const ALL = [...HISTORY, ...EXAMINATION, ...MECHANISM];
type Key = (typeof ALL)[number]["key"];
type Criteria = Record<Key, boolean>;

type Gcs = "15" | "14" | "13_or_lower";
const GCS: Choice<Gcs>[] = [
  { value: "15", label: "15" },
  { value: "14", label: "14" },
  { value: "13_or_lower", label: "13 or lower" },
];

const AGE = { min: 0, max: 16 };
const noneTicked = (): Criteria => Object.fromEntries(ALL.map((c) => [c.key, false])) as Criteria;

/** Two to five short options in one row; starts unselected like ChoiceField. */

function CriteriaGroup({
  title,
  items,
  criteria,
  onChange,
}: {
  title: string;
  items: ReadonlyArray<{ key: Key; label: string; hint?: string }>;
  criteria: Criteria;
  onChange: (key: Key, checked: boolean) => void;
}) {
  return (
    <>
      <Text fw={600} mt="xs">
        {title}
      </Text>
      <Divider />
      {items.map((c) => (
        <YesNoField
          key={c.key}
          label={c.label}
          hint={c.hint}
          checked={criteria[c.key]}
          onChange={(checked) => onChange(c.key, checked)}
        />
      ))}
    </>
  );
}

function ChaliceCalculator() {
  const [age, setAge] = useState<number | null>(null);
  const [gcs, setGcs] = useState<Gcs | null>(null);
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);

  const set = (key: Key, checked: boolean) => setCriteria((prev) => ({ ...prev, [key]: checked }));

  const complete = inRange(age, AGE.min, AGE.max) && Number.isInteger(age) && gcs !== null;
  const calc = useCalculation(
    "chalice",
    complete
      ? {
          age_years: age,
          ...criteria,
          gcs_below_15: gcs !== "15",
          gcs_below_14: gcs === "13_or_lower",
        }
      : null,
  );

  const positiveLabels = (r: { working: Record<string, unknown> }): string[] =>
    Array.isArray(r.working.positive_criteria)
      ? (r.working.positive_criteria as Array<{ label?: unknown }>).map((c) => asText(c.label)).filter(Boolean)
      : [];

  return (
    <CalculatorPage
      icon={IconMoodKid}
      title="CHALICE"
      badge="Paediatric head injury"
      description="Decision rule for CT head in children with a head injury: any one positive criterion predicts a clinically significant intracranial injury and CT is recommended (Dunning 2006; reflected in NICE head injury guidance)."
      onReset={() => {
        setAge(null);
        setGcs(null);
        setCriteria(noneTicked());
      }}
      calc={calc}
      incomplete="Enter age and the current GCS to calculate."
      form={
        <>
          <NumberField
            label="Age"
            hint="Completed years; enter 0 for under 1 year old. Two criteria change below age 1."
            unit="years"
            value={age}
            onChange={setAge}
            min={AGE.min}
            max={AGE.max}
            decimals={0}
          />
          <ChoiceField layout="inline"
            label="Glasgow Coma Scale"
            hint="Criterion is GCS below 14, or below 15 for infants under 1 year old."
            value={gcs}
            onChange={setGcs}
            options={GCS}
          />
          <CriteriaGroup title="History" items={HISTORY} criteria={criteria} onChange={set} />
          <CriteriaGroup title="Examination" items={EXAMINATION} criteria={criteria} onChange={set} />
          <CriteriaGroup title="Mechanism" items={MECHANISM} criteria={criteria} onChange={set} />
        </>
      }
      result={(r) => {
        const ct = r.working.ct_recommended === true;
        return (
          <ScoreTile
            value={fmt(r.working.positive_count)}
            unit={r.working.positive_count === 1 ? "criterion positive" : "criteria positive"}
            colour={ct ? "red" : "teal"}
            badge={ct ? "CT head recommended" : "CT not indicated"}
          />
        );
      }}
      summary={(r) => {
        const ct = r.working.ct_recommended === true;
        return summaryText({
          heading: `CHALICE: ${ct ? "CT head recommended" : "CT not indicated"} (${fmt(r.working.positive_count)} criteria positive)`,
          interpretation: r.interpretation,
          findingsTitle: "Positive criteria",
          findings: positiveLabels(r),
          extra: [`Age ${age === 0 ? "under 1 year" : `${age} years`}; GCS ${gcs === "13_or_lower" ? "13 or lower" : gcs}`],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "chalice", Component: ChaliceCalculator };
