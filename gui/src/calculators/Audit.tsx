// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Radio, SimpleGrid, Text } from "@mantine/core";
import { IconGlassFull } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** AUDIT, the WHO ten-item alcohol use screen (Saunders 1993; Babor 2001). */

const scale = (labels: string[]): Choice<string>[] =>
  labels.map((label, i) => ({ value: String(i), label: `${label} (${i})` }));

const FREQUENCY = scale([
  "Never",
  "Less than monthly",
  "Monthly",
  "Weekly",
  "Daily or almost daily",
]);

const HARM: Choice<string>[] = [
  { value: "0", label: "No (0)" },
  { value: "2", label: "Yes, but not in the last year (2)" },
  { value: "4", label: "Yes, during the last year (4)" },
];

const ITEMS: Array<{ text: string; options: Choice<string>[] }> = [
  {
    text: "How often do you have a drink containing alcohol?",
    options: scale([
      "Never",
      "Monthly or less",
      "2-4 times a month",
      "2-3 times a week",
      "4 or more times a week",
    ]),
  },
  {
    text: "How many drinks containing alcohol do you have on a typical day when you are drinking?",
    options: scale(["1 or 2", "3 or 4", "5 or 6", "7 to 9", "10 or more"]),
  },
  { text: "How often do you have six or more drinks on one occasion?", options: FREQUENCY },
  {
    text: "How often during the last year have you found that you were not able to stop drinking once you had started?",
    options: FREQUENCY,
  },
  {
    text: "How often during the last year have you failed to do what was normally expected of you because of drinking?",
    options: FREQUENCY,
  },
  {
    text: "How often during the last year have you needed a first drink in the morning to get yourself going after a heavy drinking session?",
    options: FREQUENCY,
  },
  {
    text: "How often during the last year have you had a feeling of guilt or remorse after drinking?",
    options: FREQUENCY,
  },
  {
    text: "How often during the last year have you been unable to remember what happened the night before because of your drinking?",
    options: FREQUENCY,
  },
  { text: "Have you or someone else been injured because of your drinking?", options: HARM },
  {
    text: "Has a relative, friend, doctor, or other health care worker been concerned about your drinking or suggested you cut down?",
    options: HARM,
  },
];

const ZONE_COLOUR: Record<string, string> = {
  "Zone I": "teal",
  "Zone II": "yellow",
  "Zone III": "orange",
  "Zone IV": "red",
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
      <SimpleGrid cols={options.length === 3 ? 1 : 2} spacing="xs" verticalSpacing={6} mt={6}>
        {options.map((o) => (
          <Radio key={o.value} value={o.value} label={o.label} />
        ))}
      </SimpleGrid>
    </Radio.Group>
  );
}

function AuditCalculator() {
  const [answers, setAnswers] = useState<Array<string | null>>(blank);

  const complete = answers.every((a) => a !== null);
  const calc = useCalculation("audit", complete ? { responses: answers.map(Number) } : null);

  const answerLabel = (i: number) =>
    ITEMS[i].options.find((o) => o.value === answers[i])?.label ?? "";

  return (
    <CalculatorPage
      icon={IconGlassFull}
      title="AUDIT"
      badge="Alcohol use screen"
      description="The WHO Alcohol Use Disorders Identification Test: ten items scored 0-40 and read against four risk zones (Saunders 1993; Babor 2001). A WHO-approved, public-domain screening instrument; it is not a diagnosis."
      onReset={() => setAnswers(blank())}
      calc={calc}
      incomplete="Answer all ten questions to calculate."
      form={
        <>
          <Text size="xs" c="dimmed">
            Items 1-8 score 0-4; items 9 and 10 score only 0, 2, or 4.
          </Text>
          {ITEMS.map((item, i) => (
            <ItemField
              key={item.text}
              label={`${i + 1}. ${item.text}`}
              value={answers[i]}
              onChange={(v) => setAnswers((prev) => prev.map((a, j) => (j === i ? v : a)))}
              options={item.options}
            />
          ))}
        </>
      }
      result={(r) => {
        const zone = asText(r.working.risk_zone);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={40}
            colour={ZONE_COLOUR[zone] ?? "teal"}
            badge={zone && `${zone}: ${asText(r.working.risk_level)}`}
          />
        );
      }}
      details={() => (
        <Facts
          title="Item scores"
          items={ITEMS.map((_, i) => [`Q${i + 1}`, answers[i] ?? ""] as [string, string])}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `AUDIT ${fmt(r.result)} / 40 (${asText(r.working.risk_zone)}: ${asText(r.working.risk_level)})`,
          interpretation: r.interpretation,
          findingsTitle: "Responses",
          findings: ITEMS.map((item, i) => `Q${i + 1} ${item.text} ${answerLabel(i)}`),
          extra: ["AUDIT is a WHO-approved instrument."],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "audit", Component: AuditCalculator };
