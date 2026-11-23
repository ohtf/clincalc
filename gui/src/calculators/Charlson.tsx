// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Fragment, useState } from "react";
import { Divider, Text } from "@mantine/core";
import { IconClipboardList } from "@tabler/icons-react";

import {
  CalculatorPage,
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
  ChoiceField,
} from "../kit";

/** Charlson Comorbidity Index (Charlson 1987), with the optional age adjustment. */

/** Two or three short options side by side; starts unselected like ChoiceField. */

const GROUPS = [
  {
    title: "1 point each",
    items: [
      { key: "myocardial_infarction", label: "Myocardial infarction (history)" },
      { key: "congestive_heart_failure", label: "Congestive heart failure" },
      { key: "peripheral_vascular_disease", label: "Peripheral vascular disease or claudication" },
      { key: "cerebrovascular_disease", label: "Cerebrovascular disease: stroke or TIA" },
      { key: "dementia", label: "Dementia" },
      { key: "copd", label: "COPD" },
      { key: "connective_tissue_disease", label: "Connective tissue or rheumatological disease" },
      { key: "peptic_ulcer_disease", label: "Peptic ulcer disease" },
      {
        key: "mild_liver_disease",
        label: "Mild liver disease",
        hint: "Chronic hepatitis, or cirrhosis without portal hypertension. Not counted if moderate or severe liver disease is ticked.",
      },
      {
        key: "diabetes_uncomplicated",
        label: "Diabetes without end-organ damage",
        hint: "Not counted if diabetes with end-organ damage is ticked.",
      },
    ],
  },
  {
    title: "2 points each",
    items: [
      {
        key: "diabetes_complicated",
        label: "Diabetes with end-organ damage",
        hint: "Retinopathy, neuropathy, or nephropathy.",
      },
      { key: "hemiplegia_paraplegia", label: "Hemiplegia or paraplegia" },
      {
        key: "renal_disease_moderate_severe",
        label: "Moderate or severe renal disease",
        hint: "Moderate or severe CKD, dialysis, or transplant.",
      },
      {
        key: "solid_tumour_non_metastatic",
        label: "Solid tumour, non-metastatic",
        hint: "Treated within 5 years. Not counted if metastatic solid tumour is ticked.",
      },
      { key: "leukaemia", label: "Leukaemia" },
      { key: "lymphoma", label: "Lymphoma" },
    ],
  },
  {
    title: "3 points",
    items: [
      {
        key: "liver_disease_moderate_severe",
        label: "Moderate or severe liver disease",
        hint: "Portal hypertension, varices, or encephalopathy.",
      },
    ],
  },
  {
    title: "6 points each",
    items: [
      { key: "metastatic_solid_tumour", label: "Metastatic solid tumour" },
      { key: "aids", label: "AIDS", hint: "Not HIV-positive status alone." },
    ],
  },
] as const satisfies ReadonlyArray<{
  title: string;
  items: ReadonlyArray<{ key: string; label: string; hint?: string }>;
}>;

const ITEMS = GROUPS.flatMap((g) => g.items as ReadonlyArray<{ key: string; label: string; hint?: string }>);
type Key = (typeof GROUPS)[number]["items"][number]["key"];
type Conditions = Record<Key, boolean>;

type YesNo = "yes" | "no";
const YES_NO: Choice<YesNo>[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const AGE = { min: 18, max: 120 };

const noneTicked = (): Conditions =>
  Object.fromEntries(ITEMS.map((c) => [c.key, false])) as Conditions;

function CharlsonCalculator() {
  const [conditions, setConditions] = useState<Conditions>(noneTicked);
  const [age, setAge] = useState<number | null>(null);
  const [adjust, setAdjust] = useState<YesNo | null>(null);

  const complete = inRange(age, AGE.min, AGE.max) && Number.isInteger(age) && adjust !== null;
  const calc = useCalculation(
    "charlson",
    complete ? { age, include_age_adjustment: adjust === "yes", ...conditions } : null,
  );

  return (
    <CalculatorPage
      icon={IconClipboardList}
      title="Charlson Comorbidity Index"
      badge="Comorbidity burden"
      description="Nineteen weighted comorbidities predicting 10-year mortality (Charlson 1987), with an optional age adjustment of +1 per decade over 50 (Charlson 1994 update). Survival estimates come from the original cohort."
      onReset={() => {
        setConditions(noneTicked());
        setAge(null);
        setAdjust(null);
      }}
      calc={calc}
      incomplete="Enter age and choose whether to apply the age adjustment to calculate."
      form={
        <>
          <NumberField
            label="Age"
            unit="years"
            value={age}
            onChange={setAge}
            min={AGE.min}
            max={AGE.max}
            decimals={0}
          />
          <ChoiceField layout="inline"
            label="Include the age adjustment"
            hint="Adds 1 point per decade over age 50."
            value={adjust}
            onChange={setAdjust}
            options={YES_NO}
          />
          {GROUPS.map((g) => (
            <Fragment key={g.title}>
              <Divider />
              <Text fw={600} size="sm">
                {g.title}
              </Text>
              {(g.items as ReadonlyArray<{ key: Key; label: string; hint?: string }>).map((c) => (
                <YesNoField
                  key={c.key}
                  label={c.label}
                  hint={c.hint}
                  checked={conditions[c.key]}
                  onChange={(checked) => setConditions((prev) => ({ ...prev, [c.key]: checked }))}
                />
              ))}
            </Fragment>
          ))}
        </>
      }
      result={(r) => <ScoreTile value={fmt(r.result)} badge={adjust === "yes" ? "age-adjusted" : "unadjusted"} />}
      details={(r) => (
        <Facts
          items={[
            ["Comorbidity score", fmt(r.working.comorbidity_score)],
            ["Age adjustment", `+${fmt(r.working.age_adjustment)}`],
            ["Total", fmt(r.working.cci_total)],
          ]}
        />
      )}
      summary={(r) => {
        const present = ITEMS.filter((c) => conditions[c.key as Key]);
        return summaryText({
          heading: `Charlson Comorbidity Index ${fmt(r.result)} (${
            adjust === "yes" ? "age-adjusted" : "without age adjustment"
          })`,
          interpretation: r.interpretation,
          findingsTitle: "Comorbidities present",
          findings: present.map((c) => c.label),
          extra: [
            present.length === 0 && "No listed comorbidities.",
            `Age ${age} years${adjust === "yes" ? ` (age adjustment +${fmt(r.working.age_adjustment)})` : ""}`,
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "charlson", Component: CharlsonCalculator };
