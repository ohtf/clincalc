// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, Text } from "@mantine/core";
import { IconActivity } from "@tabler/icons-react";

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

/** Two-level Wells score for DVT (Wells 2003; NICE NG158). */

type Key =
  | "active_cancer"
  | "paralysis_paresis_immobilisation"
  | "bedridden_or_major_surgery"
  | "localised_tenderness"
  | "entire_leg_swollen"
  | "calf_swelling_over_3cm"
  | "pitting_oedema"
  | "collateral_superficial_veins"
  | "previously_documented_dvt"
  | "alternative_diagnosis_as_likely";
type Criterion = { key: Key; label: string; hint?: string };

const CRITERIA: Criterion[] = [
  {
    key: "active_cancer",
    label: "Active cancer (+1)",
    hint: "Treatment ongoing, within the last 6 months, or palliative.",
  },
  {
    key: "paralysis_paresis_immobilisation",
    label: "Paralysis, paresis, or recent plaster immobilisation of the leg (+1)",
  },
  {
    key: "bedridden_or_major_surgery",
    label: "Recently bedridden 3 days or more, or major surgery within 12 weeks (+1)",
    hint: "Major surgery requiring general or regional anaesthesia.",
  },
  {
    key: "localised_tenderness",
    label: "Localised tenderness along the distribution of the deep venous system (+1)",
  },
  { key: "entire_leg_swollen", label: "Entire leg swollen (+1)" },
  {
    key: "calf_swelling_over_3cm",
    label: "Calf swelling more than 3 cm compared with the asymptomatic leg (+1)",
    hint: "Both calves measured 10 cm below the tibial tuberosity.",
  },
  { key: "pitting_oedema", label: "Pitting oedema confined to the symptomatic leg (+1)" },
  {
    key: "collateral_superficial_veins",
    label: "Collateral superficial veins, non-varicose (+1)",
  },
  {
    key: "previously_documented_dvt",
    label: "Previously documented DVT (+1)",
    hint: "Objectively confirmed on imaging.",
  },
];

const ALTERNATIVE: Criterion = {
  key: "alternative_diagnosis_as_likely",
  label: "An alternative diagnosis is at least as likely as DVT (-2)",
  hint: "For example cellulitis, ruptured Baker's cyst, calf haematoma, or superficial thrombophlebitis.",
};

const ALL = [...CRITERIA, ALTERNATIVE];
type Criteria = Record<Key, boolean>;
const noneTicked = (): Criteria => Object.fromEntries(ALL.map((c) => [c.key, false])) as Criteria;

const PROBABILITY_LABEL: Record<string, string> = {
  likely: "DVT likely",
  unlikely: "DVT unlikely",
};
const PROBABILITY_COLOUR: Record<string, string> = { likely: "yellow", unlikely: "teal" };

function WellsDvtCalculator() {
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);
  const calc = useCalculation("wells_dvt", criteria);

  const field = (c: Criterion) => (
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
      icon={IconActivity}
      title="Wells score for DVT"
      badge="Suspected DVT"
      description="Clinical pretest probability of deep vein thrombosis (Wells 2003), using the NICE NG158 two-level interpretation to choose between proximal leg vein ultrasound and D-dimer. Scores range from -2 to 9."
      onReset={() => setCriteria(noneTicked())}
      formTitle="Tick each criterion that applies"
      calc={calc}
      form={
        <>
          {CRITERIA.map(field)}
          <Divider />
          <Text fw={600} size="sm">
            Clinical judgement
          </Text>
          {field(ALTERNATIVE)}
        </>
      }
      result={(r) => {
        const p = asText(r.working.probability);
        return (
          <ScoreTile
            value={fmt(r.result)}
            colour={PROBABILITY_COLOUR[p] ?? "teal"}
            badge={PROBABILITY_LABEL[p] ?? p}
          />
        );
      }}
      summary={(r) => {
        const p = asText(r.working.probability);
        const present = ALL.filter((c) => criteria[c.key]).map((c) => c.label);
        return summaryText({
          heading: `Wells score (DVT) ${fmt(r.result)} (${PROBABILITY_LABEL[p] ?? p})`,
          interpretation: r.interpretation,
          findingsTitle: "Criteria present",
          findings: present.length ? present : ["None"],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "wells_dvt", Component: WellsDvtCalculator };
