// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Alert, Divider, Radio, SimpleGrid, Text } from "@mantine/core";
import { IconAlertCircle, IconBabyCarriage } from "@tabler/icons-react";

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

/** Edinburgh Postnatal Depression Scale (Cox, Holden & Sagovsky 1987). */

const ITEMS: Array<{ text: string; reverse: boolean }> = [
  { text: "I have been able to laugh and see the funny side of things", reverse: false },
  { text: "I have looked forward with enjoyment to things", reverse: false },
  { text: "I have blamed myself unnecessarily when things went wrong", reverse: true },
  { text: "I have been anxious or worried for no good reason", reverse: false },
  { text: "I have felt scared or panicky for no very good reason", reverse: true },
  { text: "Things have been getting on top of me", reverse: true },
  { text: "I have been so unhappy that I have had difficulty sleeping", reverse: true },
  { text: "I have felt sad or miserable", reverse: true },
  { text: "I have been so unhappy that I have been crying", reverse: true },
  { text: "The thought of harming myself has occurred to me", reverse: true },
];

const SELF_HARM_ITEM = 9;
const POSITIONS = ["1st", "2nd", "3rd", "4th"];

const optionsFor = (reverse: boolean): Choice<string>[] =>
  POSITIONS.map((position, i) => {
    const score = reverse ? 3 - i : i;
    return { value: String(score), label: `${position} answer (scores ${score})` };
  });

const LIKELIHOOD: Record<string, { label: string; colour: string }> = {
  unlikely: { label: "depression unlikely", colour: "teal" },
  possible: { label: "possible depression", colour: "orange" },
  probable: { label: "probable depression", colour: "red" },
};

const blank = () => ITEMS.map(() => null as string | null);

function ItemField({
  label,
  value,
  onChange,
  options,
  emphasise,
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  options: Choice<string>[];
  emphasise?: boolean;
}) {
  return (
    <Radio.Group
      label={label}
      value={value}
      onChange={onChange}
      styles={emphasise ? { label: { color: "var(--mantine-color-red-7)" } } : undefined}
    >
      <SimpleGrid cols={2} spacing="xs" verticalSpacing={6} mt={6}>
        {options.map((o) => (
          <Radio
            key={o.value}
            value={o.value}
            label={o.label}
            color={emphasise ? "red" : undefined}
          />
        ))}
      </SimpleGrid>
    </Radio.Group>
  );
}

function EpdsCalculator() {
  const [answers, setAnswers] = useState<Array<string | null>>(blank);

  const complete = answers.every((a) => a !== null);
  const calc = useCalculation("epds", complete ? { responses: answers.map(Number) } : null);

  const position = (i: number) => {
    const score = Number(answers[i]);
    return POSITIONS[ITEMS[i].reverse ? 3 - score : score];
  };

  return (
    <CalculatorPage
      icon={IconBabyCarriage}
      title="EPDS"
      badge="Perinatal depression"
      description="Edinburgh Postnatal Depression Scale: ten items about the last 7 days, scored 0-30 (Cox, Holden & Sagovsky 1987). 10 or more suggests possible and 13 or more probable depression; item 10 flags self-harm risk on its own."
      onReset={() => setAnswers(blank())}
      formTitle="In the past 7 days"
      calc={calc}
      incomplete="Answer all ten items to calculate."
      form={
        <>
          <Text size="xs" c="dimmed">
            For each item, pick the answer the respondent ticked on the printed EPDS, counting the
            four answers from the top. The form applies the EPDS scoring key: items 1, 2 and 4 score
            0-1-2-3 down the page; items 3 and 5-10 are reverse scored 3-2-1-0.
          </Text>
          {ITEMS.map((item, i) => (
            <div key={item.text}>
              {i === SELF_HARM_ITEM && <Divider mb="md" />}
              <ItemField
                label={`${i + 1}. ${item.text}${item.reverse ? " (reverse scored)" : ""}`}
                value={answers[i]}
                onChange={(v) => setAnswers((prev) => prev.map((a, j) => (j === i ? v : a)))}
                options={optionsFor(item.reverse)}
                emphasise={i === SELF_HARM_ITEM}
              />
            </div>
          ))}
        </>
      }
      result={(r) => {
        const band = LIKELIHOOD[asText(r.working.likelihood)];
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={30}
            colour={band?.colour ?? "teal"}
            badge={band?.label}
          />
        );
      }}
      details={(r) => (
        <>
          {r.working.self_harm_item_flag === true && (
            <Alert
              color="red"
              variant="light"
              icon={<IconAlertCircle size={18} />}
              title="Item 10 positive"
            >
              Thoughts of self-harm reported - a suicide-risk assessment is indicated regardless of
              the total score.
            </Alert>
          )}
          <Facts
            title="Item scores"
            items={ITEMS.map((_, i) => [`Q${i + 1}`, answers[i] ?? ""] as [string, string])}
          />
        </>
      )}
      summary={(r) =>
        summaryText({
          heading: `EPDS ${fmt(r.result)} / 30 (${LIKELIHOOD[asText(r.working.likelihood)]?.label ?? asText(r.working.likelihood)})`,
          interpretation: r.interpretation,
          findingsTitle: "Item scores (past 7 days)",
          findings: ITEMS.map(
            (item, i) => `Q${i + 1} ${item.text}: ${answers[i]} (${position(i)} answer)`,
          ),
          extra: [
            r.working.self_harm_item_flag === true
              ? "Item 10 (thoughts of self-harm) positive: suicide-risk assessment indicated."
              : "Item 10 (thoughts of self-harm): scored 0.",
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "epds", Component: EpdsCalculator };
