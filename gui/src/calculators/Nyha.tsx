// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconStairs } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  ScoreTile,
  asText,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** NYHA functional classification (NYHA Criteria Committee; NCI Thesaurus definitions, CC BY 4.0). */

type Context = "yes" | "no";
type Profile =
  | "no_limitation_with_ordinary_activity"
  | "comfortable_at_rest_symptoms_with_ordinary_activity"
  | "comfortable_at_rest_symptoms_with_less_than_ordinary_activity"
  | "symptoms_at_rest_or_minimal_exertion_and_any_physical_activity_causes_discomfort";

const CONTEXT: Choice<Context>[] = [
  { value: "yes", label: "Yes - defined or presumed cardiac disease" },
  { value: "no", label: "No" },
];

const PROFILES: Choice<Profile>[] = [
  {
    value: "no_limitation_with_ordinary_activity",
    label: "Class I - No limitation",
    hint: "Ordinary activity does not provoke cardiac symptoms or limitation.",
  },
  {
    value: "comfortable_at_rest_symptoms_with_ordinary_activity",
    label: "Class II - Slight limitation",
    hint: "Comfortable at rest; ordinary activity provokes cardiac symptoms.",
  },
  {
    value: "comfortable_at_rest_symptoms_with_less_than_ordinary_activity",
    label: "Class III - Marked limitation",
    hint: "Comfortable at rest; less-than-ordinary activity provokes cardiac symptoms.",
  },
  {
    value: "symptoms_at_rest_or_minimal_exertion_and_any_physical_activity_causes_discomfort",
    label: "Class IV - Symptoms at rest or minimal exertion",
    hint: "Physical activity cannot be undertaken without discomfort.",
  },
];

const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

function NyhaCalculator() {
  const [context, setContext] = useState<Context | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const complete = context === "yes" && profile !== null;
  const calc = useCalculation(
    "nyha",
    complete
      ? { assessment_context: "defined_or_presumed_cardiac_disease", functional_profile: profile }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconStairs}
      title="NYHA functional class"
      badge="Heart failure"
      description="Assigns the current New York Heart Association functional class from cardiac-symptom-related limitation of physical activity. A subjective classification, not a diagnosis, exercise test, prognosis, or treatment rule."
      onReset={() => {
        setContext(null);
        setProfile(null);
      }}
      calc={calc}
      incomplete={
        context === "no"
          ? "NYHA classification applies only to a patient with defined or presumed cardiac disease."
          : "Confirm the assessment context and choose the current functional profile."
      }
      form={
        <>
          <ChoiceField
            label="Does the patient have defined or presumed cardiac disease?"
            hint="NYHA class describes limitation attributed to cardiac disease; it does not establish the diagnosis."
            value={context}
            onChange={setContext}
            options={CONTEXT}
          />
          <ChoiceField
            label="Current functional profile"
            hint="Cardiac symptoms include undue fatigue, breathlessness, palpitations, or chest discomfort. Do not select from walking distance alone, and do not treat an unclear history as Class I."
            value={profile}
            onChange={setProfile}
            options={PROFILES}
          />
        </>
      }
      result={(r) => (
        <ScoreTile value={asText(r.working.nyha_class)} outOf="IV" badge="NYHA class" />
      )}
      summary={(r) =>
        summaryText({
          heading: `NYHA class ${asText(r.working.nyha_class)}`,
          interpretation: r.interpretation,
          findingsTitle: "Assessment",
          findings: [
            "Defined or presumed cardiac disease",
            `Functional profile: ${labelOf(PROFILES, profile)}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "nyha", Component: NyhaCalculator };
