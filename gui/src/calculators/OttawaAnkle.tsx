// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, Text, Title } from "@mantine/core";
import { IconShoe } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  YesNoField,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** Ottawa Ankle Rule for ankle and midfoot radiography (Stiell 1994). */

type Key =
  | "pain_in_malleolar_zone"
  | "tenderness_posterior_edge_or_tip_lateral_malleolus"
  | "tenderness_posterior_edge_or_tip_medial_malleolus"
  | "pain_in_midfoot_zone"
  | "tenderness_base_fifth_metatarsal"
  | "tenderness_navicular"
  | "unable_to_bear_weight_four_steps";
type Criterion = { key: Key; label: string; hint?: string };

const ANKLE: Criterion[] = [
  { key: "pain_in_malleolar_zone", label: "Pain in the malleolar zone" },
  {
    key: "tenderness_posterior_edge_or_tip_lateral_malleolus",
    label: "Bone tenderness at the lateral malleolus",
    hint: "Along the distal 6 cm of the posterior edge of the fibula, or the tip of the lateral malleolus.",
  },
  {
    key: "tenderness_posterior_edge_or_tip_medial_malleolus",
    label: "Bone tenderness at the medial malleolus",
    hint: "Along the distal 6 cm of the posterior edge of the tibia, or the tip of the medial malleolus.",
  },
];

const FOOT: Criterion[] = [
  { key: "pain_in_midfoot_zone", label: "Pain in the midfoot zone" },
  { key: "tenderness_base_fifth_metatarsal", label: "Bone tenderness at the base of the 5th metatarsal" },
  { key: "tenderness_navicular", label: "Bone tenderness at the navicular" },
];

const WEIGHT_BEARING: Criterion = {
  key: "unable_to_bear_weight_four_steps",
  label: "Unable to bear weight for 4 steps",
  hint: "Both immediately after the injury and in the emergency department or clinic. Limping still counts as bearing weight.",
};

const ALL = [...ANKLE, ...FOOT, WEIGHT_BEARING];
type Criteria = Record<Key, boolean>;
const noneTicked = (): Criteria => Object.fromEntries(ALL.map((c) => [c.key, false])) as Criteria;

function decisionText(ankle: boolean, foot: boolean) {
  if (ankle && foot) return "Ankle and foot radiographs indicated";
  if (ankle) return "Ankle radiographs indicated";
  if (foot) return "Foot radiographs indicated";
  return "Radiographs not indicated by the rule";
}

const indicated = (v: unknown) => (v === true ? "indicated" : "not indicated");

function OttawaAnkleCalculator() {
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);
  const calc = useCalculation("ottawa_ankle", criteria);

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
      icon={IconShoe}
      title="Ottawa Ankle Rule"
      badge="Acute ankle injury"
      description="Selective ankle and midfoot radiography after acute ankle injury, with a separate decision for each zone (Stiell 1994). For adults who can be reliably examined."
      onReset={() => setCriteria(noneTicked())}
      formTitle="Tick each finding that is present"
      calc={calc}
      form={
        <>
          <Text fw={600} size="sm">
            Malleolar zone (ankle series)
          </Text>
          {ANKLE.map(field)}
          <Divider />
          <Text fw={600} size="sm">
            Midfoot zone (foot series)
          </Text>
          {FOOT.map(field)}
          <Divider />
          <Text fw={600} size="sm">
            Weight-bearing (applies to both zones)
          </Text>
          {field(WEIGHT_BEARING)}
        </>
      }
      result={(r) => (
        <Title order={2} c="teal">
          {decisionText(r.working.ankle_series_indicated === true, r.working.foot_series_indicated === true)}
        </Title>
      )}
      details={(r) => (
        <Facts
          title="Series"
          items={[
            ["Ankle series", indicated(r.working.ankle_series_indicated)],
            ["Foot series", indicated(r.working.foot_series_indicated)],
          ]}
        />
      )}
      summary={(r) => {
        const present = ALL.filter((c) => criteria[c.key]).map((c) => c.label);
        return summaryText({
          heading: `Ottawa Ankle Rule: ${decisionText(
            r.working.ankle_series_indicated === true,
            r.working.foot_series_indicated === true,
          )}`,
          interpretation: r.interpretation,
          findingsTitle: "Findings present",
          findings: present.length ? present : ["None of the rule's findings"],
          extra: [
            `Ankle series ${indicated(r.working.ankle_series_indicated)}; foot series ${indicated(r.working.foot_series_indicated)}.`,
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "ottawa_ankle", Component: OttawaAnkleCalculator };
