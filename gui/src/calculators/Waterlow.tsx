// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState, type ReactNode } from "react";
import { Divider, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconBed } from "@tabler/icons-react";

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

/** Waterlow pressure ulcer risk score (Waterlow 1985, revised 2005 card). */

type Build = "average" | "above_average" | "obese" | "below_average";
type Continence = "complete" | "urine_incontinent" | "faeces_incontinent" | "doubly_incontinent";
type Mobility = "fully" | "restless" | "apathetic" | "restricted" | "bedbound" | "chairbound";
type Sex = "male" | "female";
type WeightLoss = "none" | "kg0_5_to5" | "kg5_to10" | "kg10_to15" | "kg_over15" | "unsure";
type Tissue =
  | "none"
  | "smoking"
  | "anaemia"
  | "peripheral_vascular_disease"
  | "single_organ_failure"
  | "multiple_organ_failure"
  | "terminal_cachexia";
type Neuro = "none" | "mild" | "moderate" | "severe";
type Surgery = "none" | "orthopaedic_or_spinal" | "on_table_over2h" | "on_table_over6h";
type Medication = "none" | "high_risk";

const BUILD: Choice<Build>[] = [
  { value: "average", label: "Average - BMI 20-24.9 (0)" },
  { value: "above_average", label: "Above average - BMI 25-29.9 (1)" },
  { value: "obese", label: "Obese - BMI over 30 (2)" },
  { value: "below_average", label: "Below average - BMI under 20 (3)" },
];

const CONTINENCE: Choice<Continence>[] = [
  { value: "complete", label: "Complete or catheterised (0)" },
  { value: "urine_incontinent", label: "Urine incontinence (1)" },
  { value: "faeces_incontinent", label: "Faecal incontinence (2)" },
  { value: "doubly_incontinent", label: "Urinary and faecal incontinence (3)" },
];

const SKIN = [
  { key: "skin_tissue_paper", label: "Tissue paper - thin or fragile (1)" },
  { key: "skin_dry", label: "Dry (1)" },
  { key: "skin_oedematous", label: "Oedematous (1)" },
  { key: "skin_clammy", label: "Clammy or pyrexial (1)" },
  { key: "skin_discoloured", label: "Discoloured - grade 1, non-blanching erythema (2)" },
  { key: "skin_broken", label: "Broken or spot - grade 2-4 (3)" },
] as const;

const MOBILITY: Choice<Mobility>[] = [
  { value: "fully", label: "Fully mobile (0)" },
  { value: "restless", label: "Restless or fidgety (1)" },
  { value: "apathetic", label: "Apathetic (2)" },
  { value: "restricted", label: "Restricted (3)" },
  { value: "bedbound", label: "Bedbound, e.g. traction (4)" },
  { value: "chairbound", label: "Chairbound, e.g. wheelchair (5)" },
];

const SEX: Choice<Sex>[] = [
  { value: "male", label: "Male (1)" },
  { value: "female", label: "Female (2)" },
];

const WEIGHT_LOSS: Choice<WeightLoss>[] = [
  { value: "none", label: "No recent weight loss (0)" },
  { value: "kg0_5_to5", label: "0.5-5 kg (1)" },
  { value: "kg5_to10", label: "5-10 kg (2)" },
  { value: "kg10_to15", label: "10-15 kg (3)" },
  { value: "kg_over15", label: "More than 15 kg (4)" },
  { value: "unsure", label: "Unsure (2)" },
];

const TISSUE: Choice<Tissue>[] = [
  { value: "none", label: "None (0)" },
  { value: "smoking", label: "Smoking (1)" },
  { value: "anaemia", label: "Anaemia - Hb under 8 (2)" },
  { value: "peripheral_vascular_disease", label: "Peripheral vascular disease (5)" },
  { value: "single_organ_failure", label: "Single organ failure - cardiac, renal, or respiratory (5)" },
  { value: "multiple_organ_failure", label: "Multiple organ failure (8)" },
  { value: "terminal_cachexia", label: "Terminal cachexia (8)" },
];

const NEURO: Choice<Neuro>[] = [
  { value: "none", label: "None (0)" },
  { value: "mild", label: "Mild, e.g. diabetes, MS, or CVA (4)" },
  { value: "moderate", label: "Moderate motor or sensory deficit (5)" },
  { value: "severe", label: "Severe, e.g. paraplegia (6)" },
];

