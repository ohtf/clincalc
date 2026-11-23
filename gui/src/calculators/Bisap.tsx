// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid } from "@mantine/core";
import { IconFlame } from "@tabler/icons-react";

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
} from "../kit";

/** BISAP bedside index for severity in acute pancreatitis (Wu 2008). */

const BUN = { min: 0, max: 500 };
const SIRS = { min: 0, max: 4 };
const AGE = { min: 0, max: 130 };

const met = (v: unknown) => (v === true ? "1" : "0");

function BisapCalculator() {
  const [bun, setBun] = useState<number | null>(null);
  const [sirs, setSirs] = useState<number | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [mentalStatus, setMentalStatus] = useState(false);
  const [effusion, setEffusion] = useState(false);

  const complete =
    inRange(bun, BUN.min, BUN.max) &&
    inRange(sirs, SIRS.min, SIRS.max) &&
    Number.isInteger(sirs) &&
    inRange(age, AGE.min, AGE.max);
  const calc = useCalculation(
    "bisap",
    complete
      ? {
          bun_mg_dl: bun,
          impaired_mental_status: mentalStatus,
          sirs_criteria_count: sirs,
          age_years: age,
          pleural_effusion: effusion,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconFlame}
      title="BISAP"
      badge="Acute pancreatitis"
      description="Bedside Index for Severity in Acute Pancreatitis: five one-point items from the first 24 hours for early prediction of in-hospital mortality (Wu 2008)."
      onReset={() => {
        setBun(null);
        setSirs(null);
        setAge(null);
        setMentalStatus(false);
        setEffusion(false);
      }}
      calc={calc}
      incomplete="Enter BUN, the number of SIRS criteria, and age to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Blood urea nitrogen (BUN)"
              hint="First 24 hours. Over 25 mg/dL scores 1. Urea in mmol/L x 2.8 approximates BUN in mg/dL."
              unit="mg/dL"
              value={bun}
              onChange={setBun}
              min={BUN.min}
              max={BUN.max}
              decimals={1}
            />
            <NumberField
              label="SIRS criteria met"
              hint="Temperature, heart rate, respiratory rate or PaCO2, white cell count. 2 or more scores 1."
              unit="of 4"
              value={sirs}
              onChange={setSirs}
              min={SIRS.min}
              max={SIRS.max}
              decimals={0}
            />
            <NumberField
              label="Age"
              hint="Over 60 scores 1."
              unit="years"
              value={age}
              onChange={setAge}
              min={AGE.min}
              max={AGE.max}
              decimals={0}
            />
          </SimpleGrid>
          <Divider />
          <YesNoField
            label="Impaired mental status"
            hint="In the first 24 hours. Scores 1."
            checked={mentalStatus}
            onChange={setMentalStatus}
          />
          <YesNoField
            label="Pleural effusion"
            hint="Present on imaging. Scores 1."
            checked={effusion}
            onChange={setEffusion}
          />
        </>
      }
      result={(r) => <ScoreTile value={fmt(r.result)} outOf={5} />}
      details={(r) => (
        <Facts
          title="Points"
          items={[
            ["BUN", met(r.working.bun_criterion)],
            ["Impaired mental status", met(r.working.impaired_mental_status_criterion)],
            ["SIRS", met(r.working.sirs_criterion)],
            ["Age", met(r.working.age_criterion)],
            ["Pleural effusion", met(r.working.pleural_effusion_criterion)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `BISAP ${fmt(r.result)} / 5`,
          interpretation: r.interpretation,
          findings: [
            `BUN ${fmt(bun)} mg/dL`,
            `SIRS criteria met: ${sirs} of 4`,
            `Age ${age} years`,
            mentalStatus && "Impaired mental status",
            effusion && "Pleural effusion on imaging",
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "bisap", Component: BisapCalculator };
