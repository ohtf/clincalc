// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Alert, Box, SegmentedControl, Text } from "@mantine/core";
import { IconAlertCircle, IconMoodSad } from "@tabler/icons-react";

import {
  CalculatorPage,
  ScoreTile,
  asText,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/**
 * PHQ-9 depression severity over the last two weeks (Kroenke, Spitzer &
 * Williams 2001; public domain, Pfizer). Item 9 (thoughts of self-harm) is a
 * safety item, visually separated and flagged independently of the total.
 */

const ITEMS = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself - or that you are a failure, or have let yourself or your family down",
  "Trouble concentrating on things, such as reading or watching television",
  "Moving or speaking so slowly that other people could have noticed, or being so fidgety or restless that you have been moving a lot more than usual",
  "Thoughts that you would be better off dead, or of hurting yourself in some way",
];

const RESPONSE_OPTIONS = [
  { value: "0", label: "Not at all" },
  { value: "1", label: "Several days" },
  { value: "2", label: "More than half the days" },
  { value: "3", label: "Nearly every day" },
];

const SELF_HARM_ITEM = 8;

type Answers = Array<number | null>;

const unanswered = (): Answers => Array<number | null>(ITEMS.length).fill(null);

const SEVERITY_LABEL: Record<string, string> = {
  "none-minimal": "none-minimal",
  mild: "mild",
  moderate: "moderate",
  "moderately-severe": "moderately severe",
  severe: "severe",
};

const severityLabel = (slug: string) => SEVERITY_LABEL[slug] ?? slug;

function severityColour(slug: string): string {
  if (slug === "severe" || slug === "moderately-severe") return "red";
  if (slug === "moderate") return "yellow";
  if (slug === "mild") return "yellow";
  return "teal";
}

export function Phq9Calculator() {
  const [answers, setAnswers] = useState<Answers>(unanswered);

  const answered = answers.filter((a) => a !== null).length;
  const complete = answered === ITEMS.length;
  const calc = useCalculation("phq9", complete ? { responses: answers } : null);

  const setItem = (index: number, value: number) =>
    setAnswers((prev) => prev.map((a, i) => (i === index ? value : a)));

  return (
    <CalculatorPage
      icon={IconMoodSad}
      title="PHQ-9"
      badge="Depression severity"
      description="Nine-item depression severity score over the last two weeks (Kroenke, Spitzer & Williams 2001). Public domain - released by Pfizer."
      onReset={() => setAnswers(unanswered())}
      formTitle="Over the last 2 weeks, how often have you been bothered by:"
      calc={calc}
      maw={980}
      incomplete={`Answer all nine questions to calculate (${answered} of 9 answered).`}
      form={ITEMS.map((item, i) => (
        <Box key={i}>
          <Text
            size="sm"
            fw={i === SELF_HARM_ITEM ? 600 : 400}
            c={i === SELF_HARM_ITEM ? "red" : undefined}
            mb={6}
          >
            Q{i + 1}. {item}
          </Text>
          <SegmentedControl
            fullWidth
            size="xs"
            value={answers[i] === null ? "" : String(answers[i])}
            onChange={(value) => setItem(i, Number(value))}
            data={RESPONSE_OPTIONS}
            color={i === SELF_HARM_ITEM ? "red" : "teal"}
          />
        </Box>
      ))}
      result={(r) => {
        const slug = asText(r.working.severity);
        return (
          <>
            <ScoreTile
              value={asText(r.result)}
              outOf={27}
              colour={severityColour(slug)}
              badge={severityLabel(slug) || "—"}
            />
            {r.working.self_harm_item_flag === true && (
              <Alert color="red" icon={<IconAlertCircle size={18} />} title="Item 9 positive">
                Thoughts of self-harm reported - a risk assessment is indicated regardless of the
                total score.
              </Alert>
            )}
          </>
        );
      }}
      summary={(r) =>
        summaryText({
          heading: `PHQ-9 ${asText(r.result)} / 27 (${severityLabel(asText(r.working.severity))})`,
          interpretation: r.interpretation,
          extra: [
            (r.working.self_harm_item_flag === true
              ? "** Item 9 positive: suicide-risk assessment indicated **"
              : "Item 9 (self-harm): negative.") + "\n",
            ...ITEMS.map(
              (item, i) =>
                `Q${i + 1} (${answers[i]}/3): ${item.slice(0, 60)}${item.length > 60 ? "..." : ""}`,
            ),
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "phq9", Component: Phq9Calculator };
