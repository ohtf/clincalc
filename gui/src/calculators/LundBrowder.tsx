// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Button, Divider, Group, SimpleGrid, Text } from "@mantine/core";
import { IconFlame } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** Lund and Browder chart, age-adjusted %TBSA burned (Lund & Browder 1944). */

const REGIONS = [
  { key: "head", label: "Head", hint: "Face and scalp." },
  { key: "neck", label: "Neck" },
  { key: "anterior_trunk", label: "Anterior trunk", hint: "Chest and abdomen." },
  { key: "posterior_trunk", label: "Posterior trunk", hint: "Upper and lower back." },
  { key: "right_buttock", label: "Right buttock" },
  { key: "left_buttock", label: "Left buttock" },
  { key: "genitalia", label: "Genitalia" },
  { key: "right_upper_arm", label: "Right upper arm" },
  { key: "left_upper_arm", label: "Left upper arm" },
  { key: "right_lower_arm", label: "Right lower arm", hint: "Forearm." },
  { key: "left_lower_arm", label: "Left lower arm", hint: "Forearm." },
  { key: "right_hand", label: "Right hand" },
  { key: "left_hand", label: "Left hand" },
  { key: "right_thigh", label: "Right thigh" },
  { key: "left_thigh", label: "Left thigh" },
  { key: "right_lower_leg", label: "Right lower leg", hint: "Calf and shin." },
  { key: "left_lower_leg", label: "Left lower leg", hint: "Calf and shin." },
  { key: "right_foot", label: "Right foot" },
  { key: "left_foot", label: "Left foot" },
] as const;

type Region = (typeof REGIONS)[number]["key"];
type Fractions = Record<Region, number | null>;

const GROUPS: Array<{ title: string; regions: Region[] }> = [
  { title: "Head and neck", regions: ["head", "neck"] },
  {
    title: "Trunk",
    regions: ["anterior_trunk", "posterior_trunk", "right_buttock", "left_buttock", "genitalia"],
  },
  {
    title: "Arms",
    regions: [
      "right_upper_arm",
      "left_upper_arm",
      "right_lower_arm",
      "left_lower_arm",
      "right_hand",
      "left_hand",
    ],
  },
  {
    title: "Legs",
    regions: [
      "right_thigh",
      "left_thigh",
      "right_lower_leg",
      "left_lower_leg",
      "right_foot",
      "left_foot",
    ],
  },
];

const BY_KEY = Object.fromEntries(REGIONS.map((r) => [r.key, r])) as Record<
  Region,
  { key: Region; label: string; hint?: string }
>;

const AGE = { min: 0, max: 130 };
const FRACTION = { min: 0, max: 1 };

const AGE_BAND: Record<string, string> = {
  under_1_year: "Under 1 year",
  "1_to_4_years": "1-4 years",
  "5_to_9_years": "5-9 years",
  "10_to_14_years": "10-14 years",
  "15_years": "15 years",
  adult_16_plus: "Adult, 16 and over",
};

const empty = (): Fractions =>
  Object.fromEntries(REGIONS.map((r) => [r.key, null])) as Fractions;

function LundBrowderCalculator() {
  const [age, setAge] = useState<number | null>(null);
  const [fractions, setFractions] = useState<Fractions>(empty);

  const allEntered = REGIONS.every((r) => inRange(fractions[r.key], FRACTION.min, FRACTION.max));
  const complete = inRange(age, AGE.min, AGE.max) && allEntered;
  const remaining = REGIONS.filter((r) => fractions[r.key] === null).length;

  const calc = useCalculation(
    "lund_browder",
    complete
      ? {
          age_years: age,
          ...Object.fromEntries(REGIONS.map((r) => [`${r.key}_fraction_burned`, fractions[r.key]])),
        }
      : null,
  );

  const setRegion = (key: Region) => (v: number | null) =>
    setFractions((prev) => ({ ...prev, [key]: v }));

  return (
    <CalculatorPage
      icon={IconFlame}
      title="Lund and Browder chart"
      badge="Burn area"
      description="Age-adjusted estimate of total body surface area burned from 19 body regions (Lund & Browder 1944). Each region is entered as the fraction of that region burned; the chart adjusts head, thigh, and lower-leg percentages for age."
      onReset={() => {
        setAge(null);
        setFractions(empty());
      }}
      calc={calc}
      incomplete={`Enter age and the fraction burned for every region (0 if unburned)${remaining > 0 ? ` - ${remaining} region${remaining === 1 ? "" : "s"} still empty` : ""}.`}
      form={
        <>
          <NumberField
            label="Age"
            hint="Selects the chart's age band: under 1, 1-4, 5-9, 10-14, 15, or adult (16 and over)."
            unit="years"
            value={age}
            onChange={setAge}
            min={AGE.min}
            max={AGE.max}
            decimals={1}
          />
          <Divider />
          <Group justify="space-between" align="flex-end" wrap="wrap" gap="xs">
            <Text size="sm" c="dimmed" style={{ flex: 1, minWidth: 220 }}>
              Fraction of each region burned: 0 none, 0.5 half, 1 the whole region.
            </Text>
            <Button
              variant="light"
              color="gray"
              size="xs"
              disabled={remaining === 0}
              onClick={() =>
                setFractions((prev) =>
                  Object.fromEntries(
                    REGIONS.map((r) => [r.key, prev[r.key] === null ? 0 : prev[r.key]]),
                  ) as Fractions,
                )
              }
            >
              Mark empty regions unburned (0)
            </Button>
          </Group>
          {GROUPS.map((g) => (
            <div key={g.title}>
              <Text fw={600} size="sm" mb="xs">
                {g.title}
              </Text>
              <SimpleGrid cols={2} spacing="md" verticalSpacing="xs">
                {g.regions.map((key) => (
                  <NumberField
                    key={key}
                    label={BY_KEY[key].label}
                    hint={BY_KEY[key].hint}
                    unit="of region"
                    value={fractions[key]}
                    onChange={setRegion(key)}
                    min={FRACTION.min}
                    max={FRACTION.max}
                    step={0.1}
                    decimals={2}
                  />
                ))}
              </SimpleGrid>
            </div>
          ))}
        </>
      }
      result={(r) => (
        <ScoreTile
          value={fmt(r.result)}
          unit="% TBSA"
          badge={AGE_BAND[asText(r.working.age_band)] ?? asText(r.working.age_band)}
        />
      )}
      details={(r) => (
        <Facts
          title="%TBSA by region"
          items={REGIONS.filter((reg) => (fractions[reg.key] ?? 0) > 0).map((reg) => [
            reg.label,
            `${fmt(r.working[`${reg.key}_contribution_percent`])}%`,
          ])}
        />
      )}
      summary={(r) => {
        const burned = REGIONS.filter((reg) => (fractions[reg.key] ?? 0) > 0);
        return summaryText({
          heading: `Lund and Browder: ${fmt(r.result)}% TBSA burned`,
          interpretation: r.interpretation,
          findingsTitle: "Regions burned (fraction of region, %TBSA)",
          findings: burned.length
            ? burned.map(
                (reg) =>
                  `${reg.label}: ${fractions[reg.key]} (${fmt(r.working[`${reg.key}_contribution_percent`])}%)`,
              )
            : ["No region burned"],
          extra: [`Age ${age} years; chart age band: ${AGE_BAND[asText(r.working.age_band)] ?? asText(r.working.age_band)}`],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "lund_browder", Component: LundBrowderCalculator };
