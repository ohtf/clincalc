// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconHeartRateMonitor } from "@tabler/icons-react";

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

/** GRACE 1.0 point score for in-hospital mortality in acute coronary syndrome (Granger 2003). */

type Killip = "1" | "2" | "3" | "4";
type CreatinineUnit = "umol/L" | "mg/dL";

const KILLIP: Choice<Killip>[] = [
  { value: "1", label: "Class I - No signs of heart failure (0)" },
  {
    value: "2",
    label: "Class II - Crackles, S3 gallop, or raised JVP (20)",
  },
  { value: "3", label: "Class III - Frank acute pulmonary oedema (39)" },
  {
    value: "4",
    label: "Class IV - Cardiogenic shock (59)",
    hint: "Or hypotension (systolic BP below 90 mmHg) with peripheral vasoconstriction.",
  },
];

const UNITS: Choice<CreatinineUnit>[] = [
  { value: "umol/L", label: "µmol/L" },
  { value: "mg/dL", label: "mg/dL" },
];

const CRITERIA = [
  { key: "cardiac_arrest_at_admission", label: "Cardiac arrest at admission (+39)", summary: "Cardiac arrest at admission" },
  {
    key: "st_segment_deviation",
    label: "ST-segment deviation (+28)",
    summary: "ST-segment deviation on admission ECG",
    hint: "On the admission ECG.",
  },
  {
    key: "elevated_cardiac_enzymes",
    label: "Elevated cardiac enzymes (+14)",
    summary: "Elevated cardiac enzymes or biomarkers",
    hint: "e.g. troponin.",
  },
] as const;

type Key = (typeof CRITERIA)[number]["key"];
type Criteria = Record<Key, boolean>;

const AGE = { min: 0, max: 130 };
const HR = { min: 0, max: 350 };
const SBP = { min: 0, max: 320 };
const CREATININE_MIN = 0;

const noneTicked = (): Criteria =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, false])) as Criteria;

const BAND_COLOUR: Record<string, string> = { low: "teal", intermediate: "yellow", high: "red" };

const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

const isInt = (v: number | null, r: { min: number; max: number }): v is number =>
  inRange(v, r.min, r.max) && Number.isInteger(v);

function GraceCalculator() {
  const [age, setAge] = useState<number | null>(null);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [sbp, setSbp] = useState<number | null>(null);
  const [creatinine, setCreatinine] = useState<number | null>(null);
  const [unit, setUnit] = useState<CreatinineUnit | null>(null);
  const [killip, setKillip] = useState<Killip | null>(null);
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);

  const complete =
    isInt(age, AGE) &&
    isInt(heartRate, HR) &&
    isInt(sbp, SBP) &&
    inRange(creatinine, CREATININE_MIN) &&
    creatinine > CREATININE_MIN &&
    unit !== null &&
    killip !== null;
  const calc = useCalculation(
    "grace",
    complete
      ? {
          age,
          heart_rate: heartRate,
          systolic_bp: sbp,
          creatinine,
          creatinine_unit: unit,
          killip_class: Number(killip),
          ...criteria,
        }
      : null,
  );

  const unitLabel = unit === null ? undefined : labelOf(UNITS, unit);

  return (
    <CalculatorPage
      icon={IconHeartRateMonitor}
      title="GRACE score"
      badge="Acute coronary syndrome"
      description="In-hospital mortality risk after acute coronary syndrome from eight admission variables, using the GRACE 1.0 point-based score (Granger 2003). Not the continuous GRACE 2.0 model, which gives slightly different totals."
      onReset={() => {
        setAge(null);
        setHeartRate(null);
        setSbp(null);
        setCreatinine(null);
        setUnit(null);
        setKillip(null);
        setCriteria(noneTicked());
      }}
      calc={calc}
      incomplete="Enter the admission observations, creatinine with its unit, and Killip class to calculate."
      form={
        <>
          <Text fw={600}>Admission observations</Text>
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Age"
              unit="years"
              value={age}
              onChange={setAge}
              min={AGE.min}
              max={AGE.max}
              decimals={0}
            />
            <NumberField
              label="Heart rate"
              unit="bpm"
              value={heartRate}
              onChange={setHeartRate}
              min={HR.min}
              max={HR.max}
              decimals={0}
            />
            <NumberField
              label="Systolic BP"
              hint="Scored inversely: lower pressure scores more."
              unit="mmHg"
              value={sbp}
              onChange={setSbp}
              min={SBP.min}
              max={SBP.max}
              decimals={0}
            />
          </SimpleGrid>
          <Text fw={600} mt="sm">
            Serum creatinine
          </Text>
          <Divider />
          <ChoiceField
            label="Unit"
            hint="Check the unit on the lab report: the two differ by about 88 times, and the wrong one moves the whole risk category."
            value={unit}
            onChange={setUnit}
            options={UNITS}
          />
          <NumberField
            label="Creatinine"
            unit={unitLabel}
            value={creatinine}
            onChange={setCreatinine}
            min={CREATININE_MIN}
            decimals={2}
          />
          <Text fw={600} mt="sm">
            Clinical findings
          </Text>
          <Divider />
          <ChoiceField
            label="Killip class on admission"
            value={killip}
            onChange={setKillip}
            options={KILLIP}
          />
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
        const band = asText(r.working.risk_category);
        return (
          <ScoreTile
            value={fmt(r.result)}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={band && `${band} risk`}
          />
        );
      }}
      details={(r) => (
        <>
          <Facts
            title="Points"
            items={[
              ["Age", fmt(r.working.age_points)],
              ["Heart rate", fmt(r.working.heart_rate_points)],
              ["Systolic BP", fmt(r.working.systolic_bp_points)],
              ["Creatinine", fmt(r.working.creatinine_points)],
              ["Killip", fmt(r.working.killip_points)],
              ["Cardiac arrest", fmt(r.working.cardiac_arrest_points)],
              ["ST deviation", fmt(r.working.st_deviation_points)],
              ["Cardiac enzymes", fmt(r.working.cardiac_enzymes_points)],
            ]}
          />
          <Facts
            title="Estimate"
            items={[["In-hospital mortality", asText(r.working.in_hospital_mortality)]]}
          />
        </>
      )}
      summary={(r) =>
        summaryText({
          heading: `GRACE score ${fmt(r.result)} (${asText(r.working.risk_category)} risk, in-hospital mortality ${asText(r.working.in_hospital_mortality)})`,
          interpretation: r.interpretation,
          findingsTitle: "Admission findings",
          findings: [
            `Age ${age} years`,
            `Heart rate ${heartRate} bpm`,
            `Systolic BP ${sbp} mmHg`,
            `Creatinine ${creatinine} ${unitLabel ?? ""}`.trim(),
            `Killip ${labelOf(KILLIP, killip)}`,
            ...CRITERIA.filter((c) => criteria[c.key]).map((c) => c.summary),
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "grace", Component: GraceCalculator };