const SURGERY: Choice<Surgery>[] = [
  { value: "none", label: "None (0)" },
  { value: "orthopaedic_or_spinal", label: "Orthopaedic (below waist) or spinal (5)" },
  { value: "on_table_over2h", label: "On table more than 2 hours (5)" },
  { value: "on_table_over6h", label: "On table more than 6 hours (8)" },
];

const MEDICATION: Choice<Medication>[] = [
  { value: "none", label: "None of these (0)" },
  {
    value: "high_risk",
    label: "Cytotoxics, long-term or high-dose steroids, or anti-inflammatories (4)",
  },
];

type SkinKey = (typeof SKIN)[number]["key"];
type SkinState = Record<SkinKey, boolean>;
const noSkin = (): SkinState => Object.fromEntries(SKIN.map((s) => [s.key, false])) as SkinState;

const AGE = { min: 14, max: 120 };

const BAND_LABEL: Record<string, string> = {
  "not-at-risk": "below at-risk threshold",
  "at-risk": "at risk",
  "high-risk": "high risk",
  "very-high-risk": "very high risk",
};
const BAND_COLOUR: Record<string, string> = {
  "not-at-risk": "teal",
  "at-risk": "yellow",
  "high-risk": "orange",
  "very-high-risk": "red",
};

const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap="sm">
      <div>
        <Text fw={600} size="sm">
          {title}
        </Text>
        <Divider mt={4} />
      </div>
      {children}
    </Stack>
  );
}

