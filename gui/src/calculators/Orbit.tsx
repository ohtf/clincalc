// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconDropletHalf2 } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  YesNoField,
  asText,
  compact,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** ORBIT major-bleeding risk score in anticoagulated atrial fibrillation (O'Brien 2015). */

type YesNo = "yes" | "no";
type Sex = "male" | "female";

const CONTEXT: Choice<YesNo>[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const SEX: Choice<Sex>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

// Source sex-branch thresholds, below which the value scores (O'Brien 2015).
const HB_THRESHOLD: Record<Sex, number> = { male: 130, female: 120 };
const HCT_THRESHOLD: Record<Sex, number> = { male: 40, female: 36 };

const AGE = { min: 18, max: 120 };
const EGFR = { min: 0, max: 200 };
const HB = { min: 0, max: 250 };
const HCT = { min: 0, max: 100 };

const CRITERIA = [
  {
    key: "history_of_anaemia",
    label: "History of anaemia",
    summary: "Documented history of anaemia",
    hint: "Documented anaemia history. Combines with low haemoglobin or haematocrit into one 2-point component.",
  },
  {
    key: "bleeding_history",
    label: "Bleeding history (+2)",
    summary: "Bleeding history (GI or intracranial bleed, or haemorrhagic stroke)",
    hint: "Prior gastrointestinal bleeding, intracranial bleeding, or haemorrhagic stroke. Minor bruising does not count.",
  },
  {
    key: "antiplatelet_treatment",
    label: "Antiplatelet treatment (+1)",
    summary: "Current concomitant antiplatelet treatment",
    hint: "Current aspirin, clopidogrel, prasugrel, ticagrelor, or aspirin/dipyridamole in addition to the anticoagulant.",
  },
] as const;

type Key = (typeof CRITERIA)[number]["key"];
type Criteria = Record<Key, boolean>;

const noneTicked = (): Criteria =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, false])) as Criteria;

const BAND_COLOUR: Record<string, string> = { low: "teal", medium: "yellow", high: "red" };

const positive = (v: number | null, r: { min: number; max: number }): v is number =>
  inRange(v, r.min, r.max) && v > r.min;

