// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid } from "@mantine/core";
import { IconMicroscope } from "@tabler/icons-react";

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

/** Pitt Bacteraemia Score (Hilf 1989; Henderson 2020). */

type Context =
  | "hospitalised_patient_with_bloodstream_infection_and_index_culture"
  | "hospitalised_patient_with_cre_infection_and_index_culture";
type MentalStatus = "normal" | "disoriented" | "stuporous" | "comatose" | "not_assessable";

const CONTEXT: Choice<Context>[] = [
  {
    value: "hospitalised_patient_with_bloodstream_infection_and_index_culture",
    label: "Hospitalised patient with bloodstream infection",
  },
  {
    value: "hospitalised_patient_with_cre_infection_and_index_culture",
    label: "Hospitalised patient with carbapenem-resistant Enterobacteriaceae (CRE) infection",
  },
];

const MENTAL_STATUS: Choice<MentalStatus>[] = [
  { value: "normal", label: "Normal (0)" },
  { value: "disoriented", label: "Disoriented (1)" },
  { value: "stuporous", label: "Stuporous (2)" },
  { value: "comatose", label: "Comatose (4)" },
  {
    value: "not_assessable",
    label: "Not assessable",
    hint: "e.g. sedation prevents a valid category. The score is not calculated; sedation is never scored as coma.",
  },
];

const CRITERIA = [
  {
    key: "acute_hypotension_on_index_culture_day",
    label: "Acute hypotension (2)",
    hint: "Systolic below 90 mmHg, IV vasopressors required, or an acute fall of more than 30 mmHg systolic and more than 20 mmHg diastolic, on the index-culture day.",
  },
  {
    key: "mechanical_ventilation_on_index_culture_day",
    label: "Invasive mechanical ventilation (2)",
    hint: "On the index-culture day. Not non-invasive ventilation or high-flow oxygen.",
  },
  {
    key: "cardiac_arrest_on_index_day_or_prior_48_hours",
    label: "Cardiac arrest (4)",
    hint: "On the index-culture day or in the 48 hours before culture collection.",
  },
] as const;

type Key = (typeof CRITERIA)[number]["key"];
type Criteria = Record<Key, boolean>;

const TEMP = { min: 20, max: 45 };
const noneTicked = (): Criteria =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, false])) as Criteria;

const oneDecimal = (v: number) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-9;

function PittBacteraemiaCalculator() {
  const [context, setContext] = useState<Context | null>(null);
  const [temp, setTemp] = useState<number | null>(null);
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);
  const [mental, setMental] = useState<MentalStatus | null>(null);

  const notAssessable = mental === "not_assessable";
  const complete =
    context !== null &&
    inRange(temp, TEMP.min, TEMP.max) &&
    oneDecimal(temp) &&
    mental !== null &&
    !notAssessable;
  const calc = useCalculation(
    "pitt_bacteraemia",
    complete
      ? {
          assessment_context: context,
          maximum_temperature_c: temp,
          ...criteria,
          worst_mental_status_on_index_culture_day: mental,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconMicroscope}
      title="Pitt Bacteraemia Score"
      badge="Bloodstream infection"
      description="Acute severity of illness, scored 0-14, around the index blood culture in hospitalised patients with bloodstream or CRE infection; 4 or more is the commonly used higher-risk threshold (Hilf 1989; Henderson 2020). Not a treatment or ICU-admission rule."
      onReset={() => {
        setContext(null);
        setTemp(null);
        setCriteria(noneTicked());
        setMental(null);
      }}
      calc={calc}
      incomplete={
        notAssessable
          ? "Mental status is not assessable, so the Pitt score cannot be calculated. Sedation or another barrier must not be scored as coma."
          : "Choose the context, enter the maximum temperature, and choose the mental status to calculate."
      }
      form={
        <>
          <ChoiceField
            label="Assessment context"
            hint="A defined index culture date is required. Not for colonisation without clinical infection."
            value={context}
            onChange={setContext}
            options={CONTEXT}
          />
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Maximum temperature"
              hint="Highest on the index-culture calendar day, to one decimal place. 35.0 or less, or 40.0 or more, scores 2; 35.1-36.0 or 39.0-39.9 scores 1."
              unit="°C"
              value={temp}
              onChange={setTemp}
              min={TEMP.min}
              max={TEMP.max}
              decimals={1}
            />
          </SimpleGrid>
          {CRITERIA.map((c) => (
            <YesNoField
              key={c.key}
              label={c.label}
              hint={c.hint}
              checked={criteria[c.key]}
              onChange={(checked) => setCriteria((prev) => ({ ...prev, [c.key]: checked }))}
            />
          ))}
          <ChoiceField
            label="Worst mental status"
            hint="Worst clinically assessable category on the index-culture day."
            value={mental}
            onChange={setMental}
            options={MENTAL_STATUS}
          />
        </>
      }
      result={(r) => {
        const high = r.working.score_at_least_four === true;
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={14}
            colour={high ? "red" : "teal"}
            badge={high ? "4 or more" : "below 4"}
          />
        );
      }}
      details={(r) => (
        <Facts
          title="Points"
          items={[
            ["Temperature", fmt(r.working.temperature_points)],
            ["Hypotension", fmt(r.working.hypotension_points)],
            ["Mechanical ventilation", fmt(r.working.mechanical_ventilation_points)],
            ["Cardiac arrest", fmt(r.working.cardiac_arrest_points)],
            ["Mental status", fmt(r.working.mental_status_points)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Pitt Bacteraemia Score ${fmt(r.result)} / 14 (${r.working.score_at_least_four === true ? "meets" : "below"} the 4 or more threshold)`,
          interpretation: r.interpretation,
          findingsTitle: "Index-culture day",
          findings: [
            CONTEXT.find((c) => c.value === context)?.label,
            `Maximum temperature ${temp?.toFixed(1)} °C (${fmt(r.working.temperature_points)})`,
            ...CRITERIA.filter((c) => criteria[c.key]).map((c) => c.label),
            `Worst mental status: ${MENTAL_STATUS.find((m) => m.value === mental)?.label ?? ""}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "pitt_bacteraemia",
  Component: PittBacteraemiaCalculator,
};
