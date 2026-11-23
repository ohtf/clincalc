// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, Text } from "@mantine/core";
import { IconStethoscope } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  YesNoField,
  asNumber,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Revised Cardiac Risk Index (Lee 1999), within the 2024 AHA/ACC perioperative guideline. */

type YesNo = "yes" | "no";

const YES_NO: Choice<YesNo>[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const CRITERIA = [
  {
    key: "high_risk_surgery",
    label: "High-risk surgery (+1)",
    summary: "High-risk surgery (intraperitoneal, intrathoracic, or suprainguinal vascular)",
    hint: "Intraperitoneal, intrathoracic, or suprainguinal vascular. Infrainguinal vascular surgery does not count.",
  },
  {
    key: "ischemic_heart_disease",
    label: "Ischaemic heart disease (+1)",
    summary: "Ischaemic heart disease",
    hint: "Prior MI or positive exercise test, current ischaemic chest pain, nitrate therapy, or pathological Q waves. Prior revascularisation alone does not count.",
  },
  {
    key: "congestive_heart_failure",
    label: "Congestive heart failure (+1)",
    summary: "Congestive heart failure",
    hint: "History of heart failure, pulmonary oedema, or PND; bilateral rales or S3 gallop; or pulmonary vascular redistribution on chest X-ray.",
  },
  {
    key: "cerebrovascular_disease",
    label: "Cerebrovascular disease (+1)",
    summary: "Cerebrovascular disease (prior stroke or TIA)",
    hint: "History of stroke or transient ischaemic attack.",
  },
  {
    key: "preoperative_insulin_treatment",
    label: "Preoperative insulin treatment (+1)",
    summary: "Diabetes treated with insulin before surgery",
    hint: "Established insulin therapy for diabetes, not a one-off perioperative correction dose.",
  },
] as const;

type Key = (typeof CRITERIA)[number]["key"];
type Criteria = Record<Key, boolean>;

const noneTicked = (): Criteria =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, false])) as Criteria;

const CREATININE_MIN = 0;

function RcriCalculator() {
  const [candidate, setCandidate] = useState<YesNo | null>(null);
  const [population, setPopulation] = useState<YesNo | null>(null);
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);
  const [creatinine, setCreatinine] = useState<number | null>(null);

  const creatinineOk = inRange(creatinine, CREATININE_MIN) && creatinine > CREATININE_MIN;
  const complete = candidate === "yes" && population !== null && creatinineOk;
  const calc = useCalculation(
    "rcri",
    complete
      ? {
          adult_noncardiac_surgery_candidate: true,
          original_validation_population_matches: population === "yes",
          ...criteria,
          creatinine_umol_l: creatinine,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconStethoscope}
      title="Revised Cardiac Risk Index"
      badge="Preoperative assessment"
      description="Six-factor Lee index for major cardiac complications after noncardiac surgery in adults (Lee 1999). Use within a stepwise perioperative assessment (2024 AHA/ACC guideline); the score alone must not determine testing or delay necessary surgery."
      onReset={() => {
        setCandidate(null);
        setPopulation(null);
        setCriteria(noneTicked());
        setCreatinine(null);
      }}
      calc={calc}
      incomplete={
        candidate === "no"
          ? "RCRI is intended only for preoperative assessment of an adult undergoing noncardiac surgery."
          : "Answer both context questions and enter the creatinine to calculate."
      }
      form={
        <>
          <Text fw={600}>Context</Text>
          <Divider />
          <ChoiceField
            label="Adult being assessed before noncardiac surgery?"
            hint="Not for cardiac surgery or paediatric use."
            value={candidate}
            onChange={setCandidate}
            options={YES_NO}
          />
          <ChoiceField
            label="Matches the original validation population?"
            hint="Aged 50 or over, nonemergency major noncardiac surgery, expected stay of 2 days or more. If not, the score is still given but the historical cohort event rate is omitted."
            value={population}
            onChange={setPopulation}
            options={YES_NO}
          />
          <Text fw={600} mt="sm">
            Risk factors
          </Text>
          <Divider />
          {CRITERIA.map((c) => (
            <YesNoField
              key={c.key}
              label={c.label}
              hint={c.hint}
              checked={criteria[c.key]}
              onChange={(checked) => setCriteria((prev) => ({ ...prev, [c.key]: checked }))}
            />
          ))}
          <NumberField
            label="Preoperative serum creatinine"
            hint="Above 176.8 µmol/L (2.0 mg/dL) scores 1. Enter in µmol/L, not mg/dL."
            unit="µmol/L"
            value={creatinine}
            onChange={setCreatinine}
            min={CREATININE_MIN}
            decimals={1}
          />
        </>
      }
      result={(r) => (
        <ScoreTile
          value={fmt(r.result)}
          outOf={6}
          badge={`Class ${asText(r.working.original_risk_class)}`}
        />
      )}
      details={(r) => {
        const rate = asNumber(
          r.working.original_validation_cohort_major_cardiac_complication_rate_percent,
        );
        return (
          <Facts
            items={[
              ["Creatinine point", fmt(r.working.creatinine_points)],
              [
                "RCRI above 1",
                r.working.elevated_risk_by_traditional_rcri_threshold === true ? "yes" : "no",
              ],
              rate !== null && ["Original cohort complication rate", `${fmt(rate)}%`],
            ]}
          />
        );
      }}
      summary={(r) =>
        summaryText({
          heading: `RCRI score ${fmt(r.result)} / 6 (original class ${asText(r.working.original_risk_class)})`,
          interpretation: r.interpretation,
          findingsTitle: "Findings",
          findings: [
            "Adult assessed before noncardiac surgery",
            population === "yes"
              ? "Matches the original validation population"
              : "Does not match the original validation population",
            ...CRITERIA.filter((c) => criteria[c.key]).map((c) => c.summary),
            `Creatinine ${creatinine} µmol/L`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "rcri", Component: RcriCalculator };
