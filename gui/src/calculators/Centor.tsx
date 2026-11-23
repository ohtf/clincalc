// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider } from "@mantine/core";
import { IconThermometer } from "@tabler/icons-react";

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
} from "../kit";

/**
 * Centor criteria with the McIsaac age modifier (Centor 1981; McIsaac 1998).
 * The engine reports both; McIsaac is the headline because it is the one
 * the interpretation and strep probability are based on.
 */

const CRITERIA = [
  {
    key: "tonsillar_exudate",
    label: "Tonsillar exudate or swelling",
    hint: "Visible exudate on, or swelling of, the tonsils.",
  },
  {
    key: "tender_anterior_cervical_nodes",
    label: "Tender anterior cervical lymph nodes",
    hint: "Tender or swollen anterior cervical nodes on palpation.",
  },
  {
    key: "fever",
    label: "Fever",
    hint: "History of fever, or measured temperature above 38 °C.",
  },
  {
    key: "absence_of_cough",
    label: "No cough",
    hint: "Absence of cough scores a point.",
  },
] as const;

type Key = (typeof CRITERIA)[number]["key"];
type Criteria = Record<Key, boolean>;

const AGE = { min: 3, max: 120 };
const noneTicked = (): Criteria =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, false])) as Criteria;

function CentorCalculator() {
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);
  const [age, setAge] = useState<number | null>(null);

  const complete = inRange(age, AGE.min, AGE.max) && Number.isInteger(age);
  const calc = useCalculation("centor", complete ? { ...criteria, age } : null);

  return (
    <CalculatorPage
      icon={IconThermometer}
      title="Centor / McIsaac"
      badge="Acute sore throat"
      description="Likelihood of group A streptococcal pharyngitis from four clinical criteria, with McIsaac's age modifier (Centor 1981; McIsaac 1998). For ages 3 and over."
      onReset={() => {
        setCriteria(noneTicked());
        setAge(null);
      }}
      formTitle="Tick each criterion that applies"
      calc={calc}
      incomplete="Enter the patient's age to calculate."
      form={
        <>
          {CRITERIA.map((c) => (
            <YesNoField
              key={c.key}
              label={c.label}
              hint={c.hint}
              checked={criteria[c.key]}
              onChange={(checked) => setCriteria((prev) => ({ ...prev, [c.key]: checked }))}
            />
          ))}
          <Divider />
          <NumberField
            label="Age"
            hint="McIsaac modifier: +1 if 3-14, 0 if 15-44, -1 if 45 or over."
            unit="years"
            value={age}
            onChange={setAge}
            min={AGE.min}
            max={AGE.max}
            decimals={0}
          />
        </>
      }
      result={(r) => <ScoreTile value={fmt(r.result)} badge="McIsaac" />}
      details={(r) => (
        <Facts
          items={[
            ["Centor", `${fmt(r.working.centor_score)} / 4`],
            ["McIsaac", fmt(r.working.mcisaac_score)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `McIsaac score ${fmt(r.working.mcisaac_score)} (Centor ${fmt(r.working.centor_score)}/4)`,
          interpretation: r.interpretation,
          findingsTitle: "Criteria present",
          findings: [
            ...CRITERIA.filter((c) => criteria[c.key]).map((c) => c.label),
            `Age ${age}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "centor", Component: CentorCalculator };
