// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconActivity } from "@tabler/icons-react";

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

/** PESI and simplified PESI after pulmonary embolism (Aujesky 2005; Jimenez 2010). */

type Sex = "male" | "female";
type Key =
  | "history_of_cancer"
  | "history_of_heart_failure"
  | "history_of_chronic_lung_disease"
  | "altered_mental_status";

const SEX: Choice<Sex>[] = [
  { value: "male", label: "Male (+10)" },
  { value: "female", label: "Female (0)" },
];

const HISTORY: Array<{ key: Key; label: string; hint?: string }> = [
  { key: "history_of_cancer", label: "Cancer (+30)", hint: "Active or recently treated cancer." },
  { key: "history_of_heart_failure", label: "Heart failure (+10)" },
  { key: "history_of_chronic_lung_disease", label: "Chronic lung disease (+10)" },
];

const MENTAL: { key: Key; label: string; hint: string } = {
  key: "altered_mental_status",
  label: "Altered mental status (+60)",
  hint: "Disorientation, lethargy, stupor, or coma. Original PESI only.",
};

const AGE = { min: 0, max: 130 };
const PULSE = { max: 300 };
const SBP = { max: 300 };
const RR = { max: 80 };
const TEMP = { min: 25, max: 45 };
const SPO2 = { max: 100 };

type Flags = Record<Key, boolean>;
const noneTicked = (): Flags =>
  Object.fromEntries([...HISTORY, MENTAL].map((c) => [c.key, false])) as Flags;

const positiveUpTo = (v: number | null, max: number): v is number => inRange(v, undefined, max) && v > 0;

function PesiCalculator() {
  const [age, setAge] = useState<number | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [flags, setFlags] = useState<Flags>(noneTicked);
  const [pulse, setPulse] = useState<number | null>(null);
  const [sbp, setSbp] = useState<number | null>(null);
  const [rr, setRr] = useState<number | null>(null);
  const [temp, setTemp] = useState<number | null>(null);
  const [spo2, setSpo2] = useState<number | null>(null);

  const complete =
    inRange(age, AGE.min, AGE.max) &&
    sex !== null &&
    positiveUpTo(pulse, PULSE.max) &&
    positiveUpTo(sbp, SBP.max) &&
    positiveUpTo(rr, RR.max) &&
    inRange(temp, TEMP.min, TEMP.max) &&
    positiveUpTo(spo2, SPO2.max);

  const calc = useCalculation(
    "pesi",
    complete
      ? {
          age_years: age,
          male_sex: sex === "male",
          ...flags,
          pulse_bpm: pulse,
          systolic_bp_mmhg: sbp,
          respiratory_rate_per_min: rr,
          temperature_celsius: temp,
          oxygen_saturation_percent: spo2,
        }
      : null,
  );

  const toggle = (key: Key) => (checked: boolean) => setFlags((prev) => ({ ...prev, [key]: checked }));
  const zeroEntered = [pulse, sbp, rr, spo2].some((v) => v !== null && v <= 0);

  return (
    <CalculatorPage
      icon={IconActivity}
      title="PESI and simplified PESI"
      badge="Pulmonary embolism"
      description="30-day mortality risk after a diagnosis of pulmonary embolism: the original five-class PESI (Aujesky 2005) and the simplified PESI (Jimenez 2010), from one set of clinical findings."
      onReset={() => {
        setAge(null);
        setSex(null);
        setFlags(noneTicked());
        setPulse(null);
        setSbp(null);
        setRr(null);
        setTemp(null);
        setSpo2(null);
      }}
      calc={calc}
      incomplete={
        zeroEntered
          ? "Pulse, systolic BP, respiratory rate, and saturation must be above 0."
          : "Enter age, sex, and all five observations to calculate."
      }
      form={
        <>
          <Text fw={600} size="sm">
            Demographics
          </Text>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Age"
              hint="Adds 1 point per year; over 80 scores in sPESI."
              unit="years"
              value={age}
              onChange={setAge}
              min={AGE.min}
              max={AGE.max}
              decimals={0}
            />
            <ChoiceField label="Sex" hint="Original PESI only." value={sex} onChange={setSex} options={SEX} />
          </SimpleGrid>
          <Divider />
          <Text fw={600} size="sm">
            History - tick each that applies
          </Text>
          {HISTORY.map((c) => (
            <YesNoField key={c.key} label={c.label} hint={c.hint} checked={flags[c.key]} onChange={toggle(c.key)} />
          ))}
          <Divider />
          <Text fw={600} size="sm">
            Clinical findings
          </Text>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Pulse"
              hint="110 or more: +20."
              unit="bpm"
              value={pulse}
              onChange={setPulse}
              min={0}
              max={PULSE.max}
              decimals={0}
            />
            <NumberField
              label="Systolic BP"
              hint="Below 100: +30."
              unit="mmHg"
              value={sbp}
              onChange={setSbp}
              min={0}
              max={SBP.max}
              decimals={0}
            />
            <NumberField
              label="Respiratory rate"
              hint="30 or more: +20. Original PESI only."
              unit="/min"
              value={rr}
              onChange={setRr}
              min={0}
              max={RR.max}
              decimals={0}
            />
            <NumberField
              label="Temperature"
              hint="Below 36 °C: +20. Original PESI only."
              unit="°C"
              value={temp}
              onChange={setTemp}
              min={TEMP.min}
              max={TEMP.max}
              decimals={1}
            />
            <NumberField
              label="Arterial oxygen saturation"
              hint="Below 90%: +20. With or without supplemental oxygen."
              unit="%"
              value={spo2}
              onChange={setSpo2}
              min={0}
              max={SPO2.max}
              decimals={0}
            />
          </SimpleGrid>
          <YesNoField
            label={MENTAL.label}
            hint={MENTAL.hint}
            checked={flags[MENTAL.key]}
            onChange={toggle(MENTAL.key)}
          />
        </>
      }
      result={(r) => (
        <ScoreTile value={fmt(r.result)} unit="points" badge={`Class ${asText(r.working.original_pesi_class)}`} />
      )}
      details={(r) => (
        <>
          <Facts
            title="Original PESI"
            items={[
              ["Class", asText(r.working.original_pesi_class)],
              ["30-day mortality", asText(r.working.original_pesi_mortality_range)],
            ]}
          />
          <Facts
            title="Simplified PESI"
            items={[
              ["Score", `${fmt(r.working.simplified_pesi_score)} / 6`],
              ["Risk", r.working.simplified_pesi_high_risk === true ? "not low risk" : "low risk"],
              ["30-day mortality", asText(r.working.simplified_pesi_mortality)],
            ]}
          />
        </>
      )}
      summary={(r) =>
        summaryText({
          heading: `PESI ${fmt(r.result)} points, class ${asText(r.working.original_pesi_class)}; simplified PESI ${fmt(r.working.simplified_pesi_score)} / 6`,
          interpretation: r.interpretation,
          findingsTitle: "Findings",
          findings: [
            `Age ${age} years`,
            `Sex: ${sex}`,
            ...HISTORY.filter((c) => flags[c.key]).map((c) => c.label),
            `Pulse ${pulse} bpm`,
            `Systolic BP ${sbp} mmHg`,
            `Respiratory rate ${rr}/min`,
            `Temperature ${temp} °C`,
            `Oxygen saturation ${spo2}%`,
            flags.altered_mental_status && MENTAL.label,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "pesi", Component: PesiCalculator };
