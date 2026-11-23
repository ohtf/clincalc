// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconChartLine } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
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

/** ACC/AHA 2013 Pooled Cohort Equations for 10-year ASCVD risk (Goff 2014). */

type Sex = "male" | "female";
type Race = "white" | "black";

const SEX: Choice<Sex>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const RACE: Choice<Race>[] = [
  { value: "white", label: "White" },
  { value: "black", label: "Black" },
];

const CRITERIA = [
  { key: "treated_bp", label: "On treatment for high blood pressure", summary: "On antihypertensive treatment" },
  { key: "current_smoker", label: "Current smoker", summary: "Current smoker" },
  { key: "diabetes", label: "Diabetes", summary: "Diabetes" },
] as const;

type Key = (typeof CRITERIA)[number]["key"];
type Criteria = Record<Key, boolean>;

const AGE = { min: 40, max: 79 };
const TC = { min: 130, max: 320 };
const HDL = { min: 20, max: 100 };
const SBP = { min: 90, max: 200 };

const noneTicked = (): Criteria =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, false])) as Criteria;

const BAND_COLOUR: Record<string, string> = {
  low: "teal",
  borderline: "yellow",
  intermediate: "orange",
  high: "red",
};

function AscvdCalculator() {
  const [age, setAge] = useState<number | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [race, setRace] = useState<Race | null>(null);
  const [tc, setTc] = useState<number | null>(null);
  const [hdl, setHdl] = useState<number | null>(null);
  const [sbp, setSbp] = useState<number | null>(null);
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);

  const complete =
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age) &&
    sex !== null &&
    race !== null &&
    inRange(tc, TC.min, TC.max) &&
    inRange(hdl, HDL.min, HDL.max) &&
    inRange(sbp, SBP.min, SBP.max);
  const calc = useCalculation(
    "ascvd",
    complete
      ? {
          age,
          sex,
          race,
          total_cholesterol_mg_dl: tc,
          hdl_cholesterol_mg_dl: hdl,
          systolic_bp_mm_hg: sbp,
          ...criteria,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconChartLine}
      title="ASCVD risk (Pooled Cohort Equations)"
      badge="Cardiovascular prevention"
      description="ACC/AHA 2013 10-year risk of atherosclerotic cardiovascular disease for US adults aged 40-79 without established ASCVD (Goff 2014). Calibration varies by population; it is not the UK QRISK standard."
      onReset={() => {
        setAge(null);
        setSex(null);
        setRace(null);
        setTc(null);
        setHdl(null);
        setSbp(null);
        setCriteria(noneTicked());
      }}
      calc={calc}
      incomplete="Enter age, sex, coefficient set, cholesterol, and blood pressure to calculate."
      form={
        <>
          <Text fw={600}>Patient</Text>
          <Divider />
          <NumberField
            label="Age"
            hint="The equations are defined for ages 40-79 only."
            unit="years"
            value={age}
            onChange={setAge}
            min={AGE.min}
            max={AGE.max}
            decimals={0}
          />
          <SimpleGrid cols={2} spacing="md">
            <ChoiceField label="Sex" value={sex} onChange={setSex} options={SEX} />
            <ChoiceField
              label="Coefficient set"
              hint="The original equations provide Black and White coefficient sets only."
              value={race}
              onChange={setRace}
              options={RACE}
            />
          </SimpleGrid>
          <Text fw={600} mt="sm">
            Measurements
          </Text>
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Total cholesterol"
              hint="mg/dL, not mmol/L."
              unit="mg/dL"
              value={tc}
              onChange={setTc}
              min={TC.min}
              max={TC.max}
              decimals={0}
            />
            <NumberField
              label="HDL cholesterol"
              hint="mg/dL, not mmol/L."
              unit="mg/dL"
              value={hdl}
              onChange={setHdl}
              min={HDL.min}
              max={HDL.max}
              decimals={0}
            />
            <NumberField
              label="Systolic BP"
              unit="mmHg"
              value={sbp}
              onChange={setSbp}
              min={SBP.min}
              max={SBP.max}
              decimals={0}
            />
          </SimpleGrid>
          <Text fw={600} mt="sm">
            Risk factors
          </Text>
          <Divider />
          {CRITERIA.map((c) => (
            <YesNoField
              key={c.key}
              label={c.label}
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
            unit="%"
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={band && `${band} risk`}
          />
        );
      }}
      summary={(r) =>
        summaryText({
          heading: `10-year ASCVD risk ${fmt(r.result)}% (${asText(r.working.risk_band)}; Pooled Cohort Equations)`,
          interpretation: r.interpretation,
          findingsTitle: "Inputs",
          findings: [
            `Age ${age} years, ${sex}, ${race} coefficient set`,
            `Total cholesterol ${tc} mg/dL`,
            `HDL cholesterol ${hdl} mg/dL`,
            `Systolic BP ${sbp} mmHg`,
            ...CRITERIA.filter((c) => criteria[c.key]).map((c) => c.summary),
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "ascvd", Component: AscvdCalculator };
