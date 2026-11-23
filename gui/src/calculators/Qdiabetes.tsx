// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Alert, Divider, Select, SimpleGrid, Stack, Text } from "@mantine/core";
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
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/**
 * QDiabetes-2018 10-year risk of type 2 diabetes (Hippisley-Cox & Coupland,
 * BMJ 2017). The optional blood test selects model A, B, or C - never both
 * readings. The female-only fields are hidden for males, and an unknown
 * Townsend score is an explicit answer (the source uses 0, the population
 * average) rather than an empty field sent as 0.
 */

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
type OptionalTest = "none" | "fasting_glucose" | "hba1c";
type TownsendMode = "unknown" | "known";

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
  { value: "other_ethnic_group", label: "Other ethnic group" },
];

const SMOKING: Choice<Smoking>[] = [
  { value: "non_smoker", label: "Non-smoker" },
  { value: "ex_smoker", label: "Ex-smoker" },
  { value: "light_smoker", label: "Light smoker (<10/day)" },
  { value: "moderate_smoker", label: "Moderate smoker (10-19/day)" },
  { value: "heavy_smoker", label: "Heavy smoker (20+/day)" },
];

const TOWNSEND_MODE: Choice<TownsendMode>[] = [
  { value: "unknown", label: "Not known", hint: "0 is used, the population average." },
  { value: "known", label: "Enter score" },
];

const OPTIONAL_TEST: Choice<OptionalTest>[] = [
  { value: "none", label: "None (model A)" },
  { value: "fasting_glucose", label: "Fasting glucose (model B)" },
  { value: "hba1c", label: "HbA1c (model C)" },
];

const HISTORY = [
  { key: "family_history_diabetes", label: "Family history of diabetes" },
  { key: "cardiovascular_disease", label: "Cardiovascular disease" },
  { key: "treated_hypertension", label: "Treated hypertension" },
  { key: "learning_disability", label: "Learning disability" },
  { key: "bipolar_or_schizophrenia", label: "Bipolar disorder or schizophrenia" },
  { key: "regular_steroids", label: "Regular steroid tablets" },
  { key: "statin", label: "On statins" },
  { key: "atypical_antipsychotic", label: "Atypical antipsychotic medication" },
] as const;

const FEMALE_ONLY = [
  { key: "polycystic_ovary_syndrome", label: "Polycystic ovary syndrome" },
  { key: "gestational_diabetes", label: "Gestational diabetes" },
] as const;

type HistoryKey = (typeof HISTORY)[number]["key"] | (typeof FEMALE_ONLY)[number]["key"];
type History = Record<HistoryKey, boolean>;

const AGE = { min: 25, max: 84 };
const HEIGHT = { min: 140, max: 210 };
const WEIGHT = { min: 40, max: 180 };
const GLUCOSE = { min: 2, max: 6.99 };
const HBA1C = { min: 15, max: 47.99 };

const noneTicked = (): History =>
  Object.fromEntries([...HISTORY, ...FEMALE_ONLY].map((h) => [h.key, false])) as History;

const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

