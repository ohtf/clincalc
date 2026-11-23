// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, Text } from "@mantine/core";
import { IconHeartPlus } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  YesNoField,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** EuroSCORE II predicted operative mortality after cardiac surgery (Nashef 2012). */

type Sex = "male" | "female";
type Renal = "normal" | "moderate" | "severe" | "on_dialysis";
type Nyha = "i" | "ii" | "iii" | "iv";
type Lv = "good" | "moderate" | "poor" | "very_poor";
type Pa = "none" | "moderate" | "severe";
type Urgency = "elective" | "urgent" | "emergency" | "salvage";
type Weight = "isolated_cabg" | "single_non_cabg" | "two_procedures" | "three_or_more";

const SEX: Choice<Sex>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const RENAL: Choice<Renal>[] = [
  { value: "normal", label: "Normal - CrCl above 85 mL/min" },
  { value: "moderate", label: "Moderate - CrCl 51-85 mL/min" },
  { value: "severe", label: "Severe - CrCl 50 mL/min or below" },
  { value: "on_dialysis", label: "On dialysis", hint: "Regardless of creatinine clearance." },
];

const NYHA: Choice<Nyha>[] = [
  { value: "i", label: "I - No limitation" },
  { value: "ii", label: "II - Slight limitation on ordinary activity" },
  { value: "iii", label: "III - Marked limitation on less-than-ordinary activity" },
  { value: "iv", label: "IV - Symptoms at rest" },
];

const LV: Choice<Lv>[] = [
  { value: "good", label: "Good - LVEF above 50%" },
  { value: "moderate", label: "Moderate - LVEF 31-50%" },
  { value: "poor", label: "Poor - LVEF 21-30%" },
  { value: "very_poor", label: "Very poor - LVEF 20% or below" },
];

const PA: Choice<Pa>[] = [
  { value: "none", label: "None - PA systolic below 31 mmHg" },
  { value: "moderate", label: "Moderate - PA systolic 31-55 mmHg" },
  { value: "severe", label: "Severe - PA systolic above 55 mmHg" },
];

const URGENCY: Choice<Urgency>[] = [
  { value: "elective", label: "Elective", hint: "Routine admission for operation." },
  {
    value: "urgent",
    label: "Urgent",
    hint: "Not electively admitted, but requires surgery on the current admission.",
  },
  {
    value: "emergency",
    label: "Emergency",
    hint: "Operation before the start of the next working day after the decision to operate.",
  },
  {
    value: "salvage",
    label: "Salvage",
    hint: "Requiring CPR en route to theatre or before induction.",
  },
];

const WEIGHT: Choice<Weight>[] = [
  { value: "isolated_cabg", label: "Isolated CABG" },
  { value: "single_non_cabg", label: "Single major procedure other than isolated CABG" },
  {
    value: "two_procedures",
    label: "Two major procedures",
    hint: "CABG combined with one other major procedure counts as two.",
  },
  { value: "three_or_more", label: "Three or more major procedures" },
];

const PATIENT = [
  {
    key: "insulin_dependent_diabetes",
    label: "Insulin-dependent diabetes",
    hint: "Treated with insulin at the time of surgery. Diet- or oral-agent-controlled diabetes does not count.",
  },
  {
    key: "chronic_pulmonary_dysfunction",
    label: "Chronic pulmonary dysfunction",
    hint: "Long-term use of bronchodilators or steroids for lung disease.",
  },
  {
    key: "extracardiac_arteriopathy",
    label: "Extracardiac arteriopathy",
    hint: "Claudication, carotid occlusion or over 50% stenosis, amputation for arterial disease, or previous or planned intervention on the abdominal aorta, limb arteries, or carotids.",
  },
  {
    key: "poor_mobility",
    label: "Poor mobility",
    hint: "Severe impairment of mobility from musculoskeletal or neurological dysfunction.",
  },
  {
    key: "previous_cardiac_surgery",
    label: "Previous cardiac surgery",
    hint: "One or more previous major cardiac operations involving opening of the pericardium.",
  },
  {
    key: "active_endocarditis",
    label: "Active endocarditis",
    hint: "Still on antibiotic treatment for endocarditis at the time of surgery.",
  },
  {
    key: "critical_preoperative_state",
    label: "Critical preoperative state",
    hint: "Any of: VT/VF or aborted sudden death; preoperative cardiac massage; ventilation before the anaesthetic room; inotropes; IABP or VAD; or acute renal failure (anuria or oliguria below 10 mL/h).",
  },
] as const;

const CARDIAC = [
  {
    key: "ccs4_angina",
    label: "CCS class 4 angina",
    hint: "Angina at rest, or inability to carry out any activity without angina.",
  },
  {
    key: "recent_mi",
    label: "Recent myocardial infarction",
    hint: "Within 90 days before the operation.",
  },
] as const;

