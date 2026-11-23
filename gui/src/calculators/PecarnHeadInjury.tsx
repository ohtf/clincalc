// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, Text } from "@mantine/core";
import { IconMoodKid } from "@tabler/icons-react";

import {
  CalculatorPage,
  ScoreTile,
  YesNoField,
  asText,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
  ChoiceField,
} from "../kit";

/** PECARN paediatric head injury rule, age-stratified (Kuppermann 2009). */

type AgeBand = "under_2" | "2_or_over";
const AGE_BANDS: Choice<AgeBand>[] = [
  { value: "under_2", label: "Under 2 years" },
  { value: "2_or_over", label: "2 years or older" },
];

interface Criterion {
  key: string;
  label: string;
  hint?: string;
}

const GCS: Criterion = {
  key: "gcs_14_or_less",
  label: "GCS 14 or less",
  hint: "The rule was derived in children with GCS 14-15; GCS below 14 is outside the validated population.",
};
const AMS: Criterion = {
  key: "altered_mental_status",
  label: "Altered mental status",
  hint: "Agitation, somnolence, repetitive questioning, or slow response to verbal communication.",
};
const SEVERE_MECHANISM = (under2: boolean): Criterion => ({
  key: "severe_mechanism",
  label: "Severe mechanism of injury",
  hint: `Pedestrian or cyclist without helmet struck by a motorised vehicle, fall of more than ${under2 ? "3 ft (1 m)" : "5 ft (2 m)"}, or head struck by a high-impact object.`,
});

const BRANCHES: Record<AgeBand, { high: Criterion[]; intermediate: Criterion[] }> = {
  under_2: {
    high: [GCS, AMS, { key: "palpable_skull_fracture", label: "Palpable skull fracture" }],
    intermediate: [
      { key: "non_frontal_scalp_hematoma", label: "Non-frontal scalp haematoma" },
      { key: "loc_5_seconds_or_more", label: "Loss of consciousness for 5 seconds or more" },
      SEVERE_MECHANISM(true),
      { key: "abnormal_behavior_per_parent", label: "Abnormal behaviour, according to the parent" },
    ],
  },
  "2_or_over": {
    high: [GCS, AMS, { key: "signs_of_basilar_skull_fracture", label: "Signs of basilar skull fracture" }],
    intermediate: [
      { key: "history_of_vomiting", label: "History of vomiting" },
      { key: "loc_any_duration", label: "Any loss of consciousness" },
      SEVERE_MECHANISM(false),
      { key: "severe_headache", label: "Severe headache" },
    ],
  },
};

const RISK_COLOUR: Record<string, string> = { high: "red", intermediate: "yellow", low: "teal" };
const RISK_LABEL: Record<string, string> = { high: "High", intermediate: "Intermediate", low: "Low" };

/** Two to five short options in one row; starts unselected like ChoiceField. */

function PecarnHeadInjuryCalculator() {
  const [ageBand, setAgeBand] = useState<AgeBand | null>(null);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});

  const branch = ageBand ? BRANCHES[ageBand] : null;
  const criteria = branch ? [...branch.high, ...branch.intermediate] : [];

  const calc = useCalculation(
    "pecarn_head_injury",
    ageBand
      ? {
          age_under_2: ageBand === "under_2",
          ...Object.fromEntries(criteria.map((c) => [c.key, ticked[c.key] ?? false])),
        }
      : null,
  );

  const field = (c: Criterion) => (
    <YesNoField
      key={c.key}
      label={c.label}
      hint={c.hint}
      checked={ticked[c.key] ?? false}
      onChange={(checked) => setTicked((prev) => ({ ...prev, [c.key]: checked }))}
    />
  );

  return (
    <CalculatorPage
      icon={IconMoodKid}
      title="PECARN head injury"
      badge="Paediatric head injury"
      description="Age-stratified rule for selective CT after minor blunt head trauma in children with GCS 14-15 presenting within 24 hours (Kuppermann 2009). Not for penetrating trauma, known brain tumour, or a pre-existing neurological disorder complicating assessment."
      onReset={() => {
        setAgeBand(null);
        setTicked({});
      }}
      calc={calc}
      incomplete="Choose the age group to calculate."
      form={
        <>
          <ChoiceField layout="inline"
            label="Age group"
            hint="The criteria differ between the two age groups."
            value={ageBand}
            onChange={(v) => {
              setAgeBand(v);
              setTicked({});
            }}
            options={AGE_BANDS}
          />
          {branch && (
            <>
              <Text fw={600} mt="xs">
                High-risk findings
              </Text>
              <Divider />
              {branch.high.map(field)}
              <Text fw={600} mt="xs">
                Intermediate-risk findings
              </Text>
              <Divider />
              {branch.intermediate.map(field)}
            </>
          )}
        </>
      }
      result={(r) => {
        const risk = asText(r.result);
        return (
          <ScoreTile
            value={RISK_LABEL[risk] ?? risk}
            unit="risk"
            colour={RISK_COLOUR[risk] ?? "teal"}
            badge={ageBand === "under_2" ? "Under 2 years" : "2 years or older"}
          />
        );
      }}
      summary={(r) => {
        const risk = asText(r.result);
        const present = criteria.filter((c) => ticked[c.key]).map((c) => c.label);
        return summaryText({
          heading: `PECARN head injury (${ageBand === "under_2" ? "under 2 years" : "2 years or older"}): ${(RISK_LABEL[risk] ?? risk).toLowerCase()} risk`,
          interpretation: r.interpretation,
          findingsTitle: "Findings present",
          findings: present.length > 0 ? present : ["None of the PECARN findings"],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "pecarn_head_injury", Component: PecarnHeadInjuryCalculator };
