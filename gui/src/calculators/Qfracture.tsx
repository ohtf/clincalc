// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconBone } from "@tabler/icons-react";

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

/** QFracture-2012 10-year fracture risk (Hippisley-Cox & Coupland, BMJ 2012). */

type Sex = "male" | "female";
type Ethnicity =
  | "white_or_not_stated"
  | "indian"
  | "pakistani"
  | "bangladeshi"
  | "other_asian"
  | "black_caribbean"
  | "black_african"
  | "chinese"
  | "other_ethnic_group";
type Smoking = "non_smoker" | "ex_smoker" | "light_smoker" | "moderate_smoker" | "heavy_smoker";
type Alcohol = "none" | "trivial" | "light" | "medium" | "heavy" | "very_heavy";

const SEX: Choice<Sex>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const ETHNICITY: Choice<Ethnicity>[] = [
  { value: "white_or_not_stated", label: "White or not stated" },
  { value: "indian", label: "Indian" },
  { value: "pakistani", label: "Pakistani" },
  { value: "bangladeshi", label: "Bangladeshi" },
  { value: "other_asian", label: "Other Asian" },
  { value: "black_caribbean", label: "Black Caribbean" },
  { value: "black_african", label: "Black African" },
  { value: "chinese", label: "Chinese" },
  { value: "other_ethnic_group", label: "Other ethnic group, including mixed" },
];

const SMOKING: Choice<Smoking>[] = [
  { value: "non_smoker", label: "Non-smoker" },
  { value: "ex_smoker", label: "Ex-smoker" },
  { value: "light_smoker", label: "Light smoker (fewer than 10 a day)" },
  { value: "moderate_smoker", label: "Moderate smoker (10 to 19 a day)" },
  { value: "heavy_smoker", label: "Heavy smoker (20 or more a day)" },
];

const ALCOHOL: Choice<Alcohol>[] = [
  { value: "none", label: "None" },
  { value: "trivial", label: "Trivial (less than 1 unit a day)" },
  { value: "light", label: "Light (1 to 2 units a day)" },
  { value: "medium", label: "Medium (3 to 6 units a day)" },
  { value: "heavy", label: "Heavy (7 to 9 units a day)" },
  { value: "very_heavy", label: "Very heavy (more than 9 units a day)" },
];

type Flag = {
  key: string;
  label: string;
  hint?: string;
  only?: Sex;
};

const SECTIONS: Array<{ title: string; flags: Flag[] }> = [
  {
    title: "Fracture history",
    flags: [
      {
        key: "previous_fracture",
        label: "Previous osteoporotic fracture",
        hint: "Wrist, spine, hip, or shoulder.",
      },
      { key: "history_of_falls", label: "History of falls" },
      {
        key: "parental_osteoporosis",
        label: "Parental history of osteoporosis or hip fracture",
        hint: "Not used by the female hip-fracture equation.",
      },
    ],
  },
  {
    title: "Conditions",
    flags: [
      { key: "any_cancer", label: "Any cancer" },
      {
        key: "asthma_or_copd",
        label: "Asthma or COPD",
        hint: "Combined into one variable in QFracture.",
      },
      { key: "cardiovascular_disease", label: "Cardiovascular disease" },
      { key: "dementia", label: "Dementia" },
      {
        key: "endocrine_problems",
        label: "Thyrotoxicosis, hyperparathyroidism, or Cushing's syndrome",
        hint: "Female equations only.",
        only: "female",
      },
      { key: "epilepsy_or_anticonvulsants", label: "Epilepsy or on anticonvulsants" },
      { key: "liver_disease", label: "Chronic liver disease" },
      {
        key: "malabsorption",
        label: "Malabsorption",
        hint: "Crohn's, ulcerative colitis, coeliac disease, steatorrhoea, or blind-loop syndrome. Osteoporotic outcome only; not used for hip fracture.",
      },
      { key: "parkinsons", label: "Parkinson's disease" },
      {
        key: "rheumatoid_or_sle",
        label: "Rheumatoid arthritis or systemic lupus erythematosus",
        hint: "Combined into one variable in QFracture.",
      },
      { key: "renal_disease", label: "Chronic renal disease" },
      { key: "type1_diabetes", label: "Type 1 diabetes" },
      { key: "type2_diabetes", label: "Type 2 diabetes" },
    ],
  },
  {
    title: "Medication",
    flags: [
      {
        key: "antidepressant",
        label: "On a tricyclic or other antidepressant",
        hint: "Two or more prescriptions.",
      },
      {
        key: "corticosteroids",
        label: "On systemic corticosteroids",
        hint: "Two or more prescriptions.",
      },
      { key: "hrt", label: "On HRT or oestrogen", hint: "Female equations only.", only: "female" },
    ],
  },
  {
    title: "Residence",
    flags: [
      {
        key: "care_home",
        label: "Resident of a care or nursing home",
        hint: "Male equations only.",
        only: "male",
      },
    ],
  },
];

const FLAGS = SECTIONS.flatMap((s) => s.flags);
type Flags = Record<string, boolean>;

const AGE = { min: 30, max: 100 };
const HEIGHT = { min: 50, max: 250 };
const WEIGHT = { min: 20, max: 500 };

const noneTicked = (): Flags => Object.fromEntries(FLAGS.map((f) => [f.key, false]));
const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

