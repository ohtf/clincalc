// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Alert } from "@mantine/core";
import { IconAlertCircle, IconEye } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  ScoreTile,
  asText,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/**
 * Glasgow Coma Scale (Teasdale & Jennett 1974). Each component offers "not
 * testable"; the engine then withholds the total and band, and so does the
 * result card.
 */

type EyeOpening = "spontaneous" | "to_sound" | "to_pressure" | "no_response" | "not_testable";
type VerbalResponse =
  | "orientated"
  | "confused"
  | "words"
  | "sounds"
  | "no_response"
  | "not_testable";
type MotorResponse =
  | "obey_commands"
  | "localising"
  | "normal_flexion"
  | "abnormal_flexion"
  | "extension"
  | "no_response"
  | "not_testable";

const EYE: Choice<EyeOpening>[] = [
  { value: "spontaneous", label: "Spontaneous (4)" },
  { value: "to_sound", label: "To sound (3)" },
  { value: "to_pressure", label: "To pressure (2)" },
  { value: "no_response", label: "No eye opening (1)" },
  { value: "not_testable", label: "Not testable, e.g. swollen shut (NT)" },
];

const VERBAL: Choice<VerbalResponse>[] = [
  { value: "orientated", label: "Orientated (5)" },
  { value: "confused", label: "Confused conversation (4)" },
  { value: "words", label: "Words, not a conversation (3)" },
  { value: "sounds", label: "Sounds only (2)" },
  { value: "no_response", label: "No verbal response (1)" },
  { value: "not_testable", label: "Not testable, e.g. intubated (NT)" },
];

const MOTOR: Choice<MotorResponse>[] = [
  { value: "obey_commands", label: "Obeys commands (6)" },
  { value: "localising", label: "Localises to pressure (5)" },
  { value: "normal_flexion", label: "Normal flexion / withdrawal (4)" },
  { value: "abnormal_flexion", label: "Abnormal (decorticate) flexion (3)" },
  { value: "extension", label: "Extension / decerebrate posturing (2)" },
  { value: "no_response", label: "No motor response (1)" },
  { value: "not_testable", label: "Not testable, e.g. paralysed (NT)" },
];

const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

function levelColour(level: string): string {
  if (!level) return "gray";
  if (level === "severe") return "red";
  if (level === "moderate") return "yellow";
  return "teal";
}

const component = (score: unknown) => asText(score) || "NT";

export function GcsCalculator() {
  const [eye, setEye] = useState<EyeOpening | null>(null);
  const [verbal, setVerbal] = useState<VerbalResponse | null>(null);
  const [motor, setMotor] = useState<MotorResponse | null>(null);

  const complete = eye !== null && verbal !== null && motor !== null;
  const calc = useCalculation(
    "gcs",
    complete ? { eye_opening: eye, verbal_response: verbal, motor_response: motor } : null,
  );

  return (
    <CalculatorPage
      icon={IconEye}
      title="Glasgow Coma Scale"
      badge="Conscious level"
      description="Bedside score of conscious level from eye, verbal, and motor response (Teasdale & Jennett 1974). A total and band are only reported when all three components are testable."
      onReset={() => {
        setEye(null);
        setVerbal(null);
        setMotor(null);
      }}
      calc={calc}
      maw={920}
      incomplete="Record all three components to calculate."
      form={
        <>
          <ChoiceField label="Eye opening (E)" value={eye} onChange={setEye} options={EYE} />
          <ChoiceField label="Verbal response (V)" value={verbal} onChange={setVerbal} options={VERBAL} />
          <ChoiceField label="Motor response (M)" value={motor} onChange={setMotor} options={MOTOR} />
        </>
      }
      result={(r) => {
        if (r.result === "not_testable") {
          return (
            <Alert
              color="orange"
              icon={<IconAlertCircle size={18} />}
              title="Total withheld - component(s) not testable"
            />
          );
        }
        const level = asText(r.working.level);
        return (
          <ScoreTile
            value={asText(r.result)}
            outOf={15}
            colour={levelColour(level)}
            badge={level || "—"}
          />
        );
      }}
      details={(r) => (
        <Facts
          items={[
            ["E", component(r.working.eye_opening_score)],
            ["V", component(r.working.verbal_response_score)],
            ["M", component(r.working.motor_response_score)],
          ]}
        />
      )}
      summary={(r) => {
        const level = asText(r.working.level);
        const total = r.result === "not_testable" ? "NT" : asText(r.result);
        return summaryText({
          heading: `GCS ${total}${level ? ` (${level})` : ""}`,
          interpretation: r.interpretation,
          extra: [
            `Eyes (E): ${labelOf(EYE, eye)}`,
            `Verbal (V): ${labelOf(VERBAL, verbal)}`,
            `Motor (M): ${labelOf(MOTOR, motor)}`,
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "gcs", Component: GcsCalculator };