function OrbitCalculator() {
  const [context, setContext] = useState<YesNo | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [hb, setHb] = useState<number | null>(null);
  const [hct, setHct] = useState<number | null>(null);
  const [egfr, setEgfr] = useState<number | null>(null);
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);

  const hbOk = hb === null || positive(hb, HB);
  const hctOk = hct === null || positive(hct, HCT);
  const anaemiaResolved =
    sex !== null &&
    (criteria.history_of_anaemia ||
      (hb !== null && hct !== null) ||
      (hb !== null && hb < HB_THRESHOLD[sex]) ||
      (hct !== null && hct < HCT_THRESHOLD[sex]));

  const complete =
    context === "yes" &&
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age) &&
    sex !== null &&
    inRange(egfr, EGFR.min, EGFR.max) &&
    hbOk &&
    hctOk &&
    anaemiaResolved;
  const calc = useCalculation(
    "orbit",
    complete
      ? compact({
          assessment_context:
            "adult_with_electrocardiographically_confirmed_atrial_fibrillation_receiving_oral_anticoagulation",
          age_years: age,
          sex,
          haemoglobin_g_l: hb,
          haematocrit_percent: hct,
          egfr_ml_min_1_73_m2: egfr,
          ...criteria,
        })
      : null,
  );

  const incomplete =
    context === "no"
      ? "ORBIT applies only to an adult with ECG-confirmed atrial fibrillation who is receiving oral anticoagulation."
      : context === "yes" && sex !== null && hbOk && hctOk && !anaemiaResolved
        ? "Enter both haemoglobin and haematocrit, unless anaemia history or one low value already establishes the anaemia component. Missing results are not scored as normal."
        : "Confirm the assessment population, then enter age, sex, laboratory values, and eGFR to calculate.";

  return (
    <CalculatorPage
      icon={IconDropletHalf2}
      title="ORBIT bleeding score"
      badge="Atrial fibrillation"
      description="Major-bleeding risk in adults with ECG-confirmed atrial fibrillation on oral anticoagulation (O'Brien 2015). Risk stratification only: it does not direct starting, stopping, or withholding anticoagulation."
      onReset={() => {
        setContext(null);
        setAge(null);
        setSex(null);
        setHb(null);
        setHct(null);
        setEgfr(null);
        setCriteria(noneTicked());
      }}
      calc={calc}
      incomplete={incomplete}
      form={
        <>
          <ChoiceField
            label="Adult with ECG-confirmed AF, currently on oral anticoagulation?"
            hint="The source population. Not for paediatric use, unconfirmed AF, or patients not anticoagulated."
            value={context}
            onChange={setContext}
            options={CONTEXT}
          />
          <Text fw={600} mt="sm">
            Patient
          </Text>
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Age"
              hint="75 or over scores 1."
              unit="years"
              value={age}
              onChange={setAge}
              min={AGE.min}
              max={AGE.max}
              decimals={0}
            />
            <ChoiceField
              label="Sex threshold branch"
              hint="Used only for the haemoglobin and haematocrit thresholds."
              value={sex}
              onChange={setSex}
              options={SEX}
            />
          </SimpleGrid>
          <Text fw={600} mt="sm">
            Laboratory values
          </Text>
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Haemoglobin"
              hint="Below 130 g/L (male) or 120 g/L (female) scores. Enter g/L, not g/dL."
              unit="g/L"
              value={hb}
              onChange={setHb}
              min={HB.min}
              max={HB.max}
              decimals={0}
            />
            <NumberField
              label="Haematocrit"
              hint="Below 40% (male) or 36% (female) scores. Enter a percentage, not a fraction."
              unit="%"
              value={hct}
              onChange={setHct}
              min={HCT.min}
              max={HCT.max}
              decimals={1}
            />
            <NumberField
              label="eGFR"
              hint="Below 60 scores 1; exactly 60 does not."
              unit="mL/min/1.73 m²"
              value={egfr}
              onChange={setEgfr}
              min={EGFR.min}
              max={EGFR.max}
              decimals={0}
            />
          </SimpleGrid>
          <Text fw={600} mt="sm">
            History and treatment
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
        </>
      }
      result={(r) => {
        const band = asText(r.working.risk_band);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={7}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={band && `${band} risk`}
          />
        );
      }}
      details={(r) => {
        const ci = Array.isArray(r.working.score_observed_rate_95_ci)
          ? (r.working.score_observed_rate_95_ci as unknown[])
          : [];
        return (
          <>
            <Facts
              title="Points"
              items={[
                ["Age", fmt(r.working.older_age_points)],
                ["Anaemia", fmt(r.working.anaemia_component_points)],
                ["Bleeding history", fmt(r.working.bleeding_history_points)],
                ["eGFR", fmt(r.working.insufficient_kidney_function_points)],
                ["Antiplatelet", fmt(r.working.antiplatelet_treatment_points)],
              ]}
            />
            <Facts
              title="Observed major bleeds per 100 patient-years (ORBIT-AF)"
              items={[
                [
                  "This score",
                  ci.length === 2
                    ? `${fmt(r.working.score_observed_bleeds_per_100_patient_years)} (95% CI ${fmt(ci[0])}-${fmt(ci[1])})`
                    : fmt(r.working.score_observed_bleeds_per_100_patient_years),
                ],
                ["This category", fmt(r.working.category_observed_bleeds_per_100_patient_years)],
              ]}
            />
          </>
        );
      }}
      summary={(r) =>
        summaryText({
          heading: `ORBIT score ${fmt(r.result)} / 7 (${asText(r.working.risk_band)} bleeding risk)`,
          interpretation: r.interpretation,
          findingsTitle: "Findings",
          findings: [
            "Adult with ECG-confirmed AF on oral anticoagulation",
            `Age ${age} years`,
            `Sex threshold branch: ${sex}`,
            hb !== null ? `Haemoglobin ${hb} g/L` : "Haemoglobin not entered",
            hct !== null ? `Haematocrit ${hct}%` : "Haematocrit not entered",
            `eGFR ${egfr} mL/min/1.73 m²`,
            ...CRITERIA.filter((c) => criteria[c.key]).map((c) => c.summary),
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "orbit", Component: OrbitCalculator };
