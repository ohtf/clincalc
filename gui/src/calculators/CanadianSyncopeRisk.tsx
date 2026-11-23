// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, Text } from "@mantine/core";
import { IconHeartRateMonitor } from "@tabler/icons-react";

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

/** Canadian Syncope Risk Score, 30-day serious adverse events (Thiruganasambandamoorthy 2016). */

type Key =
  | "predisposition_to_vasovagal_symptoms"
  | "history_of_heart_disease"
  | "systolic_bp_under_90_or_over_180"
  | "elevated_troponin"
  | "abnormal_qrs_axis"
  | "qrs_duration_over_130ms"
  | "qtc_over_480ms";
type Criterion = { key: Key; label: string; hint?: string };
type Diagnosis = "vasovagal" | "cardiac" | "neither";

const CLINICAL: Criterion[] = [
  {
    key: "predisposition_to_vasovagal_symptoms",
    label: "Predisposition to vasovagal symptoms (-1)",
    hint: "Triggered by a warm or crowded place, prolonged standing, fear, emotion, or pain.",
  },
  {
    key: "history_of_heart_disease",
    label: "History of heart disease (+1)",
    hint: "Coronary or valvular heart disease, cardiomyopathy, congestive heart failure, or non-sinus rhythm.",
  },
  {
    key: "systolic_bp_under_90_or_over_180",
    label: "Any systolic BP below 90 or above 180 mmHg (+2)",
    hint: "Any reading from triage to disposition from the ED.",
  },
];

const INVESTIGATIONS: Criterion[] = [
  {
    key: "elevated_troponin",
    label: "Elevated troponin (+2)",
    hint: "Above the local 99th-percentile upper reference limit.",
  },
  { key: "abnormal_qrs_axis", label: "Abnormal QRS axis (+1)", hint: "Below -30 or above 100 degrees." },
  { key: "qrs_duration_over_130ms", label: "QRS duration over 130 ms (+1)" },
  { key: "qtc_over_480ms", label: "Corrected QT interval over 480 ms (+2)" },
];

const DIAGNOSIS: Choice<Diagnosis>[] = [
  { value: "vasovagal", label: "Vasovagal syncope (-2)" },
  { value: "cardiac", label: "Cardiac syncope (+2)" },
  { value: "neither", label: "Neither (0)" },
];

const CRITERIA = [...CLINICAL, ...INVESTIGATIONS];
type Criteria = Record<Key, boolean>;
const noneTicked = (): Criteria =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, false])) as Criteria;

const RISK_LABEL: Record<string, string> = {
  very_low: "Very low risk",
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
  very_high: "Very high risk",
};
const RISK_COLOUR: Record<string, string> = {
  very_low: "teal",
  low: "teal",
  medium: "yellow",
  high: "orange",
  very_high: "red",
};

function CanadianSyncopeRiskCalculator() {
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);

  const calc = useCalculation(
    "canadian_syncope_risk",
    diagnosis === null
      ? null
      : {
          ...criteria,
          ed_diagnosis_vasovagal_syncope: diagnosis === "vasovagal",
          ed_diagnosis_cardiac_syncope: diagnosis === "cardiac",
        },
  );

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
      icon={IconHeartRateMonitor}
      title="Canadian Syncope Risk Score"
      badge="Syncope in the ED"
      description="30-day risk of a serious adverse event after emergency department assessment of syncope, from clinical evaluation, investigations, and the ED working diagnosis (Thiruganasambandamoorthy 2016). Scores range from -3 to 11."
      onReset={() => {
        setCriteria(noneTicked());
        setDiagnosis(null);
      }}
      calc={calc}
      incomplete="Choose the ED working diagnosis to calculate."
      form={
        <>
          <Text fw={600} size="sm">
            Clinical evaluation
          </Text>
          {CLINICAL.map(field)}
          <Divider />
          <Text fw={600} size="sm">
            Investigations
          </Text>
          {INVESTIGATIONS.map(field)}
          <Divider />
          <ChoiceField
            label="Diagnosis in the ED"
            hint="The ED working diagnosis for this presentation."
            value={diagnosis}
            onChange={setDiagnosis}
            options={DIAGNOSIS}
          />
        </>
      }
      result={(r) => {
        const level = asText(r.working.risk_level);
        return (
          <ScoreTile
            value={fmt(r.result)}
            colour={RISK_COLOUR[level] ?? "teal"}
            badge={RISK_LABEL[level] ?? level}
          />
        );
      }}
      details={(r) => (
        <Facts
          items={[
            ["Total score", fmt(r.working.total_score)],
            ["30-day serious-outcome rate", asText(r.working.thirty_day_serious_outcome_rate)],
          ]}
        />
      )}
      summary={(r) => {
        const level = asText(r.working.risk_level);
        const diagnosisLabel = DIAGNOSIS.find((d) => d.value === diagnosis)?.label ?? "";
        return summaryText({
          heading: `Canadian Syncope Risk Score ${fmt(r.result)} (${(RISK_LABEL[level] ?? level).toLowerCase()})`,
          interpretation: r.interpretation,
          findingsTitle: "Items present",
          findings: [
            ...CRITERIA.filter((c) => criteria[c.key]).map((c) => c.label),
            `ED diagnosis: ${diagnosisLabel}`,
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = {
  name: "canadian_syncope_risk",
  Component: CanadianSyncopeRiskCalculator,
};