function QfractureCalculator() {
  const [age, setAge] = useState<number | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [ethnicity, setEthnicity] = useState<Ethnicity | null>(null);
  const [smoking, setSmoking] = useState<Smoking | null>(null);
  const [alcohol, setAlcohol] = useState<Alcohol | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [flags, setFlags] = useState<Flags>(noneTicked);

  const applies = (f: Flag) => f.only === undefined || sex === null || f.only === sex;
  const used = FLAGS.filter((f) => applies(f) && flags[f.key]);

  const complete =
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age) &&
    sex !== null &&
    ethnicity !== null &&
    smoking !== null &&
    alcohol !== null &&
    inRange(height, HEIGHT.min, HEIGHT.max) &&
    inRange(weight, WEIGHT.min, WEIGHT.max);
  const calc = useCalculation(
    "qfracture",
    complete
      ? {
          age,
          sex,
          ethnicity,
          smoking,
          alcohol,
          height_cm: height,
          weight_kg: weight,
          ...Object.fromEntries(FLAGS.map((f) => [f.key, applies(f) && flags[f.key]])),
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconBone}
      title="QFracture-2012"
      badge="Fracture risk"
      description="10-year risk of a major osteoporotic fracture (hip, vertebral, proximal humerus, or distal radius) and, separately, of a hip fracture, for ages 30-100 (Hippisley-Cox & Coupland 2012). The open UK alternative to FRAX; QFracture-2012 algorithm © 2012 ClinRisk Ltd., LGPL-3.0-or-later."
      onReset={() => {
        setAge(null);
        setSex(null);
        setEthnicity(null);
        setSmoking(null);
        setAlcohol(null);
        setHeight(null);
        setWeight(null);
        setFlags(noneTicked());
      }}
      calc={calc}
      incomplete="Enter age, sex, ethnicity, smoking, alcohol, height, and weight to calculate. Tick any risk factors that apply."
      form={
        <>
          <Text fw={600}>Patient</Text>
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Age"
              hint="Validated for ages 30-100."
              unit="years"
              value={age}
              onChange={setAge}
              min={AGE.min}
              max={AGE.max}
              decimals={0}
            />
            <ChoiceField
              label="Sex"
              hint="Selects the male or female equations."
              value={sex}
              onChange={setSex}
              options={SEX}
            />
          </SimpleGrid>
          <ChoiceField
            label="Ethnicity"
            hint="Self-reported, in the nine QFracture categories."
            value={ethnicity}
            onChange={setEthnicity}
            options={ETHNICITY}
          />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Height"
              hint="Used with weight to derive BMI."
              unit="cm"
              value={height}
              onChange={setHeight}
              min={HEIGHT.min}
              max={HEIGHT.max}
              decimals={1}
            />
            <NumberField
              label="Weight"
              hint="Used with height to derive BMI."
              unit="kg"
              value={weight}
              onChange={setWeight}
              min={WEIGHT.min}
              max={WEIGHT.max}
              decimals={1}
            />
          </SimpleGrid>
          <SimpleGrid cols={2} spacing="md">
            <ChoiceField label="Smoking" value={smoking} onChange={setSmoking} options={SMOKING} />
            <ChoiceField label="Alcohol" value={alcohol} onChange={setAlcohol} options={ALCOHOL} />
          </SimpleGrid>
          {SECTIONS.map((section) => {
            const shown = section.flags.filter(applies);
            if (shown.length === 0) return null;
            return (
              <div key={section.title}>
                <Text fw={600} mt="xs">
                  {section.title}
                </Text>
                <Divider mb="sm" />
                <SimpleGrid cols={2} spacing="sm" verticalSpacing="sm">
                  {shown.map((f) => (
                    <YesNoField
                      key={f.key}
                      label={f.label}
                      hint={f.hint}
                      checked={flags[f.key]}
                      onChange={(checked) => setFlags((prev) => ({ ...prev, [f.key]: checked }))}
                    />
                  ))}
                </SimpleGrid>
              </div>
            );
          })}
        </>
      }
      result={(r) => (
        <ScoreTile value={fmt(r.result)} unit="%" badge="Major osteoporotic fracture, 10 years" />
      )}
      details={(r) => (
        <Facts
          items={[
            ["Hip fracture, 10 years", `${fmt(r.working.hip_fracture_percent)}%`],
            ["BMI used", `${fmt(r.working.bmi)} kg/m²`],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `QFracture-2012: 10-year risk of major osteoporotic fracture ${fmt(r.result)}%, hip fracture ${fmt(r.working.hip_fracture_percent)}%`,
          interpretation: r.interpretation,
          findingsTitle: "Inputs",
          findings: [
            `Age ${age} years, ${sex}`,
            `Ethnicity: ${labelOf(ETHNICITY, ethnicity)}`,
            `Smoking: ${labelOf(SMOKING, smoking)}`,
            `Alcohol: ${labelOf(ALCOHOL, alcohol)}`,
            `Height ${height} cm, weight ${weight} kg (BMI ${fmt(r.working.bmi)} kg/m²)`,
            ...used.map((f) => f.label),
          ],
          extra: [used.length === 0 && "No other risk factors ticked."],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "qfracture", Component: QfractureCalculator };
