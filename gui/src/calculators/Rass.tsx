// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconZzz } from "@tabler/icons-react";

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

/** Richmond Agitation-Sedation Scale (Sessler 2002). */

type Level = "4" | "3" | "2" | "1" | "0" | "-1" | "-2" | "-3" | "-4" | "-5";

const LEVELS: Choice<Level>[] = [
  { value: "4", label: "+4 Combative", hint: "Overtly combative or violent; immediate danger to staff." },
  {
    value: "3",
    label: "+3 Very agitated",
    hint: "Pulls or removes tube(s) or catheter(s), or is aggressive toward staff.",
  },
  { value: "2", label: "+2 Agitated", hint: "Frequent non-purposeful movement, fights the ventilator." },
  {
    value: "1",
    label: "+1 Restless",
    hint: "Anxious or apprehensive, but movements not aggressive or vigorous.",
  },
  { value: "0", label: "0 Alert and calm" },
  {
    value: "-1",
    label: "-1 Drowsy",
    hint: "Not fully alert, but has sustained (over 10 seconds) awakening, with eye contact, to voice.",
  },
  {
    value: "-2",
    label: "-2 Light sedation",
    hint: "Briefly (under 10 seconds) awakens, with eye contact, to voice.",
  },
  { value: "-3", label: "-3 Moderate sedation", hint: "Any movement (but no eye contact) to voice." },
  {
    value: "-4",
    label: "-4 Deep sedation",
    hint: "No response to voice, but any movement to physical stimulation.",
  },
  { value: "-5", label: "-5 Unarousable", hint: "No response to voice or physical stimulation." },
];

const signed = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? `+${n}` : String(v);
};

function RassCalculator() {
  const [level, setLevel] = useState<Level | null>(null);

  const calc = useCalculation("rass", level !== null ? { level: Number(level) } : null);

  return (
    <CalculatorPage
      icon={IconZzz}
      title="RASS"
      badge="ICU sedation and agitation"
      description="Richmond Agitation-Sedation Scale, from +4 (combative) to -5 (unarousable), for ICU patients (Sessler 2002). Observe first, then use a verbal stimulus, then a physical stimulus if needed, and score the earliest response obtained."
      onReset={() => setLevel(null)}
      formTitle="Choose the level that matches the patient"
      calc={calc}
      incomplete="Choose a RASS level."
      form={
        <ChoiceField label="RASS level" value={level} onChange={setLevel} options={LEVELS} />
      }
      result={(r) => (
        <ScoreTile
          value={signed(r.result)}
          badge={asText(r.working.descriptor).split(":")[0]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `RASS ${signed(r.result)}: ${asText(r.working.descriptor)}`,
          interpretation: r.interpretation,
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "rass", Component: RassCalculator };
