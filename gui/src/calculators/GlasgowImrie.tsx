// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, Text } from "@mantine/core";
import { IconFlame } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  ScoreTile,
  YesNoField,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** Glasgow-Imrie criteria for acute pancreatitis at 48 hours (Blamey 1984). */

const CRITERIA = [
  { key: "age_over_55_years", label: "Age over 55 years" },
  { key: "pao2_under_8kpa", label: "PaO2 under 8 kPa", hint: "Under 60 mmHg." },
  { key: "wbc_over_15_x10_9_per_l", label: "White cell count over 15 x10⁹/L" },
  { key: "calcium_under_2_mmol_l", label: "Calcium under 2 mmol/L", hint: "Under 8 mg/dL." },
  {
    key: "urea_over_16_mmol_l",
    label: "Urea over 16 mmol/L",
    hint: "With no response to IV fluids.",
  },
] as const;

const ENZYMES = [
  { key: "ldh_over_600_iu_l", label: "LDH over 600 IU/L" },
  { key: "ast_over_200_iu_l", label: "AST over 200 IU/L" },
] as const;

const LATER = [
  { key: "albumin_under_32_g_l", label: "Albumin under 32 g/L", hint: "Under 3.2 g/dL." },
  { key: "glucose_over_10_mmol_l", label: "Glucose over 10 mmol/L", hint: "Over 180 mg/dL." },
] as const;

const ALL = [...CRITERIA, ...ENZYMES, ...LATER];
type Key = (typeof ALL)[number]["key"];
type Criteria = Record<Key, boolean>;

const noneTicked = (): Criteria => Object.fromEntries(ALL.map((c) => [c.key, false])) as Criteria;

function GlasgowImrieCalculator() {
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);
  const calc = useCalculation("glasgow_imrie", criteria);

  const field = (c: { key: Key; label: string; hint?: string }) => (
    <YesNoField
      key={c.key}
      label={c.label}
      hint={c.hint}
      checked={criteria[c.key]}
      onChange={(checked) => setCriteria((prev) => ({ ...prev, [c.key]: checked }))}
    />
  );

  return (
    <CalculatorPage
      icon={IconFlame}
      title="Glasgow-Imrie criteria"
      badge="Acute pancreatitis"
      description="Eight-criterion severity score for acute pancreatitis, assessed once at 48 hours after admission; 3 or more predicts severe disease (Blamey 1984)."
      onReset={() => setCriteria(noneTicked())}
      formTitle="Tick each criterion met at 48 hours (peak or trough values)"
      calc={calc}
      form={
        <>
          {CRITERIA.map(field)}
          <Text fw={600} size="sm" mt="xs">
            Enzymes - 1 point if either is met
          </Text>
          <Divider />
          {ENZYMES.map(field)}
          <Divider />
          {LATER.map(field)}
        </>
      }
      result={(r) => {
        const severe = r.working.predicts_severe_disease === true;
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={8}
            colour={severe ? "red" : "teal"}
            badge={severe ? "predicts severe" : "below severe cutoff"}
          />
        );
      }}
      details={(r) => (
        <Facts items={[["Enzymes criterion", r.working.enzymes_criterion === true ? "met" : "not met"]]} />
      )}
      summary={(r) =>
        summaryText({
          heading: `Glasgow-Imrie score ${fmt(r.result)} / 8 at 48 hours (${r.working.predicts_severe_disease === true ? "predicts severe pancreatitis" : "below the severe cutoff"})`,
          interpretation: r.interpretation,
          findingsTitle: "Criteria met",
          findings: ALL.filter((c) => criteria[c.key]).map((c) => c.label),
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "glasgow_imrie",
  Component: GlasgowImrieCalculator,
};