const OPERATION = [
  { key: "thoracic_aorta_surgery", label: "Surgery on the thoracic aorta" },
] as const;

const ALL = [...PATIENT, ...CARDIAC, ...OPERATION];
type Key = (typeof ALL)[number]["key"];
type Criteria = Record<Key, boolean>;

const AGE = { min: 18, max: 110 };
const noneTicked = (): Criteria => Object.fromEntries(ALL.map((c) => [c.key, false])) as Criteria;

const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

function Section({ title }: { title: string }) {
  return (
    <>
      <Text fw={600} mt="sm">
        {title}
      </Text>
      <Divider />
    </>
  );
}

function Euroscore2Calculator() {
  const [age, setAge] = useState<number | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [renal, setRenal] = useState<Renal | null>(null);
  const [nyha, setNyha] = useState<Nyha | null>(null);
  const [lv, setLv] = useState<Lv | null>(null);
  const [pa, setPa] = useState<Pa | null>(null);
  const [urgency, setUrgency] = useState<Urgency | null>(null);
  const [weight, setWeight] = useState<Weight | null>(null);
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);

  const complete =
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age) &&
    sex !== null &&
    renal !== null &&
    nyha !== null &&
    lv !== null &&
    pa !== null &&
    urgency !== null &&
    weight !== null;
  const calc = useCalculation(
    "euroscore2",
    complete
      ? {
          age,
          female: sex === "female",
          renal_function: renal,
          nyha,
          lv_function: lv,
          pulmonary_hypertension: pa,
          urgency,
          weight_of_intervention: weight,
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
      icon={IconHeartPlus}
      title="EuroSCORE II"
      badge="Cardiac surgery"
      description="Predicted in-hospital mortality after cardiac surgery from 18 preoperative factors (Nashef 2012). A population model for risk adjustment and counselling, not a guarantee for an individual."
      onReset={() => {
        setAge(null);
        setSex(null);
        setRenal(null);
        setNyha(null);
        setLv(null);
        setPa(null);
        setUrgency(null);
        setWeight(null);
        setCriteria(noneTicked());
      }}
      calc={calc}
      incomplete="Enter age and sex and answer every banded factor to calculate."
      form={
        <>
          <Section title="Patient-related factors" />
          <NumberField
            label="Age"
            hint="The model's age term is 1 at 60 or under and rises by 1 per year after 60."
            unit="years"
            value={age}
            onChange={setAge}
            min={AGE.min}
            max={AGE.max}
            decimals={0}
          />
          <ChoiceField label="Sex" value={sex} onChange={setSex} options={SEX} />
          <ChoiceField
            label="Renal function"
            hint="Cockcroft-Gault creatinine clearance, not serum creatinine."
            value={renal}
            onChange={setRenal}
            options={RENAL}
          />
          {PATIENT.map(tick)}

          <Section title="Cardiac-related factors" />
          <ChoiceField label="NYHA class" value={nyha} onChange={setNyha} options={NYHA} />
          {CARDIAC.map(tick)}
          <ChoiceField label="Left-ventricular function" value={lv} onChange={setLv} options={LV} />
          <ChoiceField
            label="Pulmonary hypertension"
            hint="Pulmonary-artery systolic pressure."
            value={pa}
            onChange={setPa}
            options={PA}
          />

          <Section title="Operation-related factors" />
          <ChoiceField label="Urgency" value={urgency} onChange={setUrgency} options={URGENCY} />
          <ChoiceField
            label="Weight of the intervention"
            hint="A major procedure is any major cardiac procedure on the heart or proximate great vessels."
            value={weight}
            onChange={setWeight}
            options={WEIGHT}
          />
          {OPERATION.map(tick)}
        </>
      }
      result={(r) => <ScoreTile value={fmt(r.result, 2)} unit="%" />}
      details={(r) => (
        <Facts
          items={[
            ["Age term", fmt(r.working.age_step)],
            ["Linear predictor", fmt(r.working.linear_predictor, 3)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `EuroSCORE II predicted operative mortality ${fmt(r.result, 2)}%`,
          interpretation: r.interpretation,
          findingsTitle: "Factors",
          findings: [
            `Age ${age} years, ${sex}`,
            `Renal function: ${labelOf(RENAL, renal)}`,
            `NYHA class ${labelOf(NYHA, nyha)}`,
            `LV function: ${labelOf(LV, lv)}`,
            `Pulmonary hypertension: ${labelOf(PA, pa)}`,
            `Urgency: ${labelOf(URGENCY, urgency)}`,
            `Weight of intervention: ${labelOf(WEIGHT, weight)}`,
            ...ALL.filter((c) => criteria[c.key]).map((c) => c.label),
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "euroscore2", Component: Euroscore2Calculator };