export function QdiabetesCalculator() {
  const [age, setAge] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [ethnicity, setEthnicity] = useState<Ethnicity | null>(null);
  const [smoking, setSmoking] = useState<Smoking | null>(null);
  const [townsendMode, setTownsendMode] = useState<TownsendMode | null>(null);
  const [townsend, setTownsend] = useState<number | null>(null);
  const [history, setHistory] = useState<History>(noneTicked);
  const [test, setTest] = useState<OptionalTest>("none");
  const [glucose, setGlucose] = useState<number | null>(null);
  const [hba1c, setHba1c] = useState<number | null>(null);

  const townsendValue =
    townsendMode === "unknown" ? 0 : townsendMode === "known" && inRange(townsend) ? townsend : null;
  const testComplete =
    test === "none" ||
    (test === "fasting_glucose" && inRange(glucose, GLUCOSE.min, GLUCOSE.max)) ||
    (test === "hba1c" && inRange(hba1c, HBA1C.min, HBA1C.max));

  const complete =
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age) &&
    inRange(height, HEIGHT.min, HEIGHT.max) &&
    inRange(weight, WEIGHT.min, WEIGHT.max) &&
    sex !== null &&
    ethnicity !== null &&
    smoking !== null &&
    townsendValue !== null &&
    testComplete;
  const female = sex === "female";
  const calc = useCalculation(
    "qdiabetes",
    complete
      ? {
          age,
          sex,
          ethnicity,
          smoking,
          height_cm: height,
          weight_kg: weight,
          townsend: townsendValue,
          ...Object.fromEntries(HISTORY.map((h) => [h.key, history[h.key]])),
          polycystic_ovary_syndrome: female && history.polycystic_ovary_syndrome,
          gestational_diabetes: female && history.gestational_diabetes,
          ...(test === "fasting_glucose" && { fasting_glucose_mmol_l: glucose }),
          ...(test === "hba1c" && { hba1c_mmol_mol: hba1c }),
        }
      : null,
  );

  const toggle = (key: HistoryKey) => (checked: boolean) =>
    setHistory((prev) => ({ ...prev, [key]: checked }));

  return (
    <CalculatorPage
      icon={IconDroplet}
      title="QDiabetes-2018"
      badge="Type 2 diabetes risk"
      description="10-year risk of developing type 2 diabetes, recommended by NICE for identifying patients at high risk from routinely available primary-care data."
      onReset={() => {
        setAge(null);
        setHeight(null);
        setWeight(null);
        setSex(null);
        setEthnicity(null);
        setSmoking(null);
        setTownsendMode(null);
        setTownsend(null);
        setHistory(noneTicked());
        setTest("none");
        setGlucose(null);
        setHba1c(null);
      }}
      calc={calc}
      maw={1000}
      incomplete={
        test === "none"
          ? "Complete age, height, weight, sex, ethnicity, smoking, and the Townsend score to calculate."
          : `Complete age, height, weight, sex, ethnicity, smoking, the Townsend score, and the ${test === "hba1c" ? "HbA1c" : "fasting glucose"} to calculate.`
      }
      form={
        <>
          <SimpleGrid cols={3} spacing="md">
            <NumberField
              label="Age"
              hint="25-84"
              unit="years"
              value={age}
              onChange={setAge}
              min={AGE.min}
              max={AGE.max}
              decimals={0}
            />
            <NumberField
              label="Height"
              hint="140-210"
              unit="cm"
              value={height}
              onChange={setHeight}
              min={HEIGHT.min}
              max={HEIGHT.max}
              decimals={1}
            />
            <NumberField
              label="Weight"
              hint="40-180"
              unit="kg"
              value={weight}
              onChange={setWeight}
              min={WEIGHT.min}
              max={WEIGHT.max}
              decimals={1}
            />
          </SimpleGrid>

          <ChoiceField label="Sex" value={sex} onChange={setSex} options={SEX} layout="segmented" />

          <SimpleGrid cols={2} spacing="md">
            <Select
              label="Ethnicity"
              placeholder="Select ethnicity"
              data={ETHNICITY}
              value={ethnicity}
              onChange={(value) => setEthnicity(value as Ethnicity | null)}
              allowDeselect={false}
            />
            <Select
              label="Smoking"
              placeholder="Select smoking status"
              data={SMOKING}
              value={smoking}
              onChange={(value) => setSmoking(value as Smoking | null)}
              allowDeselect={false}
            />
          </SimpleGrid>

          <SimpleGrid cols={2} spacing="md">
            <ChoiceField
              label="Townsend score known?"
              hint="area-based; negative = less deprived, 0 if unknown"
              value={townsendMode}
              onChange={setTownsendMode}
              options={TOWNSEND_MODE}
            />
            {townsendMode === "known" && (
              <NumberField
                label="Townsend deprivation score"
                value={townsend}
                onChange={setTownsend}
                step={0.1}
                decimals={1}
              />
            )}
          </SimpleGrid>

          <Divider />

          <Text fw={600}>Clinical history</Text>
          <SimpleGrid cols={2} spacing="xs">
            {HISTORY.map((h) => (
              <YesNoField
                key={h.key}
                label={h.label}
                checked={history[h.key]}
                onChange={toggle(h.key)}
              />
            ))}
          </SimpleGrid>

          {female && (
            <>
              <Divider label="Women only" labelPosition="left" />
              <SimpleGrid cols={2} spacing="xs">
                {FEMALE_ONLY.map((h) => (
                  <YesNoField
                    key={h.key}
                    label={h.label}
                    checked={history[h.key]}
                    onChange={toggle(h.key)}
                  />
                ))}
              </SimpleGrid>
            </>
          )}

          <Divider label="Optional: refine with a blood test" labelPosition="left" />
          <ChoiceField
            label="Blood test"
            value={test}
            onChange={setTest}
            options={OPTIONAL_TEST}
            layout="segmented"
          />
          {test === "fasting_glucose" && (
            <NumberField
              label="Fasting blood glucose"
              hint="2.0-6.99"
              unit="mmol/L"
              value={glucose}
              onChange={setGlucose}
              min={GLUCOSE.min}
              max={GLUCOSE.max}
              step={0.1}
              decimals={2}
            />
          )}
          {test === "hba1c" && (
            <NumberField
              label="HbA1c"
              hint="15.0-47.99"
              unit="mmol/mol"
              value={hba1c}
              onChange={setHba1c}
              min={HBA1C.min}
              max={HBA1C.max}
              step={0.1}
              decimals={2}
            />
          )}
        </>
      }
      result={(r) => (
        <ScoreTile
          value={asText(r.result)}
          unit="%"
          badge={`model ${asText(r.working.model)}`}
        />
      )}
      details={(r) => (
        <Stack gap="md">
          <Facts items={[["BMI", `${asText(r.working.bmi)} kg/m²`]]} />
          <Alert color="gray" variant="light" title="ClinRisk licence disclaimer">
            <Text size="xs">{asText(r.working.disclaimer)}</Text>
          </Alert>
        </Stack>
      )}
      summary={(r) => {
        const factors = [
          ...HISTORY.filter((h) => history[h.key]).map((h) => `- ${h.label}`),
          ...(female ? FEMALE_ONLY.filter((h) => history[h.key]).map((h) => `- ${h.label}`) : []),
        ];
        return summaryText({
          heading: `QDiabetes-2018 ${asText(r.result)}% (model ${asText(r.working.model)})`,
          interpretation: r.interpretation,
          extra: [
            `Age: ${age}, sex: ${sex}, BMI: ${asText(r.working.bmi)} kg/m2`,
            `Ethnicity: ${labelOf(ETHNICITY, ethnicity)}, smoking: ${labelOf(SMOKING, smoking)}`,
            test === "fasting_glucose" && `Fasting blood glucose: ${glucose} mmol/L`,
            test === "hba1c" && `HbA1c: ${hba1c} mmol/mol`,
            factors.length > 0 ? factors.join("\n") : "No additional risk factors.",
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "qdiabetes", Component: QdiabetesCalculator };
