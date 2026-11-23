// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconWalk } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** BODE index for COPD prognosis (Celli et al., NEJM 2004). */

// mMRC grade = classic MRC grade - 1; the descriptors are the MRC scale's.
const MMRC: Choice<string>[] = [
  { value: "0", label: "mMRC 0 - Not troubled by breathlessness except on strenuous exercise (0)" },
  {
    value: "1",
    label: "mMRC 1 - Short of breath when hurrying on the level or walking up a slight hill (0)",
  },
  {
    value: "2",
    label:
      "mMRC 2 - Walks slower than contemporaries on the level because of breathlessness, or has to stop for breath when walking at own pace (1)",
  },
  {
    value: "3",
    label:
      "mMRC 3 - Stops for breath after walking about 100 metres or after a few minutes on the level (2)",
  },
  {
    value: "4",
    label:
      "mMRC 4 - Too breathless to leave the house, or breathless when dressing or undressing (3)",
  },
];

const positive = (v: number | null): v is number => inRange(v, 0) && v > 0;

function BodeCalculator() {
  const [bmi, setBmi] = useState<number | null>(null);
  const [fev1, setFev1] = useState<number | null>(null);
  const [mmrc, setMmrc] = useState<string | null>(null);
  const [walk, setWalk] = useState<number | null>(null);

  const complete = positive(bmi) && inRange(fev1, 0) && mmrc !== null && inRange(walk, 0);
  const calc = useCalculation(
    "bode",
    complete
      ? {
          bmi,
          fev1_percent_predicted: fev1,
          mmrc_dyspnoea: Number(mmrc),
          six_minute_walk_distance_m: walk,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconWalk}
      title="BODE index"
      badge="COPD prognosis"
      description="Body-mass index, airflow Obstruction, Dyspnoea, and Exercise capacity combined into a 0-10 index that predicts survival in stable COPD better than FEV1 alone (Celli 2004). Higher is worse."
      onReset={() => {
        setBmi(null);
        setFev1(null);
        setMmrc(null);
        setWalk(null);
      }}
      calc={calc}
      incomplete="Complete all four domains to calculate."
      form={
        <>
          <NumberField
            label="BMI (B)"
            hint="Over 21: 0. 21 or under: 1."
            unit="kg/m²"
            value={bmi}
            onChange={setBmi}
            min={0}
            decimals={1}
          />
          <NumberField
            label="FEV1 (O)"
            hint="Post-bronchodilator, % predicted. 65 or more: 0, 50-64: 1, 36-49: 2, 35 or less: 3."
            unit="% predicted"
            value={fev1}
            onChange={setFev1}
            min={0}
            decimals={1}
          />
          <ChoiceField
            label="Dyspnoea (D) - modified MRC scale, 0-4"
            hint="BODE uses the modified mMRC scale, not the classic MRC 1-5 scale: mMRC grade = MRC grade - 1. Points in brackets."
            value={mmrc}
            onChange={setMmrc}
            options={MMRC}
          />
          <NumberField
            label="Six-minute walk distance (E)"
            hint="350 or more: 0, 250-349: 1, 150-249: 2, 149 or less: 3."
            unit="m"
            value={walk}
            onChange={setWalk}
            min={0}
            decimals={1}
          />
        </>
      }
      result={(r) => (
        <ScoreTile
          value={fmt(r.result)}
          outOf={10}
          badge={`About ${fmt(r.working.approx_four_year_survival_percent)}% 4-year survival`}
        />
      )}
      details={(r) => (
        <Facts
          title="Points"
          items={[
            ["BMI", fmt(r.working.bmi_points)],
            ["FEV1", fmt(r.working.fev1_points)],
            ["Dyspnoea", fmt(r.working.dyspnoea_points)],
            ["Exercise", fmt(r.working.exercise_points)],
            ["Quartile (score range)", asText(r.working.survival_quartile)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `BODE index ${fmt(r.result)} / 10 (quartile ${asText(r.working.survival_quartile)}; about ${fmt(r.working.approx_four_year_survival_percent)}% 4-year survival)`,
          interpretation: r.interpretation,
          findingsTitle: "Components",
          findings: [
            `BMI ${bmi} kg/m² (${fmt(r.working.bmi_points)})`,
            `FEV1 ${fev1}% predicted, post-bronchodilator (${fmt(r.working.fev1_points)})`,
            `Dyspnoea mMRC grade ${mmrc} (${fmt(r.working.dyspnoea_points)})`,
            `Six-minute walk ${walk} m (${fmt(r.working.exercise_points)})`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "bode", Component: BodeCalculator };
