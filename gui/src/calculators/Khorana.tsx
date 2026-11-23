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

/** Khorana score for chemotherapy-associated VTE risk (Khorana 2008; ASCO 2019, ITAC 2022 context). */

type Context = "yes" | "no";
type Site =
  | "stomach"
  | "pancreas"
  | "lung"
  | "lymphoma"
  | "gynaecological"
  | "bladder"
  | "testicular"
  | "other";

const CONTEXT: Choice<Context>[] = [
  {
    value: "yes",
    label: "Yes - adult ambulatory patient before a new chemotherapy regimen",
  },
  {
    value: "no",
    label: "No, or not applicable",
    hint: "Paediatric use, hospital inpatients, values after the regimen began, suspected VTE, or treatment of established VTE.",
  },
];

const SITES: Choice<Site>[] = [
  { value: "stomach", label: "Stomach (2)" },
  { value: "pancreas", label: "Pancreas (2)" },
  { value: "lung", label: "Lung (1)" },
  { value: "lymphoma", label: "Lymphoma (1)" },
  { value: "gynaecological", label: "Gynaecological (1)" },
  { value: "bladder", label: "Bladder (1)" },
  { value: "testicular", label: "Testicular (1)" },
  {
    value: "other",
    label: "Other (0)",
    hint: "Every site not listed, including renal, brain, prostate, breast, colorectal, head and neck, myeloma, and other genitourinary sites.",
  },
];

const BAND_COLOUR: Record<string, string> = { low: "teal", intermediate: "yellow", high: "red" };

const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

const positive = (v: number | null): v is number => inRange(v, 0) && v > 0;

function KhoranaCalculator() {
  const [context, setContext] = useState<Context | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [platelets, setPlatelets] = useState<number | null>(null);
  const [hb, setHb] = useState<number | null>(null);
  const [esa, setEsa] = useState(false);
  const [wbc, setWbc] = useState<number | null>(null);
  const [bmi, setBmi] = useState<number | null>(null);

  const complete =
    context === "yes" &&
    site !== null &&
    inRange(platelets, 0) &&
    positive(hb) &&
    inRange(wbc, 0) &&
    positive(bmi);
  const calc = useCalculation(
    "khorana",
    complete
      ? {
          assessment_context: "adult_ambulatory_before_new_chemotherapy_regimen",
          cancer_site: site,
          platelet_count_10_9_l: platelets,
          haemoglobin_g_dl: hb,
          uses_erythropoiesis_stimulating_agent: esa,
          leukocyte_count_10_9_l: wbc,
          bmi_kg_m2: bmi,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconDroplet}
      title="Khorana score"
      badge="Chemotherapy-associated VTE"
      description="Short-term symptomatic VTE risk for an adult ambulatory patient before a new chemotherapy regimen (Khorana 2008), with the ASCO 2019 / ITAC 2022 score of 2 or more threshold for individualised thromboprophylaxis consideration. It does not diagnose or exclude VTE."
      onReset={() => {
        setContext(null);
        setSite(null);
        setPlatelets(null);
        setHb(null);
        setEsa(false);
        setWbc(null);
        setBmi(null);
      }}
      calc={calc}
      incomplete={
        context === "no"
          ? "The Khorana score applies only to adult ambulatory patients before a new chemotherapy regimen."
          : "Confirm the assessment context, choose the cancer site, and enter the blood count and BMI to calculate."
      }
      form={
        <>
          <ChoiceField
            label="Assessment context"
            hint="The score was derived in cancer outpatients starting chemotherapy. Do not use it in place of diagnostic assessment when VTE is suspected."
            value={context}
            onChange={setContext}
            options={CONTEXT}
          />
          <ChoiceField
            label="Primary cancer site"
            hint="Choose the single site category from the original Table 3."
            value={site}
            onChange={setSite}
            options={SITES}
          />
          <Text fw={600} size="sm" mt="xs">
            Pretreatment values
          </Text>
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Platelet count"
              hint="350 or more scores 1."
              unit="x10^9/L"
              value={platelets}
              onChange={setPlatelets}
              min={0}
              decimals={0}
            />
            <NumberField
              label="Leukocyte count"
              hint="Above 11 scores 1; exactly 11 scores 0."
              unit="x10^9/L"
              value={wbc}
              onChange={setWbc}
              min={0}
              decimals={1}
            />
            <NumberField
              label="Haemoglobin"
              hint="Below 10 g/dL scores 1 (combined with ESA use). Divide g/L by 10."
              unit="g/dL"
              value={hb}
              onChange={setHb}
              min={0}
              decimals={1}
            />
            <NumberField
              label="BMI"
              hint="35 or more scores 1."
              unit="kg/m²"
              value={bmi}
              onChange={setBmi}
              min={0}
              decimals={1}
            />
          </SimpleGrid>
          {(hb === 0 || bmi === 0) && (
            <Text size="xs" c="red">
              Haemoglobin and BMI must be greater than 0.
            </Text>
          )}
          <YesNoField
            label="Erythropoiesis-stimulating agent used with this chemotherapy course"
            hint="Haemoglobin below 10 g/dL or ESA use scores 1 point in total, never 2. Excludes myeloid growth factors and remote ESA use."
            checked={esa}
            onChange={setEsa}
          />
        </>
      }
      result={(r) => {
        const band = asText(r.working.original_risk_band);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={6}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={band && `original ${band} risk band`}
          />
        );
      }}
      details={(r) => (
        <>
          <Facts
            title="Points"
            items={[
              ["Cancer site", fmt(r.working.cancer_site_points)],
              ["Platelets", fmt(r.working.platelet_count_points)],
              ["Haemoglobin or ESA", fmt(r.working.haemoglobin_or_esa_points)],
              ["Leukocytes", fmt(r.working.leukocyte_count_points)],
              ["BMI", fmt(r.working.bmi_points)],
            ]}
          />
          <Facts
            title="Guideline threshold"
            items={[
              [
                "Score of 2 or more (ASCO 2019, ITAC 2022)",
                r.working.meets_guideline_consideration_threshold === true ? "met" : "not met",
              ],
            ]}
          />
        </>
      )}
      summary={(r) =>
        summaryText({
          heading: `Khorana score ${fmt(r.result)} / 6 (original ${asText(r.working.original_risk_band)} risk band; guideline score of 2 or more threshold ${r.working.meets_guideline_consideration_threshold === true ? "met" : "not met"})`,
          interpretation: r.interpretation,
          findingsTitle: "Pretreatment findings",
          findings: [
            "Adult ambulatory patient before a new chemotherapy regimen",
            `Primary cancer site: ${labelOf(SITES, site).replace(/ \(\d\)$/, "")}`,
            `Platelet count ${platelets} x10^9/L`,
            `Leukocyte count ${wbc} x10^9/L`,
            `Haemoglobin ${hb} g/dL`,
            `BMI ${bmi} kg/m²`,
            esa && "Erythropoiesis-stimulating agent used with this chemotherapy course",
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "khorana", Component: KhoranaCalculator };
