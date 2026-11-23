// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconMeat } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asNumber,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Protein target in energy restriction (Refalo, Trexler & Helms 2026, Table 3). */

type Context = "matches" | "does_not_match";
type YesNo = "yes" | "no";

const CONTEXT: Choice<Context>[] = [
  {
    value: "matches",
    label: "Energy-restricted adult undertaking resistance training",
    hint: "Age 18 or over, in a caloric deficit, and resistance training.",
  },
  {
    value: "does_not_match",
    label: "Does not match",
    hint: "For example a child, not energy restricted, pregnancy, renal or hepatic disease, an eating disorder, or serious illness.",
  },
];

const YES_NO: Choice<YesNo>[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const WEIGHT = { min: 20, max: 300 };
const FFM = { min: 10, max: 250 };

function range(floor: unknown, ceiling: unknown, unit: string): string {
  const lo = asNumber(floor);
  const hi = asNumber(ceiling);
  if (lo !== null && hi !== null) return `${fmt(lo)}-${fmt(hi)} ${unit}`;
  if (lo !== null) return `at least ${fmt(lo)} ${unit}`;
  if (hi !== null) return `up to ${fmt(hi)} ${unit}`;
  return "";
}

function headline(floor: unknown, ceiling: unknown): string {
  const lo = asNumber(floor);
  const hi = asNumber(ceiling);
  if (lo !== null && hi !== null) return `${fmt(lo)}-${fmt(hi)}`;
  if (lo !== null) return `≥ ${fmt(lo)}`;
  if (hi !== null) return `≤ ${fmt(hi)}`;
  return "";
}

function EnergyRestrictedProteinTargetCalculator() {
  const [context, setContext] = useState<Context | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [ffm, setFfm] = useState<number | null>(null);
  const [risk, setRisk] = useState<YesNo | null>(null);
  const [importance, setImportance] = useState<YesNo | null>(null);

  const ffmAboveWeight =
    inRange(weight, WEIGHT.min, WEIGHT.max) && inRange(ffm, FFM.min, FFM.max) && ffm > weight;
  const complete =
    context === "matches" &&
    inRange(weight, WEIGHT.min, WEIGHT.max) &&
    inRange(ffm, FFM.min, FFM.max) &&
    !ffmAboveWeight &&
    risk !== null &&
    importance !== null;
  const calc = useCalculation(
    "energy_restricted_protein_target",
    complete
      ? {
          evidence_context: "energy_restricted_resistance_trained_adult",
          weight_kg: weight,
          fat_free_mass_kg: ffm,
          perceived_risk_of_ffm_loss: risk === "yes",
          importance_of_ffm_retention: importance === "yes",
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconMeat}
      title="Protein target in energy restriction"
      badge="Sports nutrition"
      description="Daily protein for energy-restricted, resistance-trained adults, banded by two clinician judgements and given per kg body weight and per kg fat-free mass (Refalo, Trexler & Helms 2026, Table 3). The evidence base is mostly lean resistance-trained athletes; it is not a general dietary protein recommendation."
      onReset={() => {
        setContext(null);
        setWeight(null);
        setFfm(null);
        setRisk(null);
        setImportance(null);
      }}
      calc={calc}
      incomplete={
        context === "does_not_match"
          ? "This calculator applies only to energy-restricted adults undertaking resistance training. For adults who are not energy restricted, use the Resistance-Training Protein Intake calculator."
          : "Confirm the population, enter weight and fat-free mass, and answer both questions to calculate."
      }
      form={
        <>
          <ChoiceField label="Population" value={context} onChange={setContext} options={CONTEXT} />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Body weight"
              hint="Current total body weight."
              unit="kg"
              value={weight}
              onChange={setWeight}
              min={WEIGHT.min}
              max={WEIGHT.max}
              decimals={1}
            />
            <NumberField
              label="Fat-free mass"
              hint="From DEXA, BIA, or a skinfold estimate."
              unit="kg"
              value={ffm}
              onChange={setFfm}
              min={FFM.min}
              max={FFM.max}
              decimals={1}
            />
          </SimpleGrid>
          {ffmAboveWeight && (
            <Text size="sm" c="red">
              Fat-free mass cannot be greater than body weight - check the values.
            </Text>
          )}
          <Text fw={600} mt="xs">
            Clinician judgement
          </Text>
          <Divider />
          <ChoiceField
            label="Is the perceived risk of fat-free mass loss elevated?"
            hint="For example low body fat, a large energy deficit, or aggressive or prolonged caloric restriction - not higher body fat with a modest, well-managed deficit. A judgement, not a measured threshold."
            value={risk}
            onChange={setRisk}
            options={YES_NO}
          />
          <ChoiceField
            label="Is retaining fat-free mass a priority for this person?"
            hint="For example a competitive athlete whose sport needs strength or muscle mass, or an explicit goal of body recomposition - not weight loss as the sole goal."
            value={importance}
            onChange={setImportance}
            options={YES_NO}
          />
        </>
      }
      result={(r) => (
        <ScoreTile
          value={headline(r.working.bm_floor_g_per_day, r.working.bm_ceiling_g_per_day)}
          unit="g/day"
          badge={`${asText(r.working.band)} priority`}
        />
      )}
      details={(r) => (
        <Facts
          title="Targets"
          items={[
            [
              "By body weight",
              range(r.working.bm_floor_g_per_day, r.working.bm_ceiling_g_per_day, "g/day"),
            ],
            [
              "By fat-free mass",
              range(r.working.ffm_floor_g_per_day, r.working.ffm_ceiling_g_per_day, "g/day"),
            ],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Protein target ${range(r.working.bm_floor_g_per_day, r.working.bm_ceiling_g_per_day, "g/day")} by body weight (${asText(r.working.band)} priority for fat-free mass retention)`,
          interpretation: r.interpretation,
          findingsTitle: "Inputs",
          findings: [
            "Energy-restricted adult undertaking resistance training",
            `Body weight ${weight} kg`,
            `Fat-free mass ${ffm} kg`,
            `Perceived risk of fat-free mass loss elevated: ${risk}`,
            `Retaining fat-free mass a priority: ${importance}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "energy_restricted_protein_target",
  Component: EnergyRestrictedProteinTargetCalculator,
};
