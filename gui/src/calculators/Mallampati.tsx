// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconDental } from "@tabler/icons-react";

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

/** Modified Mallampati classification (Mallampati 1985; class IV from Samsoon & Young 1987). */

type MallampatiClass = "1" | "2" | "3" | "4";

const ROMAN: Record<string, string> = { "1": "I", "2": "II", "3": "III", "4": "IV" };
const roman = (v: unknown) => ROMAN[asText(v)] ?? asText(v);

const CLASSES: Choice<MallampatiClass>[] = [
  { value: "1", label: "Class I", hint: "Soft palate, uvula, fauces, and pillars fully visible." },
  { value: "2", label: "Class II", hint: "Soft palate, major part of uvula, and fauces visible." },
  { value: "3", label: "Class III", hint: "Soft palate and base of uvula visible." },
  { value: "4", label: "Class IV", hint: "Only the hard palate visible." },
];

function MallampatiCalculator() {
  const [cls, setCls] = useState<MallampatiClass | null>(null);

  const calc = useCalculation("mallampati", cls !== null ? { class: Number(cls) } : null);

  return (
    <CalculatorPage
      icon={IconDental}
      title="Mallampati classification"
      badge="Airway assessment"
      description="Four-class oropharyngeal view used to anticipate difficult laryngoscopy (Mallampati 1985; class IV added by Samsoon & Young 1987). A single bedside sign with limited sensitivity on its own."
      onReset={() => setCls(null)}
      calc={calc}
      incomplete="Choose the class seen to calculate."
      form={
        <ChoiceField
          label="Oropharyngeal view"
          hint="Patient seated, mouth opened maximally, tongue protruded, without phonation."
          value={cls}
          onChange={setCls}
          options={CLASSES}
        />
      }
      result={(r) => (
        <ScoreTile
          value={roman(r.result)}
          outOf="IV"
          badge={r.working.predicts_difficult_laryngoscopy === true ? "class III-IV" : undefined}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Mallampati class ${roman(r.result)}: ${asText(r.working.descriptor)}`,
          interpretation: r.interpretation,
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "mallampati", Component: MallampatiCalculator };
