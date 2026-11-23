// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Badge, Divider, SimpleGrid } from "@mantine/core";
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
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/**
 * NEWS2 aggregate physiology score and clinical-response band (RCP 2017).
 * Scale 2 changes how the same SpO2 reading is scored, so it is an explicit
 * choice; Scale 1 is the source's default.
 */

type Scale = "1" | "2";
type Consciousness = "alert" | "confusion-or-vpu";

const SCALE: Choice<Scale>[] = [
  { value: "1", label: "Scale 1 (default)" },
  { value: "2", label: "Scale 2 (COPD, target 88-92%)" },
];

const CONSCIOUSNESS: Choice<Consciousness>[] = [
  { value: "alert", label: "Alert" },
  { value: "confusion-or-vpu", label: "New confusion / V / P / U" },
];

const RR = { min: 0, max: 80 };
const SPO2 = { min: 0, max: 100 };
const SBP = { min: 0, max: 300 };
const PULSE = { min: 0, max: 300 };
const TEMP = { min: 20, max: 45 };

const isInt = (v: number | null, r: { min: number; max: number }) =>
  inRange(v, r.min, r.max) && Number.isInteger(v);

function bandColour(band: string): string {
  if (band === "high") return "red";
  if (band === "medium") return "orange";
  if (band === "low-medium") return "yellow";
  if (band === "low") return "yellow";
  return "teal";
}

const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

export function News2Calculator() {
  const [respiratoryRate, setRespiratoryRate] = useState<number | null>(null);
  const [spo2, setSpo2] = useState<number | null>(null);
  const [scale, setScale] = useState<Scale>("1");
  const [onOxygen, setOnOxygen] = useState(false);
  const [systolic, setSystolic] = useState<number | null>(null);
  const [pulse, setPulse] = useState<number | null>(null);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [consciousness, setConsciousness] = useState<Consciousness | null>(null);

  const complete =
    isInt(respiratoryRate, RR) &&
    isInt(spo2, SPO2) &&
    isInt(systolic, SBP) &&
    isInt(pulse, PULSE) &&
    inRange(temperature, TEMP.min, TEMP.max) &&
    consciousness !== null;
  const calc = useCalculation(
    "news2",
    complete
      ? {
          respiratory_rate: respiratoryRate,
          spo2,
          spo2_scale: scale,
          on_oxygen: onOxygen,
          systolic_bp: systolic,
          pulse,
          consciousness,
          temperature,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconActivity}
      title="NEWS2"
      badge="NHS-mandated"
      description="National Early Warning Score 2 (RCP 2017): aggregate physiology score driving the clinical-response band."
      onReset={() => {
        setRespiratoryRate(null);
        setSpo2(null);
        setScale("1");
        setOnOxygen(false);
        setSystolic(null);
        setPulse(null);
        setTemperature(null);
        setConsciousness(null);
      }}
      calc={calc}
      maw={980}
      incomplete="Enter all six observations and the level of consciousness to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Respiratory rate"
              unit="breaths/min"
              value={respiratoryRate}
              onChange={setRespiratoryRate}
              min={RR.min}
              max={RR.max}
              decimals={0}
            />
            <NumberField
              label="SpO2"
              unit="%"
              value={spo2}
              onChange={setSpo2}
              min={SPO2.min}
              max={SPO2.max}
              decimals={0}
            />
          </SimpleGrid>
          <ChoiceField
            label="SpO2 scale"
            value={scale}
            onChange={setScale}
            options={SCALE}
            layout="segmented"
          />
          <YesNoField label="Receiving supplemental oxygen" checked={onOxygen} onChange={setOnOxygen} />
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Systolic BP"
              unit="mmHg"
              value={systolic}
              onChange={setSystolic}
              min={SBP.min}
              max={SBP.max}
              decimals={0}
            />
            <NumberField
              label="Pulse"
              unit="bpm"
              value={pulse}
              onChange={setPulse}
              min={PULSE.min}
              max={PULSE.max}
              decimals={0}
            />
          </SimpleGrid>
          <NumberField
            label="Temperature"
            unit="°C"
            value={temperature}
            onChange={setTemperature}
            min={TEMP.min}
            max={TEMP.max}
            step={0.1}
            decimals={1}
          />
          <ChoiceField
            label="Consciousness (ACVPU)"
            value={consciousness}
            onChange={setConsciousness}
            options={CONSCIOUSNESS}
            layout="segmented"
          />
        </>
      }
      result={(r) => {
        const band = asText(r.working.band);
        return (
          <>
            <ScoreTile value={asText(r.result)} colour={bandColour(band)} badge={band || "—"} />
            {r.working.single_parameter_3 === true && (
              <Badge color="yellow" variant="light" w="fit-content">
                Single red score (3)
              </Badge>
            )}
          </>
        );
      }}
      details={(r) => (
        <Facts
          title="Per-parameter scores"
          items={[
            ["RR", asText(r.working.respiratory_rate_score)],
            ["SpO2", asText(r.working.spo2_score)],
            ["O2", asText(r.working.air_or_oxygen_score)],
            ["SBP", asText(r.working.systolic_bp_score)],
            ["Pulse", asText(r.working.pulse_score)],
            ["Conscious", asText(r.working.consciousness_score)],
            ["Temp", asText(r.working.temperature_score)],
          ]}
        />
      )}
      summary={(r) => {
        const w = r.working;
        return summaryText({
          heading: `NEWS2 ${asText(r.result)} (${asText(w.band)})`,
          interpretation: r.interpretation,
          extra: [
            `Respiratory rate: ${respiratoryRate}/min (${asText(w.respiratory_rate_score)})`,
            `SpO2: ${spo2}% on scale ${scale}${onOxygen ? ", on oxygen" : ", on air"} (${asText(w.spo2_score)})`,
            `Air/oxygen: ${asText(w.air_or_oxygen_score)}`,
            `Systolic BP: ${systolic} mmHg (${asText(w.systolic_bp_score)})`,
            `Pulse: ${pulse} bpm (${asText(w.pulse_score)})`,
            `Consciousness: ${labelOf(CONSCIOUSNESS, consciousness)} (${asText(w.consciousness_score)})`,
            `Temperature: ${temperature} degC (${asText(w.temperature_score)})`,
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "news2", Component: News2Calculator };
