// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid } from "@mantine/core";
import { IconLungs } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  YesNoField,
  asText,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** CURB-65 pneumonia severity and 30-day mortality (Lim et al, Thorax 2003; BTS 2009 / NICE NG250). */

const AGE = { min: 18, max: 120 };
const NON_NEGATIVE = { min: 0 };

function bandColour(band: string): string {
  if (band === "high") return "red";
  if (band === "intermediate") return "yellow";
  return "teal";
}

// The engine reports each criterion as 0/1 points.
const scored = (v: unknown) => v === true || v === 1;

export function Curb65Calculator() {
  const [confusion, setConfusion] = useState(false);
  const [urea, setUrea] = useState<number | null>(null);
  const [respiratoryRate, setRespiratoryRate] = useState<number | null>(null);
  const [systolic, setSystolic] = useState<number | null>(null);
  const [diastolic, setDiastolic] = useState<number | null>(null);
  const [age, setAge] = useState<number | null>(null);

  const complete =
    inRange(urea, NON_NEGATIVE.min) &&
    inRange(respiratoryRate, NON_NEGATIVE.min) &&
    inRange(systolic, NON_NEGATIVE.min) &&
    inRange(diastolic, NON_NEGATIVE.min) &&
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age);
  const calc = useCalculation(
    "curb65",
    complete
      ? {
          confusion,
          urea_mmol_l: urea,
          respiratory_rate: respiratoryRate,
          systolic_bp: systolic,
          diastolic_bp: diastolic,
          age,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconLungs}
      title="CURB-65"
      badge="Pneumonia severity"
      description="Severity and 30-day mortality risk in community-acquired pneumonia, guiding place of care (BTS 2009 / NICE NG250)."
      onReset={() => {
        setConfusion(false);
        setUrea(null);
        setRespiratoryRate(null);
        setSystolic(null);
        setDiastolic(null);
        setAge(null);
      }}
      calc={calc}
      incomplete="Enter urea, respiratory rate, blood pressure, and age to calculate."
      form={
        <>
          <YesNoField
            label="New-onset confusion"
            hint="New disorientation in person, place, or time - not chronic baseline impairment."
            checked={confusion}
            onChange={setConfusion}
          />
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Urea"
              hint="Scores a point when > 7"
              unit="mmol/L"
              value={urea}
              onChange={setUrea}
              min={NON_NEGATIVE.min}
              step={0.1}
              decimals={1}
            />
            <NumberField
              label="Respiratory rate"
              hint="Scores when >= 30"
              unit="breaths/min"
              value={respiratoryRate}
              onChange={setRespiratoryRate}
              min={NON_NEGATIVE.min}
            />
            <NumberField
              label="Systolic BP"
              hint="Scores (with diastolic) when < 90"
              unit="mmHg"
              value={systolic}
              onChange={setSystolic}
              min={NON_NEGATIVE.min}
            />
            <NumberField
              label="Diastolic BP"
              hint="Scores (with systolic) when <= 60"
              unit="mmHg"
              value={diastolic}
              onChange={setDiastolic}
              min={NON_NEGATIVE.min}
            />
            <NumberField
              label="Age"
              hint="Scores a point when >= 65"
              unit="years"
              value={age}
              onChange={setAge}
              min={AGE.min}
              max={AGE.max}
              decimals={0}
            />
          </SimpleGrid>
        </>
      }
      result={(r) => {
        const band = asText(r.working.risk_band);
        return (
          <ScoreTile value={asText(r.result)} outOf={5} colour={bandColour(band)} badge={band || "—"} />
        );
      }}
      details={(r) => (
        <Facts
          items={[["30-day mortality", `${asText(r.working.mortality_30_day_percent) || "—"}%`]]}
        />
      )}
      summary={(r) => {
        const w = r.working;
        const mortality = asText(w.mortality_30_day_percent);
        const criteria = [
          scored(w.confusion) && "Confusion",
          scored(w.urea_gt_7_mmol_l) && "Urea > 7 mmol/L",
          scored(w.respiratory_rate_ge_30) && "Respiratory rate >= 30/min",
          scored(w.low_blood_pressure) && "Blood pressure (SBP<90 or DBP<=60)",
          scored(w.age_ge_65) && "Age >= 65",
        ];
        return summaryText({
          heading: `CURB-65 ${asText(r.result)} / 5`,
          interpretation: r.interpretation,
          findingsTitle: "Positive criteria",
          findings: criteria,
          extra: [
            !criteria.some(Boolean) && "No criteria met.\n",
            `Risk band: ${asText(w.risk_band) || "—"}`,
            mortality && `30-day mortality (Lim 2003 cohort): ${mortality}%`,
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "curb65", Component: Curb65Calculator };