function WaterlowCalculator() {
  const [build, setBuild] = useState<Build | null>(null);
  const [continence, setContinence] = useState<Continence | null>(null);
  const [skin, setSkin] = useState<SkinState>(noSkin);
  const [mobility, setMobility] = useState<Mobility | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [weightLoss, setWeightLoss] = useState<WeightLoss | null>(null);
  const [eatingPoorly, setEatingPoorly] = useState(false);
  const [acutelyIll, setAcutelyIll] = useState(false);
  const [tissue, setTissue] = useState<Tissue | null>(null);
  const [neuro, setNeuro] = useState<Neuro | null>(null);
  const [surgery, setSurgery] = useState<Surgery | null>(null);
  const [medication, setMedication] = useState<Medication | null>(null);

  const complete =
    build !== null &&
    continence !== null &&
    mobility !== null &&
    sex !== null &&
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age) &&
    weightLoss !== null &&
    tissue !== null &&
    neuro !== null &&
    surgery !== null &&
    medication !== null;
  const calc = useCalculation(
    "waterlow",
    complete
      ? {
          build,
          continence,
          ...skin,
          mobility,
          sex,
          age,
          weight_loss: weightLoss,
          eating_poorly: eatingPoorly,
          acutely_ill: acutelyIll,
          tissue_malnutrition: tissue,
          neurological_deficit: neuro,
          surgery,
          medication,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconBed}
      title="Waterlow score"
      badge="Pressure ulcer risk"
      description="Pressure ulcer risk from the Waterlow card: 10 or more is at risk, 15 or more high risk, 20 or more very high risk (Waterlow 1985, revised 2005). Several categories are additive; the special-risk boxes take the single highest applicable item."
      onReset={() => {
        setBuild(null);
        setContinence(null);
        setSkin(noSkin());
        setMobility(null);
        setSex(null);
        setAge(null);
        setWeightLoss(null);
        setEatingPoorly(false);
        setAcutelyIll(false);
        setTissue(null);
        setNeuro(null);
        setSurgery(null);
        setMedication(null);
      }}
      calc={calc}
      incomplete="Answer every section to calculate."
      form={
        <Stack gap="md">
          <ChoiceField
            label="Build / weight for height"
            value={build}
            onChange={setBuild}
            options={BUILD}
          />
          <Divider />
          <ChoiceField
            label="Continence"
            value={continence}
            onChange={setContinence}
            options={CONTINENCE}
          />
          <Section title="Skin type / visual risk areas">
            <Text size="xs" c="dimmed">
              Tick every descriptor that applies; they add together.
            </Text>
            {SKIN.map((s) => (
              <YesNoField
                key={s.key}
                label={s.label}
                checked={skin[s.key]}
                onChange={(checked) => setSkin((prev) => ({ ...prev, [s.key]: checked }))}
              />
            ))}
          </Section>
          <ChoiceField label="Mobility" value={mobility} onChange={setMobility} options={MOBILITY} />
          <Section title="Sex and age">
            <SimpleGrid cols={2} spacing="md">
              <ChoiceField label="Sex" value={sex} onChange={setSex} options={SEX} />
              <NumberField
                label="Age"
                hint="14-49 scores 1; 50-64 2; 65-74 3; 75-80 4; 81 or over 5."
                unit="years"
                value={age}
                onChange={setAge}
                min={AGE.min}
                max={AGE.max}
                decimals={0}
              />
            </SimpleGrid>
          </Section>
          <Section title="Malnutrition screening">
            <ChoiceField
              label="Recent weight loss"
              hint="The Waterlow card's own nutrition screen, not the MUST tool."
              value={weightLoss}
              onChange={setWeightLoss}
              options={WEIGHT_LOSS}
            />
            <YesNoField
              label="Eating poorly or lack of appetite (1)"
              checked={eatingPoorly}
              onChange={setEatingPoorly}
            />
            <YesNoField
              label="Acutely ill or no nutritional intake for more than 5 days (2)"
              checked={acutelyIll}
              onChange={setAcutelyIll}
            />
          </Section>
          <Section title="Special risks">
            <ChoiceField
              label="Tissue malnutrition"
              hint="Highest single applicable item."
              value={tissue}
              onChange={setTissue}
              options={TISSUE}
            />
            <ChoiceField
              label="Neurological deficit"
              value={neuro}
              onChange={setNeuro}
              options={NEURO}
            />
            <ChoiceField
              label="Major surgery or trauma"
              hint="Highest single applicable item."
              value={surgery}
              onChange={setSurgery}
              options={SURGERY}
            />
            <ChoiceField
              label="Medication"
              value={medication}
              onChange={setMedication}
              options={MEDICATION}
            />
          </Section>
        </Stack>
      }
      result={(r) => {
        const band = asText(r.working.risk_band);
        return (
          <ScoreTile
            value={fmt(r.result)}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={BAND_LABEL[band] ?? band}
          />
        );
      }}
      details={(r) => (
        <Facts
          title="Points"
          items={[
            ["Build", fmt(r.working.build)],
            ["Continence", fmt(r.working.continence)],
            ["Skin", fmt(r.working.skin)],
            ["Mobility", fmt(r.working.mobility)],
            ["Sex", fmt(r.working.sex)],
            ["Age", fmt(r.working.age)],
            ["Nutrition", fmt(r.working.nutrition)],
            ["Tissue malnutrition", fmt(r.working.tissue_malnutrition)],
            ["Neurological deficit", fmt(r.working.neurological_deficit)],
            ["Surgery or trauma", fmt(r.working.surgery_trauma)],
            ["Medication", fmt(r.working.medication)],
          ]}
        />
      )}
      summary={(r) => {
        const band = asText(r.working.risk_band);
        const ticked = SKIN.filter((s) => skin[s.key]).map((s) => s.label);
        return summaryText({
          heading: `Waterlow score ${fmt(r.result)} (${BAND_LABEL[band] ?? band})`,
          interpretation: r.interpretation,
          findingsTitle: "Assessment",
          findings: [
            `Build: ${labelOf(BUILD, build)}`,
            `Continence: ${labelOf(CONTINENCE, continence)}`,
            ticked.length > 0 && `Skin: ${ticked.join("; ")}`,
            `Mobility: ${labelOf(MOBILITY, mobility)}`,
            `Sex: ${labelOf(SEX, sex)}`,
            `Age ${age} years (${fmt(r.working.age)})`,
            `Recent weight loss: ${labelOf(WEIGHT_LOSS, weightLoss)}`,
            eatingPoorly && "Eating poorly or lack of appetite (1)",
            acutelyIll && "Acutely ill or no nutritional intake for more than 5 days (2)",
            `Tissue malnutrition: ${labelOf(TISSUE, tissue)}`,
            `Neurological deficit: ${labelOf(NEURO, neuro)}`,
            `Major surgery or trauma: ${labelOf(SURGERY, surgery)}`,
            `Medication: ${labelOf(MEDICATION, medication)}`,
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "waterlow", Component: WaterlowCalculator };
