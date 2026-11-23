// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconBone } from "@tabler/icons-react";

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

/** Kocher criteria for septic arthritis versus transient synovitis of the hip (Kocher 1999). */

const CRITERIA = [
  {
    key: "non_weight_bearing",
    label: "Non-weight-bearing",
    hint: "Unable or unwilling to bear weight on the affected side.",
  },
  {
    key: "history_of_fever_over_38_5c",
    label: "History of fever of 38.5 °C or higher",
  },
  {
    key: "esr_over_40_mm_hr",
    label: "ESR over 40 mm/hr",
  },
  {
    key: "wbc_over_12000_per_mm3",
    label: "White cell count over 12.0 x 10⁹/L",
    hint: "Over 12,000 cells/mm³.",
  },
] as const;

type Key = (typeof CRITERIA)[number]["key"];
type Criteria = Record<Key, boolean>;

const noneTicked = (): Criteria =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, false])) as Criteria;

function KocherCriteriaCalculator() {
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);

  const calc = useCalculation("kocher_criteria", criteria);

  return (
    <CalculatorPage
      icon={IconBone}
      title="Kocher criteria"
      badge="Child with an irritable hip"
      description="Four-criterion prediction rule distinguishing septic arthritis from transient synovitis of the hip in children (Kocher 1999). Probabilities are from the derivation study; a 2004 validation found lower values."
      onReset={() => setCriteria(noneTicked())}
      formTitle="Tick each criterion that applies"
      calc={calc}
      form={
        <>
          {CRITERIA.map((c) => (
            <YesNoField
              key={c.key}
              label={c.label}
              hint={"hint" in c ? c.hint : undefined}
              checked={criteria[c.key]}
              onChange={(checked) => setCriteria((prev) => ({ ...prev, [c.key]: checked }))}
            />
          ))}
        </>
      }
      result={(r) => <ScoreTile value={fmt(r.result)} outOf={4} badge="criteria met" />}
      details={(r) => (
        <Facts
          items={[
            ["Predicted probability of septic arthritis (1999 derivation)", `${fmt(r.working.predicted_probability_percent)}%`],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Kocher criteria ${fmt(r.result)}/4 (predicted probability of septic arthritis ${fmt(r.working.predicted_probability_percent)}%, 1999 derivation)`,
          interpretation: r.interpretation,
          findingsTitle: "Criteria present",
          findings: CRITERIA.filter((c) => criteria[c.key]).map((c) => c.label),
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "kocher_criteria", Component: KocherCriteriaCalculator };
