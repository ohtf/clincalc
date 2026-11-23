// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, Text } from "@mantine/core";
import { IconFlame } from "@tabler/icons-react";

import {
  CalculatorPage,
  ScoreTile,
  YesNoField,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** Ranson's criteria for acute pancreatitis, original 11-item set (Ranson 1974). */

const SECTIONS = [
  {
    title: "On admission",
    items: [
      { key: "age_over_55_years", label: "Age over 55 years" },
      { key: "wbc_over_16000_per_mm3", label: "White cell count over 16,000/mm³" },
      {
        key: "glucose_over_200_mg_dl",
        label: "Glucose over 200 mg/dL",
        hint: "Over 11.1 mmol/L.",
      },
      { key: "ast_over_250_iu_l", label: "AST over 250 IU/L" },
      { key: "ldh_over_350_iu_l", label: "LDH over 350 IU/L" },
    ],
  },
  {
    title: "At 48 hours",
    items: [
      { key: "calcium_under_8_mg_dl", label: "Calcium under 8 mg/dL", hint: "Under 2.0 mmol/L." },
      {
        key: "hematocrit_fall_over_10_percent",
        label: "Haematocrit fall of more than 10 percentage points",
        hint: "From admission.",
      },
      { key: "pao2_under_60_mmhg", label: "PaO2 under 60 mmHg", hint: "Under 8 kPa." },
      {
        key: "bun_rise_5mg_dl_or_more_despite_iv_fluids",
        label: "BUN rise of 5 mg/dL or more despite IV fluids",
        hint: "1.8 mmol/L or more urea.",
      },
      { key: "base_deficit_over_4_meq_l", label: "Base deficit over 4 mEq/L" },
      { key: "fluid_sequestration_over_6l", label: "Estimated fluid sequestration over 6 litres" },
    ],
  },
] as const;

type Key = (typeof SECTIONS)[number]["items"][number]["key"];
type Criteria = Record<Key, boolean>;
type Item = { key: Key; label: string; hint?: string };

const ALL = SECTIONS.flatMap((s) => s.items as readonly Item[]);
const noneTicked = (): Criteria => Object.fromEntries(ALL.map((c) => [c.key, false])) as Criteria;

function RansonCalculator() {
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);
  const calc = useCalculation("ranson", criteria);

  return (
    <CalculatorPage
      icon={IconFlame}
      title="Ranson's criteria"
      badge="Acute pancreatitis"
      description="Original 11-criterion severity score for acute pancreatitis: five on admission and six at 48 hours; 3 or more predicts a severe attack (Ranson 1974). The separate gallstone-pancreatitis set is not implemented."
      onReset={() => setCriteria(noneTicked())}
      formTitle="Tick each criterion met"
      calc={calc}
      form={
        <>
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <Text fw={600} size="sm">
                {s.title}
              </Text>
              <Divider mb="sm" mt={4} />
              {(s.items as readonly Item[]).map((c) => (
                <div key={c.key} style={{ marginBottom: 12 }}>
                  <YesNoField
                    label={c.label}
                    hint={c.hint}
                    checked={criteria[c.key]}
                    onChange={(checked) => setCriteria((prev) => ({ ...prev, [c.key]: checked }))}
                  />
                </div>
              ))}
            </div>
          ))}
        </>
      }
      result={(r) => {
        const severe = r.working.predicts_severe_disease === true;
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={11}
            colour={severe ? "red" : "teal"}
            badge={severe ? "predicts severe" : "below severe cutoff"}
          />
        );
      }}
      summary={(r) =>
        summaryText({
          heading: `Ranson's score ${fmt(r.result)} / 11 (${r.working.predicts_severe_disease === true ? "predicts a severe attack" : "below the severe cutoff"})`,
          interpretation: r.interpretation,
          findingsTitle: "Criteria met",
          findings: SECTIONS.flatMap((s) =>
            (s.items as readonly Item[])
              .filter((c) => criteria[c.key])
              .map((c) => `${s.title}: ${c.label}`),
          ),
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "ranson", Component: RansonCalculator };
