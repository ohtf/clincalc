// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Group, Radio } from "@mantine/core";
import { IconFirstAidKit } from "@tabler/icons-react";

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

/** ASA Physical Status classification (American Society of Anesthesiologists, amended 2020). */

type AsaClass = "asa1" | "asa2" | "asa3" | "asa4" | "asa5" | "asa6";
type Urgency = "not_emergency" | "emergency";

const CLASSES: Choice<AsaClass>[] = [
  { value: "asa1", label: "ASA 1", hint: "A normal healthy patient." },
  { value: "asa2", label: "ASA 2", hint: "A patient with mild systemic disease." },
  { value: "asa3", label: "ASA 3", hint: "A patient with severe systemic disease." },
  { value: "asa4", label: "ASA 4", hint: "A patient with severe systemic disease that is a constant threat to life." },
  { value: "asa5", label: "ASA 5", hint: "A moribund patient who is not expected to survive without the operation." },
  {
    value: "asa6",
    label: "ASA 6",
    hint: "A declared brain-dead patient whose organs are being removed for donor purposes.",
  },
];

const URGENCY: Choice<Urgency>[] = [
  { value: "not_emergency", label: "Not an emergency" },
  { value: "emergency", label: "Emergency (adds E)" },
];

function AsaPhysicalStatusCalculator() {
  const [asaClass, setAsaClass] = useState<AsaClass | null>(null);
  const [urgency, setUrgency] = useState<Urgency | null>(null);

  const complete = asaClass !== null && urgency !== null;
  const calc = useCalculation(
    "asa_physical_status",
    complete ? { asa_class: asaClass, emergency: urgency === "emergency" } : null,
  );

  return (
    <CalculatorPage
      icon={IconFirstAidKit}
      title="ASA Physical Status"
      badge="Preoperative assessment"
      description="American Society of Anesthesiologists classification of preoperative physical status, with the E suffix for an emergency operation (ASA, amended December 2020). It describes physical status and is not by itself an operative risk score."
      onReset={() => {
        setAsaClass(null);
        setUrgency(null);
      }}
      calc={calc}
      incomplete="Choose the ASA class and whether the operation is an emergency."
      form={
        <>
          <ChoiceField label="ASA class" value={asaClass} onChange={setAsaClass} options={CLASSES} />
          <Radio.Group
            label="Emergency operation?"
            description="The E suffix denotes an emergency operation."
            value={urgency}
            onChange={(v) => setUrgency(v as Urgency)}
          >
            <Group gap="lg" mt={8}>
              {URGENCY.map((o) => (
                <Radio key={o.value} value={o.value} label={o.label} />
              ))}
            </Group>
          </Radio.Group>
        </>
      }
      result={(r) => (
        <ScoreTile
          value={asText(r.result)}
          badge={r.working.emergency_suffix === true ? "emergency" : undefined}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `${asText(r.result)}${r.working.emergency_suffix === true ? " (emergency)" : ""}`,
          interpretation: r.interpretation,
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "asa_physical_status", Component: AsaPhysicalStatusCalculator };
