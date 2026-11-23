// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Alert, Divider, Select, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconHeartRateMonitor } from "@tabler/icons-react";

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
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/**
 * QRISK3-2017 10-year cardiovascular risk (Hippisley-Cox et al, BMJ 2017).
 * The source treats an unknown Townsend score as 0 (the population average),
 * so "not known" is an explicit answer rather than an empty field sent as 0.
 * Erectile dysfunction is shown for the male equation only.
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
type TownsendMode = "unknown" | "known";

const SEX: Choice<Sex>[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
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

const CONDITIONS = [
  { key: "atrial_fibrillation", label: "Atrial fibrillation", hint: "Current or previous AF." },
  {
    key: "treated_hypertension",
    label: "Treated hypertension",
    hint: "Diagnosis of hypertension and currently on antihypertensive treatment.",
  },
  {
    key: "family_history_chd",
    label: "Family history of CHD <60",
    hint: "First-degree relative with angina or heart attack before 60.",
  },
  { key: "type1_diabetes", label: "Type 1 diabetes", hint: "Do not also tick type 2 diabetes." },
  { key: "type2_diabetes", label: "Type 2 diabetes", hint: "Do not also tick type 1 diabetes." },
  { key: "ckd_stage_3_5", label: "CKD stage 3-5", hint: "CKD stages 1-2 do not count for QRISK3." },
  {
    key: "rheumatoid_arthritis",
    label: "Rheumatoid arthritis",
    hint: "Clinician-asserted diagnosis.",
  },
  { key: "sle", label: "Systemic lupus erythematosus", hint: "Clinician-asserted diagnosis." },
  { key: "migraine", label: "Migraine", hint: "Current or previous migraine diagnosis." },
  {
    key: "severe_mental_illness",
    label: "Severe mental illness",
    hint: "Schizophrenia, bipolar disorder, or severe depression.",
  },
  {
    key: "atypical_antipsychotic",
    label: "Atypical antipsychotic",
    hint: "Currently prescribed an atypical antipsychotic.",
  },
  {
    key: "regular_steroids",
    label: "Regular oral corticosteroids",
    hint: "Regular systemic steroid treatment.",
  },
  {
    key: "erectile_dysfunction",
    label: "Erectile dysfunction",
    hint: "Male equation only; ignored for females.",
  },
] as const;

type ConditionKey = (typeof CONDITIONS)[number]["key"];
type Conditions = Record<ConditionKey, boolean>;

// The engine's own order, so the request reads like the schema.
const CONDITION_ORDER: ConditionKey[] = [
  "atrial_fibrillation",
  "atypical_antipsychotic",
  "regular_steroids",
  "migraine",
  "rheumatoid_arthritis",
  "ckd_stage_3_5",
  "severe_mental_illness",
  "sle",
  "treated_hypertension",
  "type1_diabetes",
  "type2_diabetes",
  "erectile_dysfunction",
  "family_history_chd",
];

const AGE = { min: 25, max: 84 };

const noneTicked = (): Conditions =>
  Object.fromEntries(CONDITIONS.map((c) => [c.key, false])) as Conditions;

const positive = (v: number | null): v is number => inRange(v, 0) && v > 0;

const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

function oneDecimal(v: unknown): string {
  const n = asNumber(v);
  return n === null ? "" : n.toFixed(1);
}

function riskColour(risk: number): string {
  if (risk >= 20) return "red";
  if (risk >= 10) return "yellow";
  return "teal";
}

export function Qrisk3Calculator() {
  const [age, setAge] = useState<number | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [ethnicity, setEthnicity] = useState<Ethnicity | null>(null);
  const [smoking, setSmoking] = useState<Smoking | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  const [systolic, setSystolic] = useState<number | null>(null);
  const [systolicSd, setSystolicSd] = useState<number | null>(null);
  const [townsendMode, setTownsendMode] = useState<TownsendMode | null>(null);
  const [townsend, setTownsend] = useState<number | null>(null);
  const [conditions, setConditions] = useState<Conditions>(noneTicked);

  const townsendValue =
    townsendMode === "unknown" ? 0 : townsendMode === "known" && inRange(townsend) ? townsend : null;

  const complete =
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age) &&
    sex !== null &&
    ethnicity !== null &&
    smoking !== null &&
    positive(height) &&
    positive(weight) &&
    inRange(ratio, 0) &&
    inRange(systolic, 0) &&
    inRange(systolicSd, 0) &&
    townsendValue !== null;
  const calc = useCalculation(
    "qrisk3",
    complete
      ? {
          age,
          sex,
          ethnicity,
          smoking,
          height_cm: height,
          weight_kg: weight,
          cholesterol_hdl_ratio: ratio,
          systolic_bp: systolic,
          systolic_bp_sd: systolicSd,
          townsend: townsendValue,
          ...Object.fromEntries(CONDITION_ORDER.map((k) => [k, conditions[k]])),
        }
      : null,
  );

  const reset = () => {
    setAge(null);
    setSex(null);
    setEthnicity(null);
    setSmoking(null);
    setHeight(null);
    setWeight(null);
    setRatio(null);
    setSystolic(null);
    setSystolicSd(null);
    setTownsendMode(null);
    setTownsend(null);
    setConditions(noneTicked());
  };

  return (
    <CalculatorPage
      icon={IconHeartRateMonitor}
      title="QRISK3"
      badge="10-year CVD risk"
      description="UK primary-care cardiovascular risk model. BMI is derived from height and weight; smoking and ethnicity use the exact QRISK3 categories."
      onReset={reset}
      calc={calc}
      maw={1120}
      incomplete={
        height === 0 || weight === 0
          ? "Height and weight must be above 0."
          : "Complete age, sex, ethnicity, smoking, the measurements, and the Townsend score to calculate."
      }
      form={
        <>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <NumberField
              label="Age"
              hint="Validated for 25-84"
              unit="years"
              value={age}
              onChange={setAge}
              min={AGE.min}
              max={AGE.max}
              decimals={0}
            />
            <ChoiceField
              label="Sex"
              value={sex}
              onChange={(value) => {
                setSex(value);
                if (value !== "male") {
                  setConditions((prev) => ({ ...prev, erectile_dysfunction: false }));
                }
              }}
              options={SEX}
              layout="segmented"
            />
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
            <NumberField
              label="Height"
              unit="cm"
              value={height}
              onChange={setHeight}
              min={0}
              decimals={1}
            />
            <NumberField
              label="Weight"
              unit="kg"
              value={weight}
              onChange={setWeight}
              min={0}
              decimals={1}
            />
            <NumberField
              label="Cholesterol / HDL ratio"
              hint="Use the ratio, not separate lipids"
              value={ratio}
              onChange={setRatio}
              min={0}
              step={0.1}
              decimals={1}
            />
            <NumberField
              label="Systolic BP"
              unit="mmHg"
              value={systolic}
              onChange={setSystolic}
              min={0}
            />
            <NumberField
              label="Systolic BP SD"
              hint="0 if unknown - not the BP itself"
              unit="mmHg"
              value={systolicSd}
              onChange={setSystolicSd}
              min={0}
            />
            <ChoiceField
              label="Townsend score known?"
              hint="Area-based deprivation; negative = less deprived."
              value={townsendMode}
              onChange={setTownsendMode}
              options={TOWNSEND_MODE}
            />
            {townsendMode === "known" && (
              <NumberField
                label="Townsend score"
                value={townsend}
                onChange={setTownsend}
                step={0.1}
                decimals={1}
              />
            )}
          </SimpleGrid>

          <Divider />

          <Stack gap="sm">
            <Text fw={600}>Clinical risk factors</Text>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
              {CONDITIONS.filter((c) => c.key !== "erectile_dysfunction" || sex === "male").map(
                (c) => (
                  <YesNoField
                    key={c.key}
                    label={c.label}
                    hint={c.hint}
                    checked={conditions[c.key]}
                    onChange={(checked) => setConditions((prev) => ({ ...prev, [c.key]: checked }))}
                  />
                ),
              )}
            </SimpleGrid>
          </Stack>
        </>
      }
      result={(r) => {
        const risk = asNumber(r.result) ?? 0;
        return (
          <ScoreTile
            value={oneDecimal(r.result)}
            unit="%"
            colour={riskColour(risk)}
            badge={risk >= 10 ? "NICE threshold met" : "Below 10%"}
          />
        );
      }}
      details={(r) => {
        const disclaimer = asText(r.working.disclaimer);
        return (
          <Stack gap="md">
            <Facts
              items={[
                ["BMI", `${oneDecimal(r.working.bmi)} kg/m2`],
                ["Equation", asText(r.working.sex) || asText(sex)],
              ]}
            />
            {disclaimer && (
              <Alert
                color="yellow"
                variant="light"
                icon={<IconAlertTriangle size={18} />}
                title="QRISK3 licence notice"
              >
                <Text size="xs" style={{ lineHeight: 1.45 }}>
                  {disclaimer}
                </Text>
              </Alert>
            )}
          </Stack>
        );
      }}
      summary={(r) => {
        const selected = CONDITIONS.filter((c) => conditions[c.key]).map((c) => `- ${c.label}`);
        return summaryText({
          heading: `QRISK3 10-year CVD risk: ${oneDecimal(r.result)}%`,
          interpretation: r.interpretation,
          extra: [
            `Age/sex: ${age} years, ${sex}`,
            `Ethnicity: ${labelOf(ETHNICITY, ethnicity)}`,
            `Smoking: ${labelOf(SMOKING, smoking)}`,
            `BMI used: ${oneDecimal(r.working.bmi)} kg/m2 (derived from ${height} cm / ${weight} kg)`,
            `Cholesterol/HDL ratio: ${ratio}`,
            `Systolic BP: ${systolic} mmHg; SBP SD: ${systolicSd} mmHg`,
            townsendMode === "unknown"
              ? "Townsend score: not known (0 used)"
              : `Townsend score: ${townsend}`,
            selected.length > 0
              ? `Risk factors:\n${selected.join("\n")}`
              : "No listed QRISK3 clinical risk factors selected.",
            !r.interpretation.includes(asText(r.working.disclaimer)) &&
              `\n${asText(r.working.disclaimer)}`,
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "qrisk3", Component: Qrisk3Calculator };
