// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconDroplet } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  YesNoField,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Glasgow-Blatchford bleeding score before endoscopy (Blatchford 2000; NICE CG141; ACG 2021). */

type YesNo = "yes" | "no";
type Sex = "male" | "female";
type Key = "melaena" | "syncope" | "hepatic_disease" | "cardiac_failure";

const YES_NO: Choice<YesNo>[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const SEX: Choice<Sex>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const MARKERS: Array<{ key: Key; label: string; hint: string }> = [
  {
    key: "melaena",
    label: "Melaena (1)",
    hint: "Black, tarry stool from the current bleed - not dark stool explained by iron, bismuth, or food.",
  },
  {
    key: "syncope",
    label: "Syncope (2)",
    hint: "Transient loss of consciousness during the current episode - not presyncope or dizziness alone.",
  },
  {
    key: "hepatic_disease",
    label: "Hepatic disease (2)",
    hint: "Known history, or clinical and laboratory evidence, of chronic or acute liver disease.",
  },
  {
    key: "cardiac_failure",
    label: "Cardiac failure (2)",
    hint: "Known history, or clinical and echocardiographic evidence, of cardiac failure.",
  },
];

type Markers = Record<Key, boolean>;
const noneTicked = (): Markers =>
  Object.fromEntries(MARKERS.map((m) => [m.key, false])) as Markers;

const positive = (v: number | null): v is number => inRange(v) && v > 0;

function GlasgowBlatchfordCalculator() {
  const [age16, setAge16] = useState<YesNo | null>(null);
  const [firstAssessment, setFirstAssessment] = useState<YesNo | null>(null);
  const [edOvert, setEdOvert] = useState<YesNo | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [urea, setUrea] = useState<number | null>(null);
  const [hb, setHb] = useState<number | null>(null);
  const [sbp, setSbp] = useState<number | null>(null);
  const [hr, setHr] = useState<number | null>(null);
  const [markers, setMarkers] = useState<Markers>(noneTicked);

  const complete =
    age16 === "yes" &&
    firstAssessment === "yes" &&
    edOvert !== null &&
    sex !== null &&
    inRange(urea, 0) &&
    positive(hb) &&
    positive(sbp) &&
    positive(hr);

  const calc = useCalculation(
    "glasgow_blatchford",
    complete
      ? {
          age_16_or_over: true,
          acute_upper_gi_bleeding_at_first_assessment: true,
          emergency_department_overt_ugib: edOvert === "yes",
          sex,
          urea_mmol_l: urea,
          haemoglobin_g_l: hb,
          systolic_bp_mm_hg: sbp,
          heart_rate_bpm: hr,
          ...markers,
        }
      : null,
  );

  const incomplete =
    age16 === "no"
      ? "Not applicable: this implementation follows NICE CG141, which covers people aged 16 and over."
      : firstAssessment === "no"
        ? "Not applicable: the score is for the first pre-endoscopy assessment of acute upper GI bleeding."
        : [hb, sbp, hr].some((v) => v !== null && v <= 0)
          ? "Haemoglobin, systolic BP, and heart rate must be above 0."
          : "Answer every question and enter all four measurements to calculate.";

  return (
    <CalculatorPage
      icon={IconDroplet}
      title="Glasgow-Blatchford score"
      badge="Upper GI bleeding"
      description="Pre-endoscopy risk score (0-23) at first assessment of acute upper gastrointestinal bleeding in people aged 16 and over, to identify those at very low risk of needing intervention (Blatchford 2000; NICE CG141; ACG 2021). Do not delay resuscitation to calculate it."
      onReset={() => {
        setAge16(null);
        setFirstAssessment(null);
        setEdOvert(null);
        setSex(null);
        setUrea(null);
        setHb(null);
        setSbp(null);
        setHr(null);
        setMarkers(noneTicked());
      }}
      calc={calc}
      incomplete={incomplete}
      form={
        <>
          <Text fw={600} size="sm">
            Presentation
          </Text>
          <ChoiceField
            label="Aged 16 or over?"
            value={age16}
            onChange={setAge16}
            options={YES_NO}
          />
          <ChoiceField
            label="First pre-endoscopy assessment of acute upper GI bleeding?"
            hint="Haematemesis, melaena, or other suspected acute bleeding proximal to the ligament of Treitz. Not for lower GI bleeding or use after endoscopy."
            value={firstAssessment}
            onChange={setFirstAssessment}
            options={YES_NO}
          />
          <ChoiceField
            label="Presenting to an emergency department with overt upper GI bleeding?"
            hint="Controls whether the ACG 2021 score 0-1 outpatient recommendation is applied; it does not change the score."
            value={edOvert}
            onChange={setEdOvert}
            options={YES_NO}
          />
          <Divider />
          <Text fw={600} size="sm">
            Blood tests
          </Text>
          <ChoiceField
            label="Sex"
            hint="Selects the published male or female haemoglobin bands."
            value={sex}
            onChange={setSex}
            options={SEX}
          />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Urea"
              hint="mmol/L, not BUN in mg/dL. 6.5-7.9 = 2, 8.0-9.9 = 3, 10.0-24.9 = 4, 25 or more = 6."
              unit="mmol/L"
              value={urea}
              onChange={setUrea}
              min={0}
              decimals={1}
            />
            <NumberField
              label="Haemoglobin"
              hint="g/L, not g/dL. Male 120-129 = 1, 100-119 = 3, below 100 = 6; female 100-119 = 1, below 100 = 6."
              unit="g/L"
              value={hb}
              onChange={setHb}
              min={0}
              decimals={0}
            />
          </SimpleGrid>
          <Divider />
          <Text fw={600} size="sm">
            Observations
          </Text>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Systolic BP"
              hint="100-109 = 1, 90-99 = 2, below 90 = 3."
              unit="mmHg"
              value={sbp}
              onChange={setSbp}
              min={0}
              decimals={0}
            />
            <NumberField
              label="Heart rate"
              hint="100 or more = 1."
              unit="bpm"
              value={hr}
              onChange={setHr}
              min={0}
              decimals={0}
            />
          </SimpleGrid>
          <Divider />
          <Text fw={600} size="sm">
            Other markers - tick each that is present
          </Text>
          {MARKERS.map((m) => (
            <YesNoField
              key={m.key}
              label={m.label}
              hint={m.hint}
              checked={markers[m.key]}
              onChange={(checked) => setMarkers((prev) => ({ ...prev, [m.key]: checked }))}
            />
          ))}
        </>
      }
      result={(r) => (
        <ScoreTile
          value={fmt(r.result)}
          outOf={23}
          badge={
            asText(r.working.triage_band) === "above-very-low-risk-threshold"
              ? "Above very-low-risk range"
              : undefined
          }
        />
      )}
      details={(r) => (
        <>
          <Facts
            title="Points"
            items={[
              ["Urea", fmt(r.working.urea_points)],
              ["Haemoglobin", fmt(r.working.haemoglobin_points)],
              ["Systolic BP", fmt(r.working.systolic_bp_points)],
              ["Heart rate", fmt(r.working.heart_rate_points)],
              ["Melaena", fmt(r.working.melaena_points)],
              ["Syncope", fmt(r.working.syncope_points)],
              ["Hepatic disease", fmt(r.working.hepatic_disease_points)],
              ["Cardiac failure", fmt(r.working.cardiac_failure_points)],
            ]}
          />
          <Facts
            title="Guideline thresholds"
            items={[
              [
                "NICE score-0 early discharge consideration",
                asText(r.working.nice_score_zero_early_discharge_consideration),
              ],
              [
                "ACG score 0-1 very-low-risk example",
                asText(r.working.acg_score_zero_to_one_very_low_risk_example),
              ],
            ]}
          />
        </>
      )}
      summary={(r) =>
        summaryText({
          heading: `Glasgow-Blatchford score ${fmt(r.result)} / 23`,
          interpretation: r.interpretation,
          findingsTitle: "Findings",
          findings: [
            `Sex (haemoglobin bands): ${sex}`,
            `Urea ${urea} mmol/L (${fmt(r.working.urea_points)})`,
            `Haemoglobin ${hb} g/L (${fmt(r.working.haemoglobin_points)})`,
            `Systolic BP ${sbp} mmHg (${fmt(r.working.systolic_bp_points)})`,
            `Heart rate ${hr} bpm (${fmt(r.working.heart_rate_points)})`,
            ...MARKERS.filter((m) => markers[m.key]).map((m) => m.label),
            `ED presentation with overt upper GI bleeding: ${edOvert}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "glasgow_blatchford",
  Component: GlasgowBlatchfordCalculator,
};
