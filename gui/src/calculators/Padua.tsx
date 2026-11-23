// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid } from "@mantine/core";
import { IconDroplet } from "@tabler/icons-react";

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

/** Padua Prediction Score for VTE in medical inpatients (Barbar 2010). */

const CRITERIA = [
  {
    key: "active_cancer",
    points: 3,
    label: "Active cancer (3)",
    hint: "Local or distant metastases, and/or chemotherapy or radiotherapy in the previous 6 months. Not cancer in long-term remission with no recent treatment.",
  },
  {
    key: "previous_vte",
    points: 3,
    label: "Previous VTE (3)",
    hint: "Prior DVT or PE. Superficial vein thrombosis does not count.",
  },
  {
    key: "reduced_mobility",
    points: 3,
    label: "Reduced mobility (3)",
    hint: "Anticipated bedrest with bathroom privileges, due to the patient's limitations or on physician order, for at least 3 days.",
  },
  {
    key: "thrombophilia",
    points: 3,
    label: "Known thrombophilic condition (3)",
    hint: "e.g. antithrombin, protein C or protein S deficiency, factor V Leiden, prothrombin G20210A, antiphospholipid syndrome.",
  },
  {
    key: "recent_trauma_or_surgery",
    points: 2,
    label: "Recent trauma and/or surgery (2)",
    hint: "Within the last month.",
  },
  { key: "heart_or_respiratory_failure", points: 1, label: "Heart and/or respiratory failure (1)" },
  {
    key: "acute_mi_or_ischaemic_stroke",
    points: 1,
    label: "Acute myocardial infarction or ischaemic stroke (1)",
  },
  {
    key: "acute_infection_or_rheumatological",
    points: 1,
    label: "Acute infection and/or rheumatological disorder (1)",
  },
  { key: "obesity", points: 1, label: "Obesity (1)", hint: "BMI 30 or over." },
  { key: "ongoing_hormonal_treatment", points: 1, label: "Ongoing hormonal treatment (1)" },
] as const;

type Key = (typeof CRITERIA)[number]["key"];
type Criteria = Record<Key, boolean>;

const AGE = { min: 18, max: 120 };
const noneTicked = (): Criteria =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, false])) as Criteria;

const BAND_COLOUR: Record<string, string> = { low: "teal", high: "red" };

function PaduaCalculator() {
  const [age, setAge] = useState<number | null>(null);
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);

  const complete = inRange(age, AGE.min, AGE.max) && Number.isInteger(age);
  const calc = useCalculation("padua", complete ? { age, ...criteria } : null);

  return (
    <CalculatorPage
      icon={IconDroplet}
      title="Padua Prediction Score"
      badge="Medical inpatient VTE"
      description="Risk of venous thromboembolism in hospitalised medical (non-surgical) patients; 4 or more is high risk (Barbar 2010; NICE NG89)."
      onReset={() => {
        setAge(null);
        setCriteria(noneTicked());
      }}
      calc={calc}
      incomplete="Enter the patient's age to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Age"
              hint="70 or over scores 1."
              unit="years"
              value={age}
              onChange={setAge}
              min={AGE.min}
              max={AGE.max}
              decimals={0}
            />
          </SimpleGrid>
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
            outOf={20}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={band && `${band} risk`}
          />
        );
      }}
      details={(r) => <Facts items={[["Age points", fmt(r.working.age_points)]]} />}
      summary={(r) =>
        summaryText({
          heading: `Padua score ${fmt(r.result)} / 20 (${asText(r.working.risk_band)} risk of VTE)`,
          interpretation: r.interpretation,
          findingsTitle: "Risk factors present",
          findings: [
            `Age ${age} years (${fmt(r.working.age_points)})`,
            ...CRITERIA.filter((c) => criteria[c.key]).map((c) => c.label),
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "padua", Component: PaduaCalculator };
