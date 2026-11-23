// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconGauge } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** Mean arterial pressure (DeMers & Wachs, StatPearls) with the Surviving Sepsis 2021 target. */

const SYSTOLIC = { min: 40, max: 300 };
const DIASTOLIC = { min: 20, max: 200 };

function MapCalculator() {
  const [systolic, setSystolic] = useState<number | null>(null);
  const [diastolic, setDiastolic] = useState<number | null>(null);

  const valuesOk =
    inRange(systolic, SYSTOLIC.min, SYSTOLIC.max) &&
    inRange(diastolic, DIASTOLIC.min, DIASTOLIC.max);
  const diastolicTooHigh = valuesOk && diastolic! >= systolic!;
  const complete = valuesOk && !diastolicTooHigh;
  const calc = useCalculation(
    "map",
    complete ? { systolic_bp_mm_hg: systolic, diastolic_bp_mm_hg: diastolic } : null,
  );

  return (
    <CalculatorPage
      icon={IconGauge}
      title="Mean arterial pressure"
      badge="Haemodynamics"
      description="Mean arterial pressure from systolic and diastolic blood pressure (diastolic + one third of the pulse pressure), compared with the 65 mmHg sepsis-resuscitation target (Surviving Sepsis Campaign 2021)."
      onReset={() => {
        setSystolic(null);
        setDiastolic(null);
      }}
      calc={calc}
      incomplete={
        diastolicTooHigh
          ? "Diastolic pressure must be lower than systolic."
          : "Enter systolic and diastolic blood pressure to calculate."
      }
      form={
        <SimpleGrid cols={2} spacing="md">
          <NumberField
            label="Systolic BP"
            unit="mmHg"
            value={systolic}
            onChange={setSystolic}
            min={SYSTOLIC.min}
            max={SYSTOLIC.max}
          />
          <NumberField
            label="Diastolic BP"
            unit="mmHg"
            value={diastolic}
            onChange={setDiastolic}
            min={DIASTOLIC.min}
            max={DIASTOLIC.max}
          />
        </SimpleGrid>
      }
      result={(r) => (
        <ScoreTile
          value={fmt(r.result)}
          unit="mmHg"
          badge={
            r.working.meets_sepsis_resuscitation_target ? "At or above 65 mmHg" : "Below 65 mmHg"
          }
        />
      )}
      details={(r) => (
        <Facts items={[["Pulse pressure", `${fmt(r.working.pulse_pressure_mm_hg)} mmHg`]]} />
      )}
      summary={(r) =>
        summaryText({
          heading: `MAP ${fmt(r.result)} mmHg (${r.working.meets_sepsis_resuscitation_target ? "meets" : "below"} the 65 mmHg sepsis-resuscitation target)`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [
            `Blood pressure ${systolic}/${diastolic} mmHg`,
            `Pulse pressure ${fmt(r.working.pulse_pressure_mm_hg)} mmHg`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "map", Component: MapCalculator };
