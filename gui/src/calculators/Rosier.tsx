// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, Text } from "@mantine/core";
import { IconBrain } from "@tabler/icons-react";

import {
  CalculatorPage,
  ScoreTile,
  YesNoField,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** ROSIER stroke recognition scale for the emergency room (Nor 2005). */

const HISTORY = [
  { key: "loss_of_consciousness_or_syncope", label: "Loss of consciousness or syncope (-1)" },
  { key: "seizure_activity", label: "Seizure activity (-1)" },
] as const;

const SIGNS = [
  { key: "new_asymmetric_facial_weakness", label: "Asymmetric facial weakness (+1)" },
  { key: "new_asymmetric_arm_weakness", label: "Asymmetric arm weakness (+1)" },
  { key: "new_asymmetric_leg_weakness", label: "Asymmetric leg weakness (+1)" },
  { key: "new_speech_disturbance", label: "Speech disturbance (+1)" },
  { key: "new_visual_field_defect", label: "Visual field defect (+1)" },
] as const;

const ITEMS = [...HISTORY, ...SIGNS];
type Key = (typeof ITEMS)[number]["key"];
type Criteria = Record<Key, boolean>;

const noneTicked = (): Criteria =>
  Object.fromEntries(ITEMS.map((c) => [c.key, false])) as Criteria;

const signed = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? `+${n}` : fmt(v);
};

function RosierCalculator() {
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);

  const calc = useCalculation("rosier", criteria);

  const field = (c: (typeof ITEMS)[number]) => (
    <YesNoField
      key={c.key}
      label={c.label}
      checked={criteria[c.key]}
      onChange={(checked) => setCriteria((prev) => ({ ...prev, [c.key]: checked }))}
    />
  );

  return (
    <CalculatorPage
      icon={IconBrain}
      title="ROSIER"
      badge="Suspected stroke in the ED"
      description="Recognition of Stroke in the Emergency Room (Nor 2005): seven items scoring -2 to +5, where a score above 0 means stroke is likely. Check and correct hypoglycaemia first; it is a stroke mimic and is not one of the scored items."
      onReset={() => setCriteria(noneTicked())}
      formTitle="Tick each item that applies"
      calc={calc}
      form={
        <>
          <Text fw={600} size="sm">
            At onset
          </Text>
          {HISTORY.map(field)}
          <Divider />
          <Text fw={600} size="sm">
            New, acute onset (or on awakening from sleep)
          </Text>
          {SIGNS.map(field)}
        </>
      }
      result={(r) => (
        <ScoreTile
          value={signed(r.result)}
          badge={r.working.stroke_likely === true ? "stroke likely" : "stroke unlikely"}
        />
      )}
      summary={(r) => {
        const ticked = ITEMS.filter((c) => criteria[c.key]);
        return summaryText({
          heading: `ROSIER score ${signed(r.result)} (${
            r.working.stroke_likely === true ? "stroke likely" : "stroke unlikely"
          })`,
          interpretation: r.interpretation,
          findingsTitle: "Items present",
          findings: ticked.map((c) =>
            (SIGNS as readonly { key: string }[]).includes(c) ? `New ${c.label.charAt(0).toLowerCase()}${c.label.slice(1)}` : `${c.label} at onset`,
          ),
          extra: [ticked.length === 0 && "No items present."],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "rosier", Component: RosierCalculator };
