// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, Radio, SimpleGrid } from "@mantine/core";
import { IconBeer } from "@tabler/icons-react";

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

/** AUDIT-C alcohol consumption screen (Bush 1998; Bradley 2007 in women). */

type Sex = "male" | "female";

const scale = (labels: string[]): Choice<string>[] =>
  labels.map((label, i) => ({ value: String(i), label: `${label} (${i})` }));

const ITEMS: Array<{ text: string; options: Choice<string>[] }> = [
  {
    text: "How often do you have a drink containing alcohol?",
    options: scale([
      "Never",
      "Monthly or less",
      "2-4 times a month",
      "2-3 times a week",
      "4+ times a week",
    ]),
  },
  {
    text: "How many standard drinks containing alcohol do you have on a typical day when drinking?",
    options: scale(["1-2", "3-4", "5-6", "7-9", "10+"]),
  },
  {
    text: "How often do you have six or more drinks on one occasion?",
    options: scale(["Never", "Less than monthly", "Monthly", "Weekly", "Daily or almost daily"]),
  },
];

const SEX: Choice<Sex>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const BAND_COLOUR: Record<string, string> = {
  "lower risk": "teal",
  "increasing risk": "yellow",
  "higher risk": "orange",
  "possible dependence": "red",
};

const blank = () => ITEMS.map(() => null as string | null);

function ItemField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  options: Choice<string>[];
}) {
  return (
    <Radio.Group label={label} value={value} onChange={onChange}>
      <SimpleGrid cols={2} spacing="xs" verticalSpacing={6} mt={6}>
        {options.map((o) => (
          <Radio key={o.value} value={o.value} label={o.label} />
        ))}
      </SimpleGrid>
    </Radio.Group>
  );
}

function AuditcCalculator() {
  const [answers, setAnswers] = useState<Array<string | null>>(blank);
  const [sex, setSex] = useState<Sex | null>(null);

  const complete = sex !== null && answers.every((a) => a !== null);
  const calc = useCalculation("auditc", complete ? { responses: answers.map(Number), sex } : null);

  const answerLabel = (i: number) =>
    ITEMS[i].options.find((o) => o.value === answers[i])?.label ?? "";

  return (
    <CalculatorPage
      icon={IconBeer}
      title="AUDIT-C"
      badge="Alcohol consumption"
      description="The three consumption questions of the WHO AUDIT, scored 0-12 (Bush 1998). The validated positive cut-point is 4 or more in men and 3 or more in women. A screen for hazardous drinking, not a diagnosis."
      onReset={() => {
        setAnswers(blank());
        setSex(null);
      }}
      calc={calc}
      incomplete="Answer all three questions and select the patient's sex to calculate."
      form={
        <>
          {ITEMS.map((item, i) => (
            <ItemField
              key={item.text}
              label={`${i + 1}. ${item.text}`}
              value={answers[i]}
              onChange={(v) => setAnswers((prev) => prev.map((a, j) => (j === i ? v : a)))}
              options={item.options}
            />
          ))}
          <Divider />
          <ChoiceField
            label="Sex"
            hint="Selects the validated positive cut-point: 4 or more for male, 3 or more for female."
            value={sex}
            onChange={setSex}
            options={SEX}
          />
        </>
      }
      result={(r) => {
        const band = asText(r.working.risk_band);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={12}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={band}
          />
        );
      }}
      details={(r) => (
        <Facts
          items={[
            [
              "Screen",
              `${r.working.screen_positive === true ? "positive" : "negative"} (cut-point ${fmt(r.working.threshold)}, ${asText(r.working.sex)})`,
            ],
            [
              "Higher-specificity cut-point of 5",
              r.working.above_higher_specificity_threshold === true ? "at or above" : "below",
            ],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `AUDIT-C ${fmt(r.result)} / 12 (${asText(r.working.risk_band)}; screen ${r.working.screen_positive === true ? "positive" : "negative"})`,
          interpretation: r.interpretation,
          findingsTitle: "Responses",
          findings: [...ITEMS.map((item, i) => `${item.text} ${answerLabel(i)}`), `Sex: ${sex}`],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "auditc", Component: AuditcCalculator };
