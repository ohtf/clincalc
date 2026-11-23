// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconActivityHeartbeat } from "@tabler/icons-react";

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

/** Modified EHRA symptom classification for atrial fibrillation (Wynn 2014; ESC 2016). */

type EhraClass = "class1" | "class2a" | "class2b" | "class3" | "class4";

const CLASSES: Choice<EhraClass>[] = [
  { value: "class1", label: "Class 1 - No symptoms" },
  { value: "class2a", label: "Class 2a - Mild", hint: "Normal daily activity not affected." },
  {
    value: "class2b",
    label: "Class 2b - Moderate",
    hint: "Normal daily activity not affected, but the patient is troubled by symptoms.",
  },
  { value: "class3", label: "Class 3 - Severe", hint: "Normal daily activity affected." },
  { value: "class4", label: "Class 4 - Disabling", hint: "Normal daily activity discontinued." },
];

function EhraCalculator() {
  const [ehraClass, setEhraClass] = useState<EhraClass | null>(null);

  const calc = useCalculation("ehra", ehraClass !== null ? { ehra_class: ehraClass } : null);

  return (
    <CalculatorPage
      icon={IconActivityHeartbeat}
      title="EHRA symptom class"
      badge="Atrial fibrillation"
      description="Classifies symptoms attributable to atrial fibrillation, using the modified scale that splits class 2 into 2a and 2b (Wynn 2014; 2016 ESC AF Guidelines)."
      onReset={() => setEhraClass(null)}
      calc={calc}
      incomplete="Choose the class that best describes the patient's AF-related symptoms."
      form={
        <ChoiceField
          label="Symptoms attributable to AF"
          value={ehraClass}
          onChange={setEhraClass}
          options={CLASSES}
        />
      }
      result={(r) => <ScoreTile value={asText(r.result)} badge="EHRA class" />}
      summary={(r) =>
        summaryText({
          heading: `EHRA class ${asText(r.result)}`,
          interpretation: r.interpretation,
          findingsTitle: "Assessment",
          findings: [asText(r.working.label)],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "ehra", Component: EhraCalculator };
