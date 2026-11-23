// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconWaveSine } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  compact,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Heart-rate-corrected QT interval by Bazett, Fridericia, Framingham (Sagie 1992), and Hodges. */

type Sex = "Male" | "Female" | "not_stated";

const SEX: Choice<Sex>[] = [
  { value: "not_stated", label: "Not stated" },
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
];

const QT = { min: 150, max: 800 };
const HR = { min: 20, max: 250 };

function QtcCalculator() {
  const [qt, setQt] = useState<number | null>(null);
  const [hr, setHr] = useState<number | null>(null);
  const [sex, setSex] = useState<Sex>("not_stated");

  const complete = inRange(qt, QT.min, QT.max) && inRange(hr, HR.min, HR.max);
  const calc = useCalculation(
    "qtc",
    complete
      ? compact({ qt_ms: qt, heart_rate_bpm: hr, sex: sex === "not_stated" ? null : sex })
      : null,
  );

  const flag = (w: Record<string, unknown>) =>
    w.high_risk_above_500ms === true
      ? { colour: "red", badge: "Above 500 ms" }
      : w.prolonged_for_sex === true
        ? { colour: "yellow", badge: "Prolonged for sex" }
        : { colour: "teal", badge: undefined };

  return (
    <CalculatorPage
      icon={IconWaveSine}
      title="QTc"
      badge="ECG"
      description="Heart-rate-corrected QT interval by the Bazett, Fridericia, Framingham, and Hodges formulas. Bazett is the headline; it over-corrects at heart rates away from 60 bpm, where Fridericia or Framingham are generally preferred."
      onReset={() => {
        setQt(null);
        setHr(null);
        setSex("not_stated");
      }}
      calc={calc}
      incomplete="Enter the measured QT interval and heart rate to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="QT interval"
              unit="ms"
              value={qt}
              onChange={setQt}
              min={QT.min}
              max={QT.max}
              decimals={0}
            />
            <NumberField
              label="Heart rate"
              unit="bpm"
              value={hr}
              onChange={setHr}
              min={HR.min}
              max={HR.max}
              decimals={0}
            />
          </SimpleGrid>
          <ChoiceField
            label="Sex"
            hint="Optional. Enables the sex-specific prolonged threshold on the Bazett value (above 450 ms male, above 460 ms female)."
            value={sex}
            onChange={setSex}
            options={SEX}
          />
        </>
      }
      result={(r) => {
        const f = flag(r.working);
        return <ScoreTile value={fmt(r.result, 0)} unit="ms" colour={f.colour} badge={f.badge} />;
      }}
      details={(r) => (
        <Facts
          title="Other formulas"
          items={[
            ["Fridericia", `${fmt(r.working.fridericia_ms, 0)} ms`],
            ["Framingham", `${fmt(r.working.framingham_ms, 0)} ms`],
            ["Hodges", `${fmt(r.working.hodges_ms, 0)} ms`],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `QTc (Bazett) ${fmt(r.result, 0)} ms; Fridericia ${fmt(r.working.fridericia_ms, 0)} ms, Framingham ${fmt(r.working.framingham_ms, 0)} ms, Hodges ${fmt(r.working.hodges_ms, 0)} ms`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [
            `QT ${qt} ms`,
            `Heart rate ${hr} bpm`,
            sex !== "not_stated" && `Sex ${sex.toLowerCase()}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "qtc", Component: QtcCalculator };
