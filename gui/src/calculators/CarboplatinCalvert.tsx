// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Alert, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconVaccine } from "@tabler/icons-react";

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

/** Carboplatin dose by the Calvert formula, with the 125 mL/min GFR cap (Calvert 1989). */

const AUC = { min: 1, max: 12 };
const GFR = { min: 5, max: 250 };

function CarboplatinCalvertCalculator() {
  const [auc, setAuc] = useState<number | null>(null);
  const [gfr, setGfr] = useState<number | null>(null);

  const complete = inRange(auc, AUC.min, AUC.max) && inRange(gfr, GFR.min, GFR.max);
  const calc = useCalculation(
    "carboplatin_calvert",
    complete ? { target_auc_mg_ml_min: auc, gfr_ml_min: gfr } : null,
  );

  return (
    <CalculatorPage
      icon={IconVaccine}
      title="Carboplatin dose (Calvert)"
      badge="Chemotherapy dosing"
      description="Total carboplatin dose in mg for a target AUC from renal function: dose (mg) = target AUC (mg/mL x min) x (GFR (mL/min) + 25), with GFR capped at 125 mL/min (Calvert 1989). A calculation aid only."
      onReset={() => {
        setAuc(null);
        setGfr(null);
      }}
      calc={calc}
      incomplete="Enter the target AUC and the GFR to calculate."
      form={
        <>
          <NumberField
            label="Target AUC"
            hint="From the chosen regimen or protocol."
            unit="mg/mL x min"
            value={auc}
            onChange={setAuc}
            min={AUC.min}
            max={AUC.max}
            decimals={1}
          />
          <NumberField
            label="GFR"
            hint="Measured or estimated, e.g. Cockcroft-Gault creatinine clearance or an isotopic GFR. Above 125 mL/min is capped at 125."
            unit="mL/min"
            value={gfr}
            onChange={setGfr}
            min={GFR.min}
            max={GFR.max}
            decimals={0}
          />
          <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={18} />}>
            <Text size="sm">
              A calculation aid, not a substitute for independent verification. Verify the target
              AUC, any GFR cap, and the resulting dose against the local chemotherapy protocol, with
              an independent second checker, before administration.
            </Text>
          </Alert>
        </>
      }
      result={(r) => <ScoreTile value={fmt(r.result, 0)} unit="mg carboplatin (total dose)" />}
      details={(r) => (
        <Stack gap="sm">
          {r.working.gfr_was_capped === true && (
            <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={18} />}>
              <Text size="sm">
                The entered GFR ({gfr} mL/min) is above the 125 mL/min dosing cap; 125 mL/min was
                used.
              </Text>
            </Alert>
          )}
          <Facts
            items={[
              ["Target AUC", `${auc} mg/mL x min`],
              ["GFR entered", `${gfr} mL/min`],
              ["GFR used", `${fmt(r.working.gfr_used_ml_min)} mL/min`],
              ["GFR capped", r.working.gfr_was_capped === true ? "yes" : "no"],
            ]}
          />
        </Stack>
      )}
      summary={(r) =>
        summaryText({
          heading: `Carboplatin dose (Calvert formula): ${fmt(r.result, 0)} mg`,
          interpretation: r.interpretation,
          findingsTitle: "Inputs",
          findings: [
            `Target AUC ${auc} mg/mL x min`,
            `GFR entered ${gfr} mL/min`,
            `GFR used ${fmt(r.working.gfr_used_ml_min)} mL/min${r.working.gfr_was_capped === true ? " (capped at 125 mL/min)" : ""}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "carboplatin_calvert",
  Component: CarboplatinCalvertCalculator,
};
