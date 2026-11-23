// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, Group, Radio, SimpleGrid, Text } from "@mantine/core";
import { IconWheelchair } from "@tabler/icons-react";

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
} from "../kit";

/** Nottingham Hip Fracture Score (Maxwell, Moran & Moppett 2008). */

type Sex = "female" | "male";
const SEX: Choice<Sex>[] = [
  { value: "female", label: "Female (0)" },
  { value: "male", label: "Male (1)" },
];

const CRITERIA = [
  {
    key: "institutionalised",
    label: "Living in an institution before admission (1)",
    hint: "Residential care home, nursing home, or long-stay care. Not own home with a care package, or independent sheltered housing.",
  },
  {
    key: "comorbidities_two_or_more",
    label: "Two or more comorbidities (1)",
  },
  {
    key: "malignancy",
    label: "Malignancy in the last 20 years (1)",
    hint: "Active malignant disease within the last 20 years.",
  },
] as const;

type Key = (typeof CRITERIA)[number]["key"];
type Criteria = Record<Key, boolean>;

const AGE = { min: 0, max: 120 };
const HB = { min: 0, max: 30 };
const AMTS = { min: 0, max: 10 };

const noneTicked = (): Criteria =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, false])) as Criteria;

function NhfsCalculator() {
  const [age, setAge] = useState<number | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [hb, setHb] = useState<number | null>(null);
  const [amts, setAmts] = useState<number | null>(null);
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);

  const complete =
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age) &&
    sex !== null &&
    inRange(hb, HB.min, HB.max) &&
    inRange(amts, AMTS.min, AMTS.max) &&
    Number.isInteger(amts);
  const calc = useCalculation(
    "nhfs",
    complete ? { age, male: sex === "male", haemoglobin: hb, amts, ...criteria } : null,
  );

  return (
    <CalculatorPage
      icon={IconWheelchair}
      title="Nottingham Hip Fracture Score"
      badge="Hip fracture surgery"
      description="Preoperative score (0-10) estimating 30-day mortality after hip fracture surgery (Maxwell 2008). A population-level estimate to inform shared decision-making and planning, not an individual prognosis."
      onReset={() => {
        setAge(null);
        setSex(null);
        setHb(null);
        setAmts(null);
        setCriteria(noneTicked());
      }}
      calc={calc}
      incomplete="Enter age, sex, admission haemoglobin, and AMTS to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Age"
              hint="65 or under scores 0, 66-85 scores 3, 86 or over scores 4."
              unit="years"
              value={age}
              onChange={setAge}
              min={AGE.min}
              max={AGE.max}
              decimals={0}
            />
            <NumberField
              label="Abbreviated Mental Test Score"
              hint="6 or below scores 1."
              unit="/ 10"
              value={amts}
              onChange={setAmts}
              min={AMTS.min}
              max={AMTS.max}
              decimals={0}
            />
          </SimpleGrid>
          <NumberField
            label="Admission haemoglobin"
            hint="In g/dL, not g/L. UK laboratories usually report g/L: divide by 10 (100 g/L = 10 g/dL). 10 g/dL or below scores 1."
            unit="g/dL"
            value={hb}
            onChange={setHb}
            min={HB.min}
            max={HB.max}
            decimals={1}
          />
          <Radio.Group label="Sex" value={sex} onChange={(v) => setSex(v as Sex)}>
            <Group gap="lg" mt={8}>
              {SEX.map((o) => (
                <Radio key={o.value} value={o.value} label={o.label} />
              ))}
            </Group>
          </Radio.Group>
          <Text fw={600} mt="xs">
            Tick each that applies
          </Text>
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
      result={(r) => (
        <ScoreTile
          value={fmt(r.result)}
          outOf={10}
          badge={`${fmt(r.working.predicted_30day_mortality_pct)}% 30-day mortality`}
        />
      )}
      details={(r) => (
        <Facts
          title="Points"
          items={[
            ["Age", fmt(r.working.age_points)],
            ["Male sex", fmt(r.working.male)],
            ["Haemoglobin", fmt(r.working.haemoglobin_low)],
            ["AMTS", fmt(r.working.amts_impaired)],
            ["Institution", fmt(r.working.institutionalised)],
            ["Comorbidities", fmt(r.working.comorbidities_two_or_more)],
            ["Malignancy", fmt(r.working.malignancy)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `NHFS ${fmt(r.result)}/10 (approximate predicted 30-day mortality ${fmt(r.working.predicted_30day_mortality_pct)}%)`,
          interpretation: r.interpretation,
          findingsTitle: "Findings",
          findings: [
            `Age ${age} years`,
            `Sex ${sex}`,
            `Admission haemoglobin ${hb} g/dL`,
            `AMTS ${amts}/10`,
            ...CRITERIA.filter((c) => criteria[c.key]).map((c) => c.label.replace(/ \(1\)$/, "")),
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "nhfs", Component: NhfsCalculator };
