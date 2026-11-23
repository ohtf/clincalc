// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, Text } from "@mantine/core";
import { IconDna } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  ScoreTile,
  YesNoField,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Familial hypercholesterolaemia by Simon Broome (1991) and Dutch Lipid Clinic Network (Nordestgaard 2013) criteria. */

type SbCholesterol = "meets_threshold" | "below_threshold";
type FamilyHistory =
  | "none"
  | "relative_with_premature_cvd_or_high_ldl"
  | "relative_with_xanthomas_or_arcus";
type Ldl = "above8_5" | "from6_5_to8_4" | "from5_0_to6_4" | "from4_0_to4_9" | "below4_0";

const SB_CHOLESTEROL: Choice<SbCholesterol>[] = [
  {
    value: "meets_threshold",
    label: "Meets the threshold",
    hint: "Total cholesterol above 7.5 mmol/L (adult) or LDL-C above 4.9 mmol/L.",
  },
  { value: "below_threshold", label: "Below the threshold" },
];

const FAMILY_HISTORY: Choice<FamilyHistory>[] = [
  { value: "none", label: "None relevant (0)" },
  {
    value: "relative_with_premature_cvd_or_high_ldl",
    label: "First-degree relative with premature CVD or LDL-C above the 95th percentile (1)",
  },
  {
    value: "relative_with_xanthomas_or_arcus",
    label: "First-degree relative with tendon xanthomata or arcus cornealis (2)",
    hint: "Or a child under 18 with LDL-C above the 95th percentile.",
  },
];

const LDL: Choice<Ldl>[] = [
  { value: "above8_5", label: "8.5 mmol/L or above (8)" },
  { value: "from6_5_to8_4", label: "6.5-8.4 mmol/L (5)" },
  { value: "from5_0_to6_4", label: "5.0-6.4 mmol/L (3)" },
  { value: "from4_0_to4_9", label: "4.0-4.9 mmol/L (1)" },
  { value: "below4_0", label: "Below 4.0 mmol/L (0)" },
];

const SIMON_BROOME = [
  {
    key: "tendon_xanthomata",
    label: "Tendon xanthomata",
    summary: "Tendon xanthomata",
    hint: "In the patient or a first-degree relative. Simon Broome definite criterion; also scores 6 DLCN points.",
  },
  {
    key: "pathogenic_mutation",
    label: "Pathogenic mutation in LDLR, APOB, or PCSK9",
    summary: "Pathogenic LDLR, APOB, or PCSK9 mutation (Simon Broome)",
    hint: "Simon Broome definite criterion.",
  },
  {
    key: "family_history_premature_chd_or_raised_cholesterol",
    label: "Family history of premature CHD or raised cholesterol",
    summary: "Family history of premature CHD or raised cholesterol",
    hint: "Premature CHD in a first-degree relative under 60, or raised cholesterol in a first-degree relative. Simon Broome possible criterion.",
  },
] as const;

const DLCN = [
  {
    key: "premature_coronary_disease",
    label: "Premature coronary artery disease (2)",
    summary: "Personal premature coronary artery disease",
    hint: "Personal history: men under 55, women under 60.",
  },
  {
    key: "premature_cerebrovascular_disease",
    label: "Premature cerebral or peripheral vascular disease (1)",
    summary: "Personal premature cerebral or peripheral vascular disease",
    hint: "Personal history: men under 55, women under 60.",
  },
  {
    key: "arcus_cornealis_under_45",
    label: "Arcus cornealis before age 45 (4)",
    summary: "Arcus cornealis before age 45",
  },
  {
    key: "causative_mutation_confirmed",
    label: "Causative mutation confirmed by DNA analysis (8)",
    summary: "Causative LDLR, APOB, or PCSK9 mutation confirmed (DLCN)",
    hint: "In LDLR, APOB, or PCSK9.",
  },
] as const;

const ALL = [...SIMON_BROOME, ...DLCN];
type Key = (typeof ALL)[number]["key"];
type Criteria = Record<Key, boolean>;

const noneTicked = (): Criteria => Object.fromEntries(ALL.map((c) => [c.key, false])) as Criteria;

const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

function FamilialHypercholesterolaemiaCalculator() {
  const [sbCholesterol, setSbCholesterol] = useState<SbCholesterol | null>(null);
  const [familyHistory, setFamilyHistory] = useState<FamilyHistory | null>(null);
  const [ldl, setLdl] = useState<Ldl | null>(null);
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);

  const complete = sbCholesterol !== null && familyHistory !== null && ldl !== null;
  const calc = useCalculation(
    "familial_hypercholesterolaemia",
    complete
      ? {
          simon_broome_cholesterol: sbCholesterol,
          dlcn_family_history: familyHistory,
          dlcn_ldl: ldl,
          ...criteria,
        }
      : null,
  );

  const tick = (c: { key: Key; label: string; hint?: string }) => (
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
      icon={IconDna}
      title="Familial hypercholesterolaemia"
      badge="Lipids"
      description="Clinical diagnosis of familial hypercholesterolaemia by both the Simon Broome criteria (UK) and the Dutch Lipid Clinic Network score."
      onReset={() => {
        setSbCholesterol(null);
        setFamilyHistory(null);
        setLdl(null);
        setCriteria(noneTicked());
      }}
      calc={calc}
      incomplete="Answer the Simon Broome cholesterol criterion, the DLCN LDL-C band, and the DLCN family history to calculate."
      form={
        <>
          <Text fw={600}>Simon Broome criteria</Text>
          <Divider />
          <ChoiceField
            label="Cholesterol criterion"
            value={sbCholesterol}
            onChange={setSbCholesterol}
            options={SB_CHOLESTEROL}
          />
          {SIMON_BROOME.map(tick)}

          <Text fw={600} mt="sm">
            Dutch Lipid Clinic Network
          </Text>
          <Divider />
          <ChoiceField label="LDL-C" value={ldl} onChange={setLdl} options={LDL} />
          <ChoiceField
            label="Family history"
            value={familyHistory}
            onChange={setFamilyHistory}
            options={FAMILY_HISTORY}
          />
          {DLCN.map(tick)}
        </>
      }
      result={(r) => (
        <ScoreTile value={fmt(r.result)} badge={`DLCN: ${asText(r.working.dlcn_category)}`} />
      )}
      details={(r) => (
        <Facts title="Simon Broome" items={[["Classification", asText(r.working.simon_broome)]]} />
      )}
      summary={(r) =>
        summaryText({
          heading: `Dutch Lipid Clinic Network score ${fmt(r.working.dlcn_score)} (${asText(r.working.dlcn_category)}); Simon Broome: ${asText(r.working.simon_broome)}`,
          interpretation: r.interpretation,
          findingsTitle: "Findings",
          findings: [
            sbCholesterol === "meets_threshold"
              ? "Meets the Simon Broome cholesterol criterion"
              : "Below the Simon Broome cholesterol threshold",
            `LDL-C ${labelOf(LDL, ldl)}`,
            `Family history: ${labelOf(FAMILY_HISTORY, familyHistory)}`,
            ...ALL.filter((c) => criteria[c.key]).map((c) => c.summary),
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "familial_hypercholesterolaemia",
  Component: FamilialHypercholesterolaemiaCalculator,
};
