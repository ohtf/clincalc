// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Anchor, Divider, Radio, SimpleGrid, Text } from "@mantine/core";
import { IconFocus2 } from "@tabler/icons-react";

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

/** ASRS-v1.1 six-question adult ADHD screener (Kessler 2005, 2007). */

type YesNo = "yes" | "no";

const OFFICIAL_FORM = "https://license.tov.med.nyu.edu/product/asrs6Qscreener";
const ATTRIBUTION =
  "The 6-question Adult Self-Report Scale-Version1.1 (ASRS-V1.1) Screener is a subset of the 18-question Adult ADHD Self-Report Scale-Version1.1 (Adult ASRSV1.1) Symptom Checklist. © New York University and the President and Fellows of Harvard College.";

const OPTIONS: Choice<string>[] = ["Never", "Rarely", "Sometimes", "Often", "Very Often"].map(
  (label, i) => ({ value: String(i), label: `${label} (${i})` }),
);

const YES_NO: Choice<YesNo>[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const ITEM_COUNT = 6;
const blank = () => Array.from({ length: ITEM_COUNT }, () => null as string | null);

const optionLabel = (v: string | null) => OPTIONS.find((o) => o.value === v)?.label ?? "";

function ItemField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <Radio.Group label={label} value={value} onChange={onChange}>
      <SimpleGrid cols={3} spacing="xs" verticalSpacing={6} mt={6}>
        {OPTIONS.map((o) => (
          <Radio key={o.value} value={o.value} label={o.label} />
        ))}
      </SimpleGrid>
    </Radio.Group>
  );
}

function AsrsCalculator() {
  const [adult, setAdult] = useState<YesNo | null>(null);
  const [sixMonths, setSixMonths] = useState<YesNo | null>(null);
  const [answers, setAnswers] = useState<Array<string | null>>(blank);

  const complete = adult === "yes" && sixMonths === "yes" && answers.every((a) => a !== null);
  const calc = useCalculation(
    "asrs",
    complete
      ? {
          age_at_least_18: true,
          responses_cover_past_six_months: true,
          responses: answers.map(Number),
        }
      : null,
  );

  const incomplete =
    adult === "no"
      ? "The ASRS-v1.1 six-question screener is an adult instrument: it is only scored for respondents aged 18 or older."
      : sixMonths === "no"
        ? "ASRS-v1.1 responses must describe the past six months, as the authorised form requires; record them over that period to score."
        : "Confirm both eligibility questions and enter all six responses to calculate.";

  return (
    <CalculatorPage
      icon={IconFocus2}
      title="ASRS-v1.1 screener"
      badge="Adult ADHD screen"
      description={
        <>
          Scores the six-question Adult ADHD Self-Report Scale screener by both official methods
          (Kessler 2005, 2007). The questionnaire wording is not reproduced here: enter the response
          codes from the{" "}
          <Anchor href={OFFICIAL_FORM} target="_blank" rel="noreferrer" size="sm">
            authorised ASRS-v1.1 form
          </Anchor>
          , in its item order. © New York University and the President and Fellows of Harvard
          College.
        </>
      }
      onReset={() => {
        setAdult(null);
        setSixMonths(null);
        setAnswers(blank());
      }}
      calc={calc}
      incomplete={incomplete}
      form={
        <>
          <ChoiceField
            label="Is the respondent aged 18 years or older?"
            hint="The six-question screener is an adult instrument."
            value={adult}
            onChange={setAdult}
            options={YES_NO}
          />
          <ChoiceField
            label="Do all six responses describe the past six months?"
            hint="The recall period the authorised form requires."
            value={sixMonths}
            onChange={setSixMonths}
            options={YES_NO}
          />
          <Divider />
          <Text size="xs" c="dimmed">
            Response codes for items 1-6 of the authorised form, in official order. Do not reorder,
            translate, or reword the items.
          </Text>
          {answers.map((a, i) => (
            <ItemField
              key={i}
              label={`Item ${i + 1}`}
              value={a}
              onChange={(v) => setAnswers((prev) => prev.map((x, j) => (j === i ? v : x)))}
            />
          ))}
        </>
      }
      result={(r) => {
        const positive = asText(r.working.classic_dichotomous_screen_result) === "POSITIVE";
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={6}
            colour={positive ? "orange" : "teal"}
            badge={`Classic screen ${positive ? "positive" : "negative"}`}
          />
        );
      }}
      details={(r) => (
        <Facts
          items={[
            [
              "Classic threshold-positive items",
              `${fmt(r.working.classic_dichotomous_positive_item_count)} / 6 (4 required)`,
            ],
            ["Continuous total", `${fmt(r.working.continuous_total_score)} / 24 (14 required)`],
            ["Continuous screen", asText(r.working.continuous_total_screen_result).toLowerCase()],
            ["Continuous stratum", asText(r.working.continuous_total_stratum).replace(/_/g, " ")],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `ASRS-v1.1 screener: classic method ${asText(r.working.classic_dichotomous_screen_result).toLowerCase()} (${fmt(r.result)}/6 threshold-positive items); continuous total ${fmt(r.working.continuous_total_score)}/24 (${asText(r.working.continuous_total_screen_result).toLowerCase()})`,
          interpretation: r.interpretation,
          findingsTitle: "Response codes (past six months, adult respondent)",
          findings: answers.map((a, i) => `Item ${i + 1}: ${optionLabel(a)}`),
          extra: [asText(r.working.attribution) || ATTRIBUTION],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "asrs", Component: AsrsCalculator };
