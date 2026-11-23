// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconDroplet } from "@tabler/icons-react";

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

/** Holliday-Segar maintenance fluid rate, the "4-2-1 rule" (Holliday & Segar 1957). */

const WEIGHT = { min: 1, max: 150 };

function HollidaySegarCalculator() {
  const [weight, setWeight] = useState<number | null>(null);

  const complete = inRange(weight, WEIGHT.min, WEIGHT.max);
  const calc = useCalculation("holliday_segar", complete ? { weight_kg: weight } : null);

  return (
    <CalculatorPage
      icon={IconDroplet}
      title="Holliday-Segar maintenance fluids"
      badge="Paediatric fluids"
      description="Maintenance intravenous fluid volume by weight, the 4-2-1 rule (Holliday & Segar 1957). A maintenance estimate only: it excludes resuscitation, deficit, and ongoing losses, and was derived in children."
      onReset={() => setWeight(null)}
      calc={calc}
      incomplete="Enter weight to calculate."
      form={
        <NumberField
          label="Weight"
          hint="4 mL/kg/h for the first 10 kg, 2 mL/kg/h for the next 10 kg, 1 mL/kg/h for each kg after that."
          unit="kg"
          value={weight}
          onChange={setWeight}
          min={WEIGHT.min}
          max={WEIGHT.max}
          decimals={1}
        />
      }
      result={(r) => <ScoreTile value={fmt(r.working.hourly_ml)} unit="mL/h" />}
      details={(r) => <Facts items={[["Per 24 hours", `${fmt(r.result, 0)} mL`]]} />}
      summary={(r) =>
        summaryText({
          heading: `Holliday-Segar maintenance fluids: ${fmt(r.working.hourly_ml)} mL/h (${fmt(r.result, 0)} mL/24h)`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [`Weight ${weight} kg`],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "holliday_segar", Component: HollidaySegarCalculator };
