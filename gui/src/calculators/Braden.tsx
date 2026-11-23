// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconBed } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Braden Scale for predicting pressure ulcer risk (Bergstrom 1987). */

type Sensory = "completely_limited" | "very_limited" | "slightly_limited" | "no_impairment";
type Moisture = "constantly_moist" | "often_moist" | "occasionally_moist" | "rarely_moist";
type Activity = "bedfast" | "chairfast" | "walks_occasionally" | "walks_frequently";
type Mobility = "completely_immobile" | "very_limited" | "slightly_limited" | "no_limitations";
type Nutrition = "very_poor" | "probably_inadequate" | "adequate" | "excellent";
type Friction = "problem" | "potential_problem" | "no_apparent_problem";

const SENSORY: Choice<Sensory>[] = [
  { value: "completely_limited", label: "Completely limited (1)" },
  { value: "very_limited", label: "Very limited (2)" },
  { value: "slightly_limited", label: "Slightly limited (3)" },
  { value: "no_impairment", label: "No impairment (4)" },
];

const MOISTURE: Choice<Moisture>[] = [
  { value: "constantly_moist", label: "Constantly moist (1)" },
  { value: "often_moist", label: "Often moist (2)" },
  { value: "occasionally_moist", label: "Occasionally moist (3)" },
  { value: "rarely_moist", label: "Rarely moist (4)" },
];

const ACTIVITY: Choice<Activity>[] = [
  { value: "bedfast", label: "Bedfast (1)" },
  { value: "chairfast", label: "Chairfast (2)" },
  { value: "walks_occasionally", label: "Walks occasionally (3)" },
  { value: "walks_frequently", label: "Walks frequently (4)" },
];

const MOBILITY: Choice<Mobility>[] = [
  { value: "completely_immobile", label: "Completely immobile (1)" },
  { value: "very_limited", label: "Very limited (2)" },
  { value: "slightly_limited", label: "Slightly limited (3)" },
  { value: "no_limitations", label: "No limitations (4)" },
];

const NUTRITION: Choice<Nutrition>[] = [
  { value: "very_poor", label: "Very poor (1)" },
  { value: "probably_inadequate", label: "Probably inadequate (2)" },
  { value: "adequate", label: "Adequate (3)" },
  { value: "excellent", label: "Excellent (4)" },
];

const FRICTION: Choice<Friction>[] = [
  { value: "problem", label: "Problem (1)" },
  { value: "potential_problem", label: "Potential problem (2)" },
  { value: "no_apparent_problem", label: "No apparent problem (3)" },
];

const BAND_COLOUR: Record<string, string> = {
  "Very high risk": "red",
  "High risk": "orange",
  "Moderate risk": "yellow",
  "Mild risk": "lime",
  "Low / no risk": "teal",
};

const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

function BradenCalculator() {
  const [sensory, setSensory] = useState<Sensory | null>(null);
  const [moisture, setMoisture] = useState<Moisture | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [mobility, setMobility] = useState<Mobility | null>(null);
  const [nutrition, setNutrition] = useState<Nutrition | null>(null);
  const [friction, setFriction] = useState<Friction | null>(null);

  const complete =
    sensory !== null &&
    moisture !== null &&
    activity !== null &&
    mobility !== null &&
    nutrition !== null &&
    friction !== null;
  const calc = useCalculation(
    "braden",
    complete
      ? {
          sensory_perception: sensory,
          moisture,
          activity,
          mobility,
          nutrition,
          friction_shear: friction,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconBed}
      title="Braden Scale"
      badge="Pressure ulcer risk"
      description="Pressure ulcer risk from six subscales, totalling 6-23; a lower score means higher risk (Bergstrom 1987)."
      onReset={() => {
        setSensory(null);
        setMoisture(null);
        setActivity(null);
        setMobility(null);
        setNutrition(null);
        setFriction(null);
      }}
      calc={calc}
      incomplete="Rate all six subscales to calculate."
      form={
        <>
          <ChoiceField
            label="Sensory perception"
            hint="Ability to respond to pressure-related discomfort."
            value={sensory}
            onChange={setSensory}
            options={SENSORY}
          />
          <ChoiceField
            label="Moisture"
            hint="Degree to which skin is exposed to moisture."
            value={moisture}
            onChange={setMoisture}
            options={MOISTURE}
          />
          <ChoiceField
            label="Activity"
            hint="Degree of physical activity."
            value={activity}
            onChange={setActivity}
            options={ACTIVITY}
          />
          <ChoiceField
            label="Mobility"
            hint="Ability to change and control body position."
            value={mobility}
            onChange={setMobility}
            options={MOBILITY}
          />
          <ChoiceField
            label="Nutrition"
            hint="Usual food intake pattern."
            value={nutrition}
            onChange={setNutrition}
            options={NUTRITION}
          />
          <ChoiceField
            label="Friction and shear"
            value={friction}
            onChange={setFriction}
            options={FRICTION}
          />
        </>
      }
      result={(r) => {
        const band = asText(r.working.risk_level);
        return (
          <ScoreTile value={fmt(r.result)} outOf={23} colour={BAND_COLOUR[band] ?? "teal"} badge={band} />
        );
      }}
      summary={(r) =>
        summaryText({
          heading: `Braden score ${fmt(r.result)} / 23 (${asText(r.working.risk_level)})`,
          interpretation: r.interpretation,
          findingsTitle: "Subscales",
          findings: [
            `Sensory perception: ${labelOf(SENSORY, sensory)}`,
            `Moisture: ${labelOf(MOISTURE, moisture)}`,
            `Activity: ${labelOf(ACTIVITY, activity)}`,
            `Mobility: ${labelOf(MOBILITY, mobility)}`,
            `Nutrition: ${labelOf(NUTRITION, nutrition)}`,
            `Friction and shear: ${labelOf(FRICTION, friction)}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "braden", Component: BradenCalculator };
