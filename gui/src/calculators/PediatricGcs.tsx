// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconBabyBottle } from "@tabler/icons-react";

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

/** Paediatric (preverbal) Glasgow Coma Scale (Reilly 1988, after Teasdale & Jennett 1974). */

type Eye = "spontaneous" | "to_sound" | "to_pressure" | "no_response" | "not_testable";
type Verbal =
  | "appropriate_words_or_smiles"
  | "irritable_cries_consolable"
  | "inconsolable_crying"
  | "grunts_or_moans"
  | "no_response"
  | "not_testable";
type Motor =
  | "normal_spontaneous_movements"
  | "withdraws_to_touch"
  | "withdraws_to_pain"
  | "abnormal_flexion"
  | "extension"
  | "no_response"
  | "not_testable";

const EYE: Choice<Eye>[] = [
  { value: "spontaneous", label: "Spontaneous (4)" },
  { value: "to_sound", label: "To sound (3)" },
  { value: "to_pressure", label: "To pressure (2)" },
  { value: "no_response", label: "No eye opening (1)" },
  { value: "not_testable", label: "Not testable (NT)", hint: "e.g. eyes swollen shut, periorbital trauma." },
];

const VERBAL: Choice<Verbal>[] = [
  {
    value: "appropriate_words_or_smiles",
    label: "Coos, babbles, or age-appropriate words; smiles, fixes and follows (5)",
  },
  { value: "irritable_cries_consolable", label: "Irritable cries but consolable (4)" },
  { value: "inconsolable_crying", label: "Persistently irritable, inconsolable crying (3)" },
  { value: "grunts_or_moans", label: "Grunts or moans to pain, inconsistently (2)" },
  { value: "no_response", label: "No verbal response (1)" },
  { value: "not_testable", label: "Not testable (NT)", hint: "e.g. intubated, sedated." },
];

const MOTOR: Choice<Motor>[] = [
  { value: "normal_spontaneous_movements", label: "Normal spontaneous movements (6)" },
  { value: "withdraws_to_touch", label: "Withdraws to touch (5)" },
  { value: "withdraws_to_pain", label: "Withdraws to pain (4)" },
  { value: "abnormal_flexion", label: "Abnormal flexion to pain - decorticate (3)" },
  { value: "extension", label: "Extension to pain - decerebrate (2)" },
  { value: "no_response", label: "No motor response (1)" },
  { value: "not_testable", label: "Not testable (NT)", hint: "e.g. neuromuscular blockade, paralysis." },
];

const LEVEL_COLOUR: Record<string, string> = { severe: "red", moderate: "yellow", mild: "teal" };

const score = (v: unknown) => (v === undefined || v === null ? "NT" : fmt(v));

function PediatricGcsCalculator() {
  const [eye, setEye] = useState<Eye | null>(null);
  const [verbal, setVerbal] = useState<Verbal | null>(null);
  const [motor, setMotor] = useState<Motor | null>(null);

  const complete = eye !== null && verbal !== null && motor !== null;
  const calc = useCalculation(
    "pediatric_gcs",
    complete ? { eye_opening: eye, verbal_response: verbal, motor_response: motor } : null,
  );

  return (
    <CalculatorPage
      icon={IconBabyBottle}
      title="Paediatric GCS"
      badge="Preverbal child"
      description="Glasgow Coma Scale with age-appropriate verbal and motor descriptors for infants and young children who are not yet reliably verbal (Reilly 1988). A total and band are reported only when all three components are testable."
      onReset={() => {
        setEye(null);
        setVerbal(null);
        setMotor(null);
      }}
      calc={calc}
      incomplete="Choose a response for each of the three components."
      form={
        <>
          <ChoiceField label="Eye opening (E)" value={eye} onChange={setEye} options={EYE} />
          <ChoiceField label="Verbal response (V)" value={verbal} onChange={setVerbal} options={VERBAL} />
          <ChoiceField label="Motor response (M)" value={motor} onChange={setMotor} options={MOTOR} />
        </>
      }
      result={(r) => {
        const level = asText(r.working.level);
        if (r.result === "not_testable") {
          return <ScoreTile value="NT" colour="gray" badge="Total withheld" />;
        }
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={15}
            colour={LEVEL_COLOUR[level] ?? "teal"}
            badge={level}
          />
        );
      }}
      details={(r) => (
        <Facts
          title="Components"
          items={[
            ["E", score(r.working.eye_opening_score)],
            ["V", score(r.working.verbal_response_score)],
            ["M", score(r.working.motor_response_score)],
          ]}
        />
      )}
      summary={(r) => {
        const components = `E${score(r.working.eye_opening_score)} V${score(r.working.verbal_response_score)} M${score(r.working.motor_response_score)}`;
        const level = asText(r.working.level);
        return summaryText({
          heading:
            r.result === "not_testable"
              ? `Paediatric GCS ${components} (total withheld - component not testable)`
              : `Paediatric GCS ${fmt(r.result)}/15 (${components})${level ? `, ${level}` : ""}`,
          interpretation: r.interpretation,
          findingsTitle: "Responses",
          findings: [
            `Eyes: ${asText(r.working.eye_opening_descriptor)}`,
            `Verbal: ${asText(r.working.verbal_response_descriptor)}`,
            `Motor: ${asText(r.working.motor_response_descriptor)}`,
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "pediatric_gcs", Component: PediatricGcsCalculator };
