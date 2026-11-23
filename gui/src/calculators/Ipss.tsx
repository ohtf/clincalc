// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, Text } from "@mantine/core";
import { IconReportMedical } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  ScoreTile,
  asText,
  compact,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
  ChoiceField,
} from "../kit";

/** International Prostate Symptom Score / AUA Symptom Index (Barry 1992). */

type Item = "0" | "1" | "2" | "3" | "4" | "5";
type Qol = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "not_recorded";

const ITEMS = [
  { label: "Incomplete emptying" },
  { label: "Frequency" },
  { label: "Intermittency" },
  { label: "Urgency" },
  { label: "Weak stream" },
  { label: "Straining" },
  { label: "Nocturia", hint: "Number of times per night, 0 to 5." },
] as const;

const ITEM_OPTIONS: Choice<Item>[] = (["0", "1", "2", "3", "4", "5"] as const).map((v) => ({
  value: v,
  label: v,
}));

const QOL_OPTIONS: Choice<Qol>[] = [
  ...(["0", "1", "2", "3", "4", "5", "6"] as const).map((v) => ({ value: v, label: v })),
  { value: "not_recorded", label: "Not recorded" },
];

const BAND_COLOUR: Record<string, string> = { mild: "teal", moderate: "yellow", severe: "red" };

const unanswered = (): Array<Item | null> => ITEMS.map(() => null);

/** A horizontal row of radio options for a short scale that must start unselected. */

function IpssCalculator() {
  const [answers, setAnswers] = useState<Array<Item | null>>(unanswered);
  const [qol, setQol] = useState<Qol | null>(null);

  const complete = answers.every((a) => a !== null);
  const qolValue = qol === null || qol === "not_recorded" ? null : Number(qol);
  const calc = useCalculation(
    "ipss",
    complete
      ? compact({ responses: answers.map((a) => Number(a)), quality_of_life: qolValue })
      : null,
  );

  return (
    <CalculatorPage
      icon={IconReportMedical}
      title="IPSS"
      badge="Lower urinary tract symptoms"
      description="Seven lower urinary tract symptom items over the last month, summed to 0-35 (mild 0-7, moderate 8-19, severe 20-35), with an optional quality-of-life item reported separately (Barry 1992). Grades severity; not a diagnosis."
      onReset={() => {
        setAnswers(unanswered());
        setQol(null);
      }}
      formTitle="Symptoms over the last month"
      calc={calc}
      incomplete="Answer all seven symptom items to calculate."
      form={
        <>
          <Text size="xs" c="dimmed">
            Items 1-6: 0 = not at all, 5 = almost always. Item labels are clinical paraphrases, not
            the licensed questionnaire wording.
          </Text>
          {ITEMS.map((item, i) => (
            <ChoiceField layout="inline"
              key={item.label}
              label={`${i + 1}. ${item.label}`}
              hint={"hint" in item ? item.hint : undefined}
              value={answers[i]}
              onChange={(v) => setAnswers((prev) => prev.map((a, j) => (j === i ? v : a)))}
              options={ITEM_OPTIONS}
            />
          ))}
          <Text fw={600} size="sm" mt="xs">
            Quality of life
          </Text>
          <Divider />
          <ChoiceField layout="inline"
            label="Quality of life due to urinary symptoms"
            hint="Optional. 0 = delighted, 6 = terrible. Reported separately; not added to the symptom score."
            value={qol}
            onChange={setQol}
            options={QOL_OPTIONS}
          />
        </>
      }
      result={(r) => {
        const band = asText(r.working.severity);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={35}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={band && `${band} symptoms`}
          />
        );
      }}
      details={(r) => (
        <Facts
          items={[
            r.working.quality_of_life !== undefined && [
              "Quality of life",
              `${fmt(r.working.quality_of_life)} / 6`,
            ],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `IPSS ${fmt(r.result)} / 35 (${asText(r.working.severity)} symptoms)`,
          interpretation: r.interpretation,
          findingsTitle: "Item scores",
          findings: [
            ...ITEMS.map((item, i) => `${item.label}: ${answers[i]}`),
            qolValue !== null && `Quality of life: ${qolValue} / 6`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "ipss", Component: IpssCalculator };
