// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider } from "@mantine/core";
import { IconActivity } from "@tabler/icons-react";

import {
  CalculatorPage,
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
} from "../kit";

/** TIMI risk score for unstable angina / NSTEMI (Antman 2000). */

const CRITERIA = [
  {
    key: "three_or_more_cad_risk_factors",
    label: "Three or more CAD risk factors (+1)",
    summary: "Three or more CAD risk factors",
    hint: "At least three of: hypertension, hypercholesterolaemia, diabetes, family history of premature CAD, current smoking. One or two does not score.",
  },
  {
    key: "known_cad",
    label: "Known coronary artery disease (+1)",
    summary: "Known CAD (documented stenosis of 50% or more)",
    hint: "Documented coronary stenosis of 50% or more on angiography or equivalent imaging - not symptoms or risk factors alone.",
  },
  {
    key: "aspirin_use_past_7_days",
    label: "Aspirin use in the past 7 days (+1)",
    summary: "Aspirin use in the past 7 days",
  },
  {
    key: "severe_angina",
    label: "Severe angina (+1)",
    summary: "Severe angina (2 or more episodes in 24 hours)",
    hint: "Two or more anginal episodes in the past 24 hours.",
  },
  {
    key: "st_deviation",
    label: "ST deviation of 0.5 mm or more (+1)",
    summary: "ST deviation of 0.5 mm or more on admission ECG",
    hint: "On the admission ECG.",
  },
  {
    key: "positive_biomarker",
    label: "Positive cardiac biomarker (+1)",
    summary: "Positive cardiac biomarker",
    hint: "e.g. troponin or CK-MB.",
  },
] as const;

type Key = (typeof CRITERIA)[number]["key"];
type Criteria = Record<Key, boolean>;

const AGE = { min: 18, max: 120 };
const noneTicked = (): Criteria =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, false])) as Criteria;

const BAND_COLOUR: Record<string, string> = { low: "teal", intermediate: "yellow", high: "red" };

function TimiCalculator() {
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);
  const [age, setAge] = useState<number | null>(null);

  const complete = inRange(age, AGE.min, AGE.max) && Number.isInteger(age);
  const calc = useCalculation("timi", complete ? { age, ...criteria } : null);

  return (
    <CalculatorPage
      icon={IconActivity}
      title="TIMI score (UA/NSTEMI)"
      badge="Acute coronary syndrome"
      description="14-day risk of death, new or recurrent MI, or severe recurrent ischaemia requiring urgent revascularisation in unstable angina or NSTEMI (Antman 2000). This is not the TIMI score for STEMI."
      onReset={() => {
        setCriteria(noneTicked());
        setAge(null);
      }}
      formTitle="Tick each criterion that applies"
      calc={calc}
      incomplete="Enter the patient's age to calculate."
      form={
        <>
          <NumberField
            label="Age"
            hint="65 or over scores 1."
            unit="years"
            value={age}
            onChange={setAge}
            min={AGE.min}
            max={AGE.max}
            decimals={0}
          />
          <Divider />
          {CRITERIA.map((c) => (
            <YesNoField
              key={c.key}
              label={c.label}
              hint={"hint" in c ? c.hint : undefined}
              checked={criteria[c.key]}
              onChange={(checked) => setCriteria((prev) => ({ ...prev, [c.key]: checked }))}
            />
          ))}
        </>
      }
      result={(r) => {
        const band = asText(r.working.risk_band);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={7}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={band && `${band} risk`}
          />
        );
      }}
      details={(r) => (
        <Facts
          items={[
            ["Age point", fmt(r.working.age_point)],
            ["14-day event rate", `about ${fmt(r.working.approximate_event_rate_percent)}%`],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `TIMI score ${fmt(r.result)} / 7 (${asText(r.working.risk_band)} risk)`,
          interpretation: r.interpretation,
          findingsTitle: "Findings",
          findings: [
            `Age ${age} years`,
            ...CRITERIA.filter((c) => criteria[c.key]).map((c) => c.summary),
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "timi", Component: TimiCalculator };
