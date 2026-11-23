// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Badge, Divider, Group, Text, Title } from "@mantine/core";
import { IconBone } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  YesNoField,
  asText,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Canadian C-Spine Rule for cervical-spine radiography after blunt trauma (Stiell 2001). */

type HighKey = "age_65_or_over" | "dangerous_mechanism" | "paresthesias_in_extremities";
type LowKey =
  | "simple_rear_end_mvc"
  | "sitting_position_in_ed"
  | "ambulatory_at_any_time_since_injury"
  | "delayed_onset_of_neck_pain"
  | "absence_of_midline_cspine_tenderness";
type Key = HighKey | LowKey;
type Rotation = "able" | "unable";

const HIGH_RISK: Array<{ key: HighKey; label: string; hint?: string }> = [
  { key: "age_65_or_over", label: "Age 65 or over" },
  {
    key: "dangerous_mechanism",
    label: "Dangerous mechanism",
    hint: "Fall from 3 feet / 5 stairs or more; axial load to the head (e.g. diving); high-speed (over 100 km/h) motor vehicle collision, rollover, or ejection; motorised recreational vehicle; or bicycle collision.",
  },
  { key: "paresthesias_in_extremities", label: "Paraesthesias in the extremities" },
];

const LOW_RISK: Array<{ key: LowKey; label: string; hint?: string }> = [
  {
    key: "simple_rear_end_mvc",
    label: "Simple rear-end motor vehicle collision",
    hint: "Excludes being pushed into oncoming traffic, hit by a bus or large truck, rollover, or hit by a high-speed vehicle.",
  },
  { key: "sitting_position_in_ed", label: "Sitting position in the emergency department" },
  { key: "ambulatory_at_any_time_since_injury", label: "Ambulatory at any time since the injury" },
  { key: "delayed_onset_of_neck_pain", label: "Delayed (not immediate) onset of neck pain" },
  { key: "absence_of_midline_cspine_tenderness", label: "No midline cervical-spine tenderness" },
];

const ROTATION: Choice<Rotation>[] = [
  { value: "able", label: "Able to rotate 45 degrees left and right" },
  { value: "unable", label: "Unable to rotate 45 degrees left and right" },
];

type Criteria = Record<Key, boolean>;
const noneTicked = (): Criteria =>
  Object.fromEntries([...HIGH_RISK, ...LOW_RISK].map((c) => [c.key, false])) as Criteria;

const OUTCOME_BADGE: Record<string, string> = {
  high_risk: "High-risk factor present",
  no_low_risk_factor: "No low-risk factor",
  low_risk_unable_to_rotate: "Unable to rotate neck",
  low_risk_able_to_rotate: "Able to rotate neck",
};

function Decision({ text, badge }: { text: string; badge?: string }) {
  return (
    <Group justify="space-between" align="center" gap="xs" wrap="wrap">
      <Title order={2} c="teal">
        {text}
      </Title>
      {badge && (
        <Badge color="teal" variant="light" size="lg">
          {badge}
        </Badge>
      )}
    </Group>
  );
}

const decisionText = (result: unknown) =>
  result === true ? "Radiography recommended" : "Radiography not required by the rule";

function CanadianCspineCalculator() {
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);
  const [rotation, setRotation] = useState<Rotation | null>(null);

  const anyHigh = HIGH_RISK.some((c) => criteria[c.key]);
  const anyLow = LOW_RISK.some((c) => criteria[c.key]);
  const step3 = !anyHigh && anyLow;

  const complete = !step3 || rotation !== null;
  const calc = useCalculation(
    "canadian_cspine",
    complete
      ? {
          ...criteria,
          ...(step3 ? { able_to_actively_rotate_neck_45_degrees: rotation === "able" } : {}),
        }
      : null,
  );

  const toggle = (key: Key) => (checked: boolean) =>
    setCriteria((prev) => ({ ...prev, [key]: checked }));

  return (
    <CalculatorPage
      icon={IconBone}
      title="Canadian C-Spine Rule"
      badge="Blunt neck trauma"
      description="Three-step rule for cervical-spine radiography in alert (GCS 15), haemodynamically stable patients after blunt trauma (Stiell 2001)."
      onReset={() => {
        setCriteria(noneTicked());
        setRotation(null);
      }}
      calc={calc}
      incomplete="No high-risk factor and at least one low-risk factor: assess active neck rotation (step 3) to complete the rule."
      form={
        <>
          <Text fw={600}>Step 1 - any high-risk factor mandates radiography</Text>
          {HIGH_RISK.map((c) => (
            <YesNoField
              key={c.key}
              label={c.label}
              hint={c.hint}
              checked={criteria[c.key]}
              onChange={toggle(c.key)}
            />
          ))}
          <Divider />
          <Text fw={600}>Step 2 - any low-risk factor allows safe assessment of range of motion</Text>
          {LOW_RISK.map((c) => (
            <YesNoField
              key={c.key}
              label={c.label}
              hint={c.hint}
              checked={criteria[c.key]}
              onChange={toggle(c.key)}
            />
          ))}
          <Divider />
          <Text fw={600}>Step 3 - active range of motion</Text>
          {step3 ? (
            <ChoiceField
              label="Can the patient actively rotate the neck 45 degrees left and right?"
              hint="Regardless of pain."
              value={rotation}
              onChange={setRotation}
              options={ROTATION}
            />
          ) : (
            <Text size="sm" c="dimmed">
              {anyHigh
                ? "Not assessed: a high-risk factor is present."
                : "Not assessed: no low-risk factor is present, so range of motion cannot be safely assessed."}
            </Text>
          )}
        </>
      }
      result={(r) => (
        <Decision text={decisionText(r.result)} badge={OUTCOME_BADGE[asText(r.working.outcome)]} />
      )}
      summary={(r) => {
        const high = HIGH_RISK.filter((c) => criteria[c.key]).map((c) => c.label);
        const low = LOW_RISK.filter((c) => criteria[c.key]).map((c) => c.label);
        return summaryText({
          heading: `Canadian C-Spine Rule: ${decisionText(r.result).toLowerCase()}`,
          interpretation: r.interpretation,
          findings: [
            `High-risk factors: ${high.length ? high.join("; ") : "none"}`,
            !anyHigh && `Low-risk factors: ${low.length ? low.join("; ") : "none"}`,
            step3 &&
              rotation !== null &&
              `Active neck rotation: ${rotation === "able" ? "able" : "unable"} to rotate 45 degrees left and right`,
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = {
  name: "canadian_cspine",
  Component: CanadianCspineCalculator,
};
