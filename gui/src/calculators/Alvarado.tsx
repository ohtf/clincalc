// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, Stack, Text } from "@mantine/core";
import { IconStethoscope } from "@tabler/icons-react";

import {
  CalculatorPage,
  ScoreTile,
  YesNoField,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** Alvarado (MANTRELS) score for suspected acute appendicitis (Alvarado 1986). */

type Key =
  | "migration_to_rlq"
  | "anorexia"
  | "nausea_or_vomiting"
  | "rlq_tenderness"
  | "rebound_tenderness"
  | "fever"
  | "leukocytosis"
  | "left_shift";
type Criterion = { key: Key; label: string; hint?: string };

const SECTIONS: Array<{ title: string; items: Criterion[] }> = [
  {
    title: "Symptoms",
    items: [
      { key: "migration_to_rlq", label: "Migration of pain to the right lower quadrant (1)" },
      { key: "anorexia", label: "Anorexia or acetone (1)" },
      { key: "nausea_or_vomiting", label: "Nausea or vomiting (1)" },
    ],
  },
  {
    title: "Signs",
    items: [
      { key: "rlq_tenderness", label: "Tenderness in the right lower quadrant (2)" },
      { key: "rebound_tenderness", label: "Rebound pain or tenderness (1)" },
      { key: "fever", label: "Elevated temperature (1)" },
    ],
  },
  {
    title: "Laboratory",
    items: [
      { key: "leukocytosis", label: "Leukocytosis (2)" },
      { key: "left_shift", label: "Left shift of neutrophil maturation (1)" },
    ],
  },
];

const CRITERIA = SECTIONS.flatMap((s) => s.items);
type Criteria = Record<Key, boolean>;

const noneTicked = (): Criteria =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, false])) as Criteria;

const BAND_LABEL: Record<string, string> = {
  unlikely: "Unlikely",
  possible: "Possible",
  probable: "Probable",
  very_probable: "Very probable",
};
const BAND_COLOUR: Record<string, string> = {
  unlikely: "teal",
  possible: "yellow",
  probable: "orange",
  very_probable: "red",
};

function AlvaradoCalculator() {
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);
  const calc = useCalculation("alvarado", criteria);

  return (
    <CalculatorPage
      icon={IconStethoscope}
      title="Alvarado score"
      badge="Suspected appendicitis"
      description="MANTRELS score (0-10) for suspected acute appendicitis from three symptoms, three signs, and two laboratory findings (Alvarado 1986). It does not exclude appendicitis."
      onReset={() => setCriteria(noneTicked())}
      formTitle="Tick each finding that is present"
      calc={calc}
      form={
        <>
          {SECTIONS.map((s, i) => (
            <Stack key={s.title} gap="sm">
              {i > 0 && <Divider />}
              <Text fw={600} size="sm">
                {s.title}
              </Text>
              {s.items.map((c) => (
                <YesNoField
                  key={c.key}
                  label={c.label}
                  hint={c.hint}
                  checked={criteria[c.key]}
                  onChange={(checked) => setCriteria((prev) => ({ ...prev, [c.key]: checked }))}
                />
              ))}
            </Stack>
          ))}
        </>
      }
      result={(r) => {
        const band = asText(r.working.probability_band);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={10}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={BAND_LABEL[band] ?? band}
          />
        );
      }}
      summary={(r) => {
        const band = asText(r.working.probability_band);
        return summaryText({
          heading: `Alvarado score ${fmt(r.result)} / 10 (${(BAND_LABEL[band] ?? band).toLowerCase()})`,
          interpretation: r.interpretation,
          findingsTitle: "Findings present",
          findings: CRITERIA.filter((c) => criteria[c.key]).map((c) => c.label),
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "alvarado", Component: AlvaradoCalculator };
