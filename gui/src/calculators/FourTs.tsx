// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconDroplet } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** 4Ts pretest probability of heparin-induced thrombocytopenia (Lo 2006; Cuker 2012). */

type Thrombocytopenia =
  | "fall_gt_50_nadir_ge_20"
  | "fall_30_to_50_or_nadir_10_to_19"
  | "fall_lt_30_or_nadir_lt_10";
type Timing =
  | "clear_day_5_to_10_or_rapid_with_prior_exposure_within_30_days"
  | "compatible_but_unclear_or_after_day_10_or_rapid_with_prior_exposure_31_to_100_days"
  | "day_0_to_4_without_recent_exposure";
type Thrombosis =
  | "new_confirmed_thrombosis_skin_necrosis_or_acute_iv_heparin_reaction"
  | "progressive_recurrent_or_suspected_thrombosis_or_erythematous_skin_lesion"
  | "none";
type OtherCauses = "none_apparent" | "possible" | "definite";

const THROMBOCYTOPENIA: Choice<Thrombocytopenia>[] = [
  { value: "fall_gt_50_nadir_ge_20", label: "Fall over 50% and nadir 20 ×10⁹/L or more (2)" },
  {
    value: "fall_30_to_50_or_nadir_10_to_19",
    label: "Fall 30-50%, or nadir 10-19 ×10⁹/L (1)",
  },
  { value: "fall_lt_30_or_nadir_lt_10", label: "Fall under 30%, or nadir under 10 ×10⁹/L (0)" },
];

const TIMING: Choice<Timing>[] = [
  {
    value: "clear_day_5_to_10_or_rapid_with_prior_exposure_within_30_days",
    label: "Clear onset on days 5-10, or fall within 1 day with heparin exposure in the past 30 days (2)",
  },
  {
    value: "compatible_but_unclear_or_after_day_10_or_rapid_with_prior_exposure_31_to_100_days",
    label:
      "Compatible but unclear onset, onset after day 10, or fall within 1 day with exposure 31-100 days ago (1)",
  },
  {
    value: "day_0_to_4_without_recent_exposure",
    label: "Onset on days 0-4 without recent heparin exposure (0)",
  },
];

const THROMBOSIS: Choice<Thrombosis>[] = [
  {
    value: "new_confirmed_thrombosis_skin_necrosis_or_acute_iv_heparin_reaction",
    label:
      "New confirmed thrombosis, heparin-site skin necrosis, or acute systemic reaction after an IV unfractionated-heparin bolus (2)",
  },
  {
    value: "progressive_recurrent_or_suspected_thrombosis_or_erythematous_skin_lesion",
    label:
      "Progressive, recurrent, or suspected but unconfirmed thrombosis, or a non-necrotising erythematous heparin-site lesion (1)",
  },
  { value: "none", label: "None (0)" },
];

const OTHER_CAUSES: Choice<OtherCauses>[] = [
  { value: "none_apparent", label: "None apparent (2)" },
  { value: "possible", label: "Possible (1)" },
  { value: "definite", label: "Definite (0)" },
];

const BAND_COLOUR: Record<string, string> = { low: "teal", intermediate: "yellow", high: "red" };

const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

function FourTsCalculator() {
  const [thrombocytopenia, setThrombocytopenia] = useState<Thrombocytopenia | null>(null);
  const [timing, setTiming] = useState<Timing | null>(null);
  const [thrombosis, setThrombosis] = useState<Thrombosis | null>(null);
  const [otherCauses, setOtherCauses] = useState<OtherCauses | null>(null);

  const complete =
    thrombocytopenia !== null && timing !== null && thrombosis !== null && otherCauses !== null;
  const calc = useCalculation(
    "four_ts",
    complete
      ? {
          thrombocytopenia,
          timing,
          thrombosis_or_sequelae: thrombosis,
          other_causes: otherCauses,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconDroplet}
      title="4Ts score"
      badge="Suspected HIT"
      description="Pretest probability of heparin-induced thrombocytopenia from four clinician-resolved categories (Lo 2006; Cuker 2012), using clear onset on days 5-10. A pretest probability, not a diagnosis. If a category cannot be resolved, do not guess."
      onReset={() => {
        setThrombocytopenia(null);
        setTiming(null);
        setThrombosis(null);
        setOtherCauses(null);
      }}
      calc={calc}
      incomplete="Choose one category for each of the four Ts to calculate."
      form={
        <>
          <ChoiceField
            label="Thrombocytopenia"
            hint="Percentage fall from the peak count after heparin started to the nadir. The nadir takes precedence: under 10 ×10⁹/L scores 0, and 10-19 scores 1 whatever the fall."
            value={thrombocytopenia}
            onChange={setThrombocytopenia}
            options={THROMBOCYTOPENIA}
          />
          <ChoiceField
            label="Timing of platelet fall"
            hint="The day heparin starts is day 0. Date onset from the first day of a consistent decline, not from when the count crosses the reference limit."
            value={timing}
            onChange={setTiming}
            options={TIMING}
          />
          <ChoiceField
            label="Thrombosis or other sequelae"
            hint="Only findings temporally relevant to the current platelet fall."
            value={thrombosis}
            onChange={setThrombosis}
            options={THROMBOSIS}
          />
          <ChoiceField
            label="Other causes of thrombocytopenia"
            hint="After reviewing the differential: none apparent only when no credible alternative is evident, not merely because none has been sought."
            value={otherCauses}
            onChange={setOtherCauses}
            options={OTHER_CAUSES}
          />
        </>
      }
      result={(r) => {
        const band = asText(r.working.band);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={8}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={band && `${band} probability`}
          />
        );
      }}
      details={(r) => (
        <Facts
          title="Points"
          items={[
            ["Thrombocytopenia", fmt(r.working.thrombocytopenia_points)],
            ["Timing", fmt(r.working.timing_points)],
            ["Thrombosis", fmt(r.working.thrombosis_or_sequelae_points)],
            ["Other causes", fmt(r.working.other_causes_points)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `4Ts score ${fmt(r.result)} / 8 (${asText(r.working.band)} pretest probability of HIT)`,
          interpretation: r.interpretation,
          findingsTitle: "Categories",
          findings: [
            `Thrombocytopenia: ${labelOf(THROMBOCYTOPENIA, thrombocytopenia)}`,
            `Timing: ${labelOf(TIMING, timing)}`,
            `Thrombosis or sequelae: ${labelOf(THROMBOSIS, thrombosis)}`,
            `Other causes: ${labelOf(OTHER_CAUSES, otherCauses)}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "four_ts", Component: FourTsCalculator };
