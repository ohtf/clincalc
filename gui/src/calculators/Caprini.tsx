// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconDroplet } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  ScoreTile,
  YesNoField,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Caprini VTE risk assessment model (Caprini 2005; Bahl 2010). */

type AgeBand = "under_41" | "41_60" | "61_74" | "75_plus";

const AGE: Choice<AgeBand>[] = [
  { value: "under_41", label: "40 or under (0)" },
  { value: "41_60", label: "41-60 (1)" },
  { value: "61_74", label: "61-74 (2)" },
  { value: "75_plus", label: "75 or over (3)" },
];

const SECTIONS = [
  {
    title: "1 point each",
    points: 1,
    items: [
      { key: "minor_surgery", label: "Minor surgery planned" },
      { key: "bmi_over_25", label: "BMI over 25 kg/m²" },
      { key: "swollen_legs", label: "Swollen legs (current)" },
      { key: "varicose_veins", label: "Varicose veins" },
      { key: "pregnancy_or_postpartum", label: "Pregnancy or postpartum within 1 month" },
      {
        key: "history_of_miscarriage",
        label: "History of unexplained or recurrent spontaneous abortion",
      },
      { key: "oral_contraceptives_or_hrt", label: "Oral contraceptives or HRT" },
      { key: "sepsis_within_1_month", label: "Sepsis within 1 month" },
      {
        key: "serious_lung_disease",
        label: "Serious lung disease (including pneumonia) within 1 month",
      },
      { key: "abnormal_pulmonary_function", label: "Abnormal pulmonary function / COPD" },
      { key: "acute_mi", label: "Acute myocardial infarction" },
      { key: "congestive_heart_failure", label: "Congestive heart failure within 1 month" },
      { key: "inflammatory_bowel_disease", label: "History of inflammatory bowel disease" },
      { key: "medical_patient_at_bed_rest", label: "Medical patient currently at bed rest" },
    ],
  },
  {
    title: "2 points each",
    points: 2,
    items: [
      { key: "arthroscopic_surgery", label: "Arthroscopic surgery" },
      { key: "malignancy", label: "Malignancy (present or previous)" },
      { key: "major_surgery_over_45_min", label: "Major open surgery over 45 minutes" },
      { key: "laparoscopic_surgery_over_45_min", label: "Laparoscopic surgery over 45 minutes" },
      { key: "confined_to_bed_over_72h", label: "Confined to bed over 72 hours" },
      { key: "immobilising_cast", label: "Immobilising plaster cast" },
      { key: "central_venous_access", label: "Central venous access" },
    ],
  },
  {
    title: "3 points each",
    points: 3,
    items: [
      { key: "history_dvt_pe", label: "Personal history of DVT or PE" },
      { key: "family_history_vte", label: "Family history of VTE" },
      { key: "factor_v_leiden", label: "Factor V Leiden mutation" },
      { key: "prothrombin_20210a", label: "Prothrombin 20210A mutation" },
      { key: "lupus_anticoagulant", label: "Lupus anticoagulant" },
      { key: "anticardiolipin_antibodies", label: "Elevated anticardiolipin antibodies" },
      { key: "elevated_homocysteine", label: "Elevated serum homocysteine" },
      { key: "heparin_induced_thrombocytopenia", label: "Heparin-induced thrombocytopenia (HIT)" },
      { key: "other_thrombophilia", label: "Other congenital or acquired thrombophilia" },
    ],
  },
  {
    title: "5 points each",
    points: 5,
    items: [
      { key: "stroke_within_1_month", label: "Stroke within 1 month" },
      { key: "elective_arthroplasty", label: "Elective major lower extremity arthroplasty" },
      { key: "hip_pelvis_leg_fracture", label: "Hip, pelvis, or leg fracture within 1 month" },
      {
        key: "acute_spinal_cord_injury",
        label: "Acute spinal cord injury / paralysis within 1 month",
      },
    ],
  },
] as const;

type Key = (typeof SECTIONS)[number]["items"][number]["key"];
type Criteria = Record<Key, boolean>;

const ALL_ITEMS = SECTIONS.flatMap((s) => s.items as readonly { key: Key; label: string }[]);
const noneTicked = (): Criteria =>
  Object.fromEntries(ALL_ITEMS.map((c) => [c.key, false])) as Criteria;

const BAND_COLOUR: Record<string, string> = {
  "Very low": "teal",
  Low: "lime",
  Moderate: "yellow",
  High: "red",
};

function CapriniCalculator() {
  const [age, setAge] = useState<AgeBand | null>(null);
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);

  const calc = useCalculation(
    "caprini",
    age !== null
      ? {
          ...criteria,
          age_41_60: age === "41_60",
          age_61_74: age === "61_74",
          age_75_plus: age === "75_plus",
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconDroplet}
      title="Caprini VTE risk"
      badge="Peri-operative VTE"
      description="Weighted risk factors for peri-operative venous thromboembolism, from very low (0) to high (5 or more) risk (Caprini 2005; validated by Bahl 2010)."
      onReset={() => {
        setAge(null);
        setCriteria(noneTicked());
      }}
      calc={calc}
      incomplete="Choose the age band to calculate."
      form={
        <>
          <ChoiceField label="Age" value={age} onChange={setAge} options={AGE} />
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <Text fw={600} size="sm" mt="xs">
                {section.title}
              </Text>
              <Divider mb="sm" mt={4} />
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm" verticalSpacing="sm">
                {section.items.map((c) => (
                  <YesNoField
                    key={c.key}
                    label={c.label}
                    checked={criteria[c.key]}
                    onChange={(checked) => setCriteria((prev) => ({ ...prev, [c.key]: checked }))}
                  />
                ))}
              </SimpleGrid>
            </div>
          ))}
        </>
      }
      result={(r) => {
        const band = asText(r.working.risk_level);
        return (
          <ScoreTile
            value={fmt(r.result)}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={band && `${band} risk`}
          />
        );
      }}
      summary={(r) =>
        summaryText({
          heading: `Caprini VTE score ${fmt(r.result)} (${asText(r.working.risk_level)} risk)`,
          interpretation: r.interpretation,
          findingsTitle: "Risk factors present",
          findings: [
            `Age ${AGE.find((a) => a.value === age)?.label ?? ""}`,
            ...SECTIONS.flatMap((s) =>
              s.items
                .filter((c) => criteria[c.key])
                .map((c) => `${c.label} (${s.points})`),
            ),
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "caprini", Component: CapriniCalculator };
