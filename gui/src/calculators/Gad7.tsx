// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Radio, SimpleGrid } from "@mantine/core";
import { IconMoodNervous } from "@tabler/icons-react";

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

/** GAD-7 anxiety severity (Spitzer, Kroenke, Williams & Löwe 2006). */

const ITEMS = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it is hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid as if something awful might happen",
];

const OPTIONS: Choice<string>[] = [
  { value: "0", label: "Not at all (0)" },
  { value: "1", label: "Several days (1)" },
  { value: "2", label: "More than half the days (2)" },
  { value: "3", label: "Nearly every day (3)" },
];

const BAND_COLOUR: Record<string, string> = {
  minimal: "teal",
  mild: "yellow",
  moderate: "orange",
  severe: "red",
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

function Gad7Calculator() {
  const [answers, setAnswers] = useState<Array<string | null>>(blank);

  const complete = answers.every((a) => a !== null);
  const calc = useCalculation("gad7", complete ? { responses: answers.map(Number) } : null);

  const optionLabel = (v: string | null) => OPTIONS.find((o) => o.value === v)?.label ?? "";

  return (
    <CalculatorPage
      icon={IconMoodNervous}
      title="GAD-7"
      badge="Anxiety severity"
      description="Seven-item generalised anxiety severity score over the last 2 weeks (Spitzer 2006). A total of 10 or more is the cut-point for likely generalised anxiety disorder. Public domain - released by Pfizer."
      onReset={() => setAnswers(blank())}
      formTitle="Over the last 2 weeks, how often have you been bothered by the following problems?"
      calc={calc}
      incomplete="Answer all seven items to calculate."
      form={
        <>
          {ITEMS.map((item, i) => (
            <ItemField
              key={item}
              label={`${i + 1}. ${item}`}
              value={answers[i]}
              onChange={(v) => setAnswers((prev) => prev.map((a, j) => (j === i ? v : a)))}
              options={OPTIONS}
            />
          ))}
        </>
      }
      result={(r) => {
        const band = asText(r.working.severity);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={21}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={band && `${band} anxiety`}
          />
        );
      }}
      details={(r) => (
        <Facts
          items={[
            ["Cut-point of 10", r.working.above_case_threshold === true ? "at or above" : "below"],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `GAD-7 ${fmt(r.result)} / 21 (${asText(r.working.severity)} anxiety)`,
          interpretation: r.interpretation,
          findingsTitle: "Responses (last 2 weeks)",
          findings: ITEMS.map((item, i) => `${item}: ${optionLabel(answers[i])}`),
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "gad7", Component: Gad7Calculator };
