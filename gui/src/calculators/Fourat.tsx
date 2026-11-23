// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconBrain } from "@tabler/icons-react";

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

/** 4AT rapid assessment test for delirium (MacLullich, 4AT v1.1, 2014). */

type Alertness = "normal" | "mild_sleepiness" | "clearly_abnormal";
type Amt4 = "no_mistakes" | "one_mistake" | "two_or_more_or_untestable";
type Attention = "seven_or_more" | "below_seven_or_refuses" | "untestable";
type AcuteChange = "no" | "yes";

const ALERTNESS: Choice<Alertness>[] = [
  { value: "normal", label: "Normal - fully alert, but not agitated (0)" },
  { value: "mild_sleepiness", label: "Mild sleepiness for under 10 seconds after waking, then normal (0)" },
  {
    value: "clearly_abnormal",
    label: "Clearly abnormal (4)",
    hint: "Markedly drowsy (difficult to rouse, obviously sleepy) or agitated / hyperactive.",
  },
];

const AMT4: Choice<Amt4>[] = [
  { value: "no_mistakes", label: "No mistakes (0)" },
  { value: "one_mistake", label: "1 mistake (1)" },
  { value: "two_or_more_or_untestable", label: "2 or more mistakes, or untestable (2)" },
];

const ATTENTION: Choice<Attention>[] = [
  { value: "seven_or_more", label: "Achieves 7 months or more correctly (0)" },
  { value: "below_seven_or_refuses", label: "Starts but scores under 7 months, or refuses to start (1)" },
  {
    value: "untestable",
    label: "Untestable (2)",
    hint: "Cannot start because unwell, drowsy, or inattentive.",
  },
];

const ACUTE_CHANGE: Choice<AcuteChange>[] = [
  { value: "no", label: "No (0)" },
  { value: "yes", label: "Yes (4)" },
];

const BAND_LABEL: Record<string, string> = {
  "possible-delirium": "possible delirium",
  "possible-cognitive-impairment": "possible cognitive impairment",
  unlikely: "delirium or severe cognitive impairment unlikely",
};
const BAND_COLOUR: Record<string, string> = {
  "possible-delirium": "red",
  "possible-cognitive-impairment": "yellow",
  unlikely: "teal",
};

const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

function FouratCalculator() {
  const [alertness, setAlertness] = useState<Alertness | null>(null);
  const [amt4, setAmt4] = useState<Amt4 | null>(null);
  const [attention, setAttention] = useState<Attention | null>(null);
  const [acuteChange, setAcuteChange] = useState<AcuteChange | null>(null);

  const complete =
    alertness !== null && amt4 !== null && attention !== null && acuteChange !== null;
  const calc = useCalculation(
    "fourat",
    complete ? { alertness, amt4, attention, acute_change: acuteChange === "yes" } : null,
  );

  return (
    <CalculatorPage
      icon={IconBrain}
      title="4AT"
      badge="Delirium screen"
      description="Rapid bedside test for delirium and cognitive impairment, scored 0-12; 4 or above suggests possible delirium (MacLullich, 4AT v1.1, 2014; www.the4at.com)."
      onReset={() => {
        setAlertness(null);
        setAmt4(null);
        setAttention(null);
        setAcuteChange(null);
      }}
      calc={calc}
      incomplete="Answer all four items to calculate."
      form={
        <>
          <ChoiceField
            label="1. Alertness"
            hint="Rate solely on observation at the time of assessment."
            value={alertness}
            onChange={setAlertness}
            options={ALERTNESS}
          />
          <ChoiceField
            label="2. AMT4"
            hint="Age, date of birth, place (name of the hospital or building), current year."
            value={amt4}
            onChange={setAmt4}
            options={AMT4}
          />
          <ChoiceField
            label="3. Attention"
            hint="Months of the year backwards, starting at December. One prompt of 'what is the month before December?' is permitted."
            value={attention}
            onChange={setAttention}
            options={ATTENTION}
          />
          <ChoiceField
            label="4. Acute change or fluctuating course"
            hint="Significant change or fluctuation in alertness, cognition, or other mental function (e.g. paranoia, hallucinations) arising over the last 2 weeks and still evident in the last 24 hours. Use information from staff, case notes, carers, or your own knowledge."
            value={acuteChange}
            onChange={setAcuteChange}
            options={ACUTE_CHANGE}
          />
        </>
      }
      result={(r) => {
        const band = asText(r.working.band);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={12}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={BAND_LABEL[band] ?? band}
          />
        );
      }}
      details={(r) => (
        <Facts
          title="Points"
          items={[
            ["Alertness", fmt(r.working.alertness)],
            ["AMT4", fmt(r.working.amt4)],
            ["Attention", fmt(r.working.attention)],
            ["Acute change", fmt(r.working.acute_change)],
          ]}
        />
      )}
      summary={(r) => {
        const band = asText(r.working.band);
        return summaryText({
          heading: `4AT ${fmt(r.result)} / 12 (${BAND_LABEL[band] ?? band})`,
          interpretation: r.interpretation,
          findingsTitle: "Items",
          findings: [
            `Alertness: ${labelOf(ALERTNESS, alertness)}`,
            `AMT4: ${labelOf(AMT4, amt4)}`,
            `Attention (months backwards): ${labelOf(ATTENTION, attention)}`,
            `Acute change or fluctuating course: ${labelOf(ACUTE_CHANGE, acuteChange)}`,
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "fourat", Component: FouratCalculator };
