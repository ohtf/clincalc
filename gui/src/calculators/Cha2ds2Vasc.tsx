// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Badge, Divider, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconBrain } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  YesNoField,
  asNumber,
  asText,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** CHA2DS2-VASc stroke risk in non-valvular AF (Lip et al, Chest 2010), thresholds per NICE NG196. */

type Sex = "male" | "female";

const SEX: Choice<Sex>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const CRITERIA = [
  {
    key: "congestive_heart_failure",
    label: "Congestive heart failure / LV dysfunction",
    hint: "Signs/symptoms of heart failure, or moderate-to-severe LV systolic dysfunction.",
    points: "+1",
  },
  {
    key: "hypertension",
    label: "Hypertension",
    hint: "History of hypertension, treated or untreated.",
    points: "+1",
  },
  {
    key: "diabetes",
    label: "Diabetes mellitus",
    hint: "Type 1 or type 2 diabetes.",
    points: "+1",
  },
  {
    key: "stroke_tia_thromboembolism",
    label: "Prior stroke, TIA, or systemic arterial embolism",
    hint: "Two points. Do not use this for venous thromboembolism.",
    points: "+2",
  },
  {
    key: "vascular_disease",
    label: "Vascular disease",
    hint: "Prior MI, peripheral arterial disease, or aortic plaque. Excludes VTE.",
    points: "+1",
  },
] as const;

type Key = (typeof CRITERIA)[number]["key"];
type Criteria = Record<Key, boolean>;

const AGE = { min: 18, max: 120 };

const noneTicked = (): Criteria =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, false])) as Criteria;

const RECOMMENDATION_COLOUR: Record<string, string> = { offer: "red", consider: "yellow" };

const points = (n: string) => `${n || "0"} point${n === "1" ? "" : "s"}`;

export function Cha2ds2VascCalculator() {
  const [age, setAge] = useState<number | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);

  const complete = inRange(age, AGE.min, AGE.max) && Number.isInteger(age) && sex !== null;
  const calc = useCalculation("cha2ds2vasc", complete ? { age, sex, ...criteria } : null);

  return (
    <CalculatorPage
      icon={IconBrain}
      title="CHA2DS2-VASc"
      badge="Atrial fibrillation"
      description="Stroke risk in non-valvular atrial fibrillation, guiding anticoagulation decisions. Female sex alone is treated as low risk in line with NICE NG196."
      onReset={() => {
        setAge(null);
        setSex(null);
        setCriteria(noneTicked());
      }}
      calc={calc}
      incomplete="Enter age and sex to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Age"
              hint="65-74 scores 1; 75+ scores 2"
              unit="years"
              value={age}
              onChange={setAge}
              min={AGE.min}
              max={AGE.max}
              decimals={0}
            />
            <ChoiceField label="Sex" value={sex} onChange={setSex} options={SEX} layout="segmented" />
          </SimpleGrid>
          <Divider />
          <Stack gap="sm">
            <Text fw={600}>Clinical criteria</Text>
            {CRITERIA.map((c) => (
              <YesNoField
                key={c.key}
                label={
                  <Group gap="xs">
                    <Text>{c.label}</Text>
                    <Badge size="xs" variant="light" color="gray">
                      {c.points}
                    </Badge>
                  </Group>
                }
                hint={c.hint}
                checked={criteria[c.key]}
                onChange={(checked) => setCriteria((prev) => ({ ...prev, [c.key]: checked }))}
              />
            ))}
          </Stack>
        </>
      }
      result={(r) => {
        const recommendation = asText(r.working.recommendation);
        return (
          <ScoreTile
            value={asText(r.result)}
            outOf={9}
            colour={RECOMMENDATION_COLOUR[recommendation] ?? "teal"}
            badge={recommendation || "—"}
          />
        );
      }}
      details={(r) => (
        <Facts
          items={[
            ["Age", asText(r.working.age_points) || "0"],
            ["Sex", asText(r.working.sex_point) || "0"],
            [
              "Non-sex score",
              Math.max(0, (asNumber(r.result) ?? 0) - (asNumber(r.working.sex_point) ?? 0)),
            ],
          ]}
        />
      )}
      summary={(r) => {
        const ticked = CRITERIA.filter((c) => criteria[c.key]);
        const sexPoint = asText(r.working.sex_point);
        return summaryText({
          heading: `CHA2DS2-VASc ${asText(r.result)}`,
          interpretation: r.interpretation,
          findingsTitle: "Risk factors",
          findings: [
            `Age: ${age} years (${points(asText(r.working.age_points))})`,
            `Sex: ${sex}${sexPoint ? ` (${points(sexPoint)})` : ""}`,
            ...ticked.map((c) => `${c.label} (${c.points})`),
          ],
          extra: [
            ticked.length === 0 && "No non-age/sex criteria selected.\n",
            `Recommendation band: ${asText(r.working.recommendation) || "not stated"}`,
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "cha2ds2vasc", Component: Cha2ds2VascCalculator };
