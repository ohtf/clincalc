// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconDroplet } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  YesNoField,
  asText,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** Truelove and Witts' severity index for ulcerative colitis (Truelove and Witts 1955). */

const FEATURES = [
  { key: "pyrexia_over_37_8c", label: "Temperature over 37.8 °C" },
  { key: "pulse_over_90_bpm", label: "Pulse over 90 bpm" },
  { key: "anaemia", label: "Anaemia" },
  { key: "esr_over_30_mm_hr", label: "ESR over 30 mm/hr" },
] as const;

type Key = (typeof FEATURES)[number]["key"];
type Features = Record<Key, boolean>;

const STOOLS = { min: 0, max: 50 };
const noneTicked = (): Features =>
  Object.fromEntries(FEATURES.map((f) => [f.key, false])) as Features;

const SEVERITY_COLOUR: Record<string, string> = { mild: "teal", moderate: "yellow", severe: "red" };

function TrueloveWittsCalculator() {
  const [stools, setStools] = useState<number | null>(null);
  const [features, setFeatures] = useState<Features>(noneTicked);

  const complete = inRange(stools, STOOLS.min, STOOLS.max) && Number.isInteger(stools);
  const calc = useCalculation(
    "truelove_witts",
    complete ? { bloody_stools_per_day: stools, ...features } : null,
  );

  return (
    <CalculatorPage
      icon={IconDroplet}
      title="Truelove and Witts"
      badge="Ulcerative colitis flare"
      description="Mild, moderate, or severe classification of an ulcerative colitis flare. Severe needs 6 or more bloody stools a day plus at least one systemic-toxicity feature (Truelove and Witts 1955)."
      onReset={() => {
        setStools(null);
        setFeatures(noneTicked());
      }}
      calc={calc}
      incomplete="Enter the number of bloody stools per day to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Bloody stools"
              unit="per day"
              value={stools}
              onChange={setStools}
              min={STOOLS.min}
              max={STOOLS.max}
              decimals={0}
            />
          </SimpleGrid>
          <Text fw={600} size="sm" mt="xs">
            Systemic toxicity
          </Text>
          <Divider />
          {FEATURES.map((f) => (
            <YesNoField
              key={f.key}
              label={f.label}
              checked={features[f.key]}
              onChange={(checked) => setFeatures((prev) => ({ ...prev, [f.key]: checked }))}
            />
          ))}
        </>
      }
      result={(r) => {
        const severity = asText(r.result);
        return (
          <ScoreTile
            value={severity.charAt(0).toUpperCase() + severity.slice(1)}
            colour={SEVERITY_COLOUR[severity] ?? "teal"}
          />
        );
      }}
      details={(r) => (
        <Facts
          items={[
            [
              "Systemic-toxicity feature",
              r.working.systemic_toxicity_feature_present === true ? "present" : "absent",
            ],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Truelove and Witts: ${asText(r.result)} ulcerative colitis flare`,
          interpretation: r.interpretation,
          findings: [
            `${stools} bloody stools per day`,
            ...FEATURES.filter((f) => features[f.key]).map((f) => f.label),
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "truelove_witts",
  Component: TrueloveWittsCalculator,
};
