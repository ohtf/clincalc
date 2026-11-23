// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Badge, Divider, Group, Text, Title } from "@mantine/core";
import { IconBrain } from "@tabler/icons-react";

import {
  CalculatorPage,
  YesNoField,
  asText,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** Canadian CT Head Rule for minor head injury in alert adults (Stiell 2001). */

type Key =
  | "gcs_below_15_at_2_hours"
  | "suspected_open_or_depressed_skull_fracture"
  | "sign_of_basal_skull_fracture"
  | "vomiting_2_or_more_episodes"
  | "age_65_or_over"
  | "amnesia_before_impact_30_minutes_or_more"
  | "dangerous_mechanism";
type Criterion = { key: Key; label: string; hint?: string };

const HIGH_RISK: Criterion[] = [
  { key: "gcs_below_15_at_2_hours", label: "GCS below 15 at 2 hours after injury" },
  { key: "suspected_open_or_depressed_skull_fracture", label: "Suspected open or depressed skull fracture" },
  {
    key: "sign_of_basal_skull_fracture",
    label: "Any sign of basal skull fracture",
    hint: "Haemotympanum, raccoon eyes, CSF otorrhoea or rhinorrhoea, or Battle's sign.",
  },
  { key: "vomiting_2_or_more_episodes", label: "Vomiting, 2 or more episodes" },
  { key: "age_65_or_over", label: "Age 65 or over" },
];

const MEDIUM_RISK: Criterion[] = [
  { key: "amnesia_before_impact_30_minutes_or_more", label: "Amnesia before impact of 30 minutes or more" },
  {
    key: "dangerous_mechanism",
    label: "Dangerous mechanism",
    hint: "Pedestrian struck by a vehicle, occupant ejected from a vehicle, or a fall from 3 feet / 5 stairs or more.",
  },
];

type Criteria = Record<Key, boolean>;
const noneTicked = (): Criteria =>
  Object.fromEntries([...HIGH_RISK, ...MEDIUM_RISK].map((c) => [c.key, false])) as Criteria;

const RISK_LABEL: Record<string, string> = {
  high: "High risk",
  medium: "Medium risk",
  none: "No risk criteria",
};
const RISK_COLOUR: Record<string, string> = { high: "red", medium: "yellow", none: "teal" };

const decisionText = (result: unknown) =>
  result === true ? "CT head recommended" : "CT not recommended by the rule";

function CanadianCtHeadCalculator() {
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);
  const calc = useCalculation("canadian_ct_head", criteria);

  const field = (c: Criterion) => (
    <YesNoField
      key={c.key}
      label={c.label}
      hint={c.hint}
      checked={criteria[c.key]}
      onChange={(checked) => setCriteria((prev) => ({ ...prev, [c.key]: checked }))}
    />
  );

  return (
    <CalculatorPage
      icon={IconBrain}
      title="Canadian CT Head Rule"
      badge="Minor head injury"
      description="Selective CT imaging after minor head injury in alert adults (GCS 13-15) with loss of consciousness, definite amnesia, or witnessed disorientation (Stiell 2001)."
      onReset={() => setCriteria(noneTicked())}
      formTitle="Tick each criterion that is present"
      calc={calc}
      form={
        <>
          <Text fw={600} size="sm">
            High risk (for neurological intervention)
          </Text>
          {HIGH_RISK.map(field)}
          <Divider />
          <Text fw={600} size="sm">
            Medium risk (for brain injury on CT)
          </Text>
          {MEDIUM_RISK.map(field)}
        </>
      }
      result={(r) => {
        const level = asText(r.working.risk_level);
        const colour = RISK_COLOUR[level] ?? "teal";
        return (
          <Group justify="space-between" align="center" gap="xs" wrap="wrap">
            <Title order={2} c={colour}>
              {decisionText(r.result)}
            </Title>
            <Badge color={colour} variant="light" size="lg">
              {RISK_LABEL[level] ?? level}
            </Badge>
          </Group>
        );
      }}
      summary={(r) => {
        const level = asText(r.working.risk_level);
        const present = [...HIGH_RISK, ...MEDIUM_RISK].filter((c) => criteria[c.key]);
        return summaryText({
          heading: `Canadian CT Head Rule: ${decisionText(r.result)} (${(RISK_LABEL[level] ?? level).toLowerCase()})`,
          interpretation: r.interpretation,
          findingsTitle: "Criteria present",
          findings: present.length
            ? present.map((c) => c.label)
            : ["None of the high- or medium-risk criteria"],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = {
  name: "canadian_ct_head",
  Component: CanadianCtHeadCalculator,
};
