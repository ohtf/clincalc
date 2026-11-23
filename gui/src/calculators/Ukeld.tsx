// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconFlask } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  NumberField,
  ScoreTile,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
  ChoiceField,
} from "../kit";

/** UKELD, the UK liver-transplant listing score (Barber 2011). */

/** Two or three short options side by side; starts unselected like ChoiceField. */

type Unit = "umol/L" | "mg/dL";

const UNITS: Choice<Unit>[] = [
  { value: "umol/L", label: "µmol/L" },
  { value: "mg/dL", label: "mg/dL" },
];

const positive = (v: number | null): v is number => v !== null && Number.isFinite(v) && v > 0;
const unitText = (u: Unit) => (u === "umol/L" ? "µmol/L" : u);

function UkeldCalculator() {
  const [inr, setInr] = useState<number | null>(null);
  const [creatinine, setCreatinine] = useState<number | null>(null);
  const [creatinineUnit, setCreatinineUnit] = useState<Unit>("umol/L");
  const [bilirubin, setBilirubin] = useState<number | null>(null);
  const [bilirubinUnit, setBilirubinUnit] = useState<Unit>("umol/L");
  const [sodium, setSodium] = useState<number | null>(null);

  const complete = positive(inr) && positive(creatinine) && positive(bilirubin) && positive(sodium);
  const calc = useCalculation(
    "ukeld",
    complete
      ? {
          inr,
          creatinine,
          creatinine_unit: creatinineUnit,
          bilirubin,
          bilirubin_unit: bilirubinUnit,
          sodium,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconFlask}
      title="UKELD"
      badge="UK liver transplant listing"
      description="UK Model for End-Stage Liver Disease from INR, creatinine, bilirubin, and sodium (Barber 2011). A score of 49 or more is the UK minimum for the elective adult liver-transplant list."
      onReset={() => {
        setInr(null);
        setCreatinine(null);
        setCreatinineUnit("umol/L");
        setBilirubin(null);
        setBilirubinUnit("umol/L");
        setSodium(null);
      }}
      calc={calc}
      incomplete="Enter INR, creatinine, bilirubin, and sodium to calculate."
      form={
        <SimpleGrid cols={2} spacing="md">
          <NumberField
            label="Creatinine"
            unit={unitText(creatinineUnit)}
            value={creatinine}
            onChange={setCreatinine}
            min={0}
            decimals={1}
          />
          <ChoiceField layout="inline"
            label="Creatinine unit"
            hint="UKELD is defined in µmol/L, as UK laboratories report it. 1 mg/dL = 88.4 µmol/L."
            value={creatinineUnit}
            onChange={setCreatinineUnit}
            options={UNITS}
          />
          <NumberField
            label="Total bilirubin"
            unit={unitText(bilirubinUnit)}
            value={bilirubin}
            onChange={setBilirubin}
            min={0}
            decimals={1}
          />
          <ChoiceField layout="inline"
            label="Bilirubin unit"
            hint="UKELD is defined in µmol/L. 1 mg/dL = 17.1 µmol/L."
            value={bilirubinUnit}
            onChange={setBilirubinUnit}
            options={UNITS}
          />
          <NumberField
            label="Sodium"
            unit="mmol/L"
            value={sodium}
            onChange={setSodium}
            min={0}
            decimals={1}
          />
          <NumberField label="INR" value={inr} onChange={setInr} min={0} decimals={2} />
        </SimpleGrid>
      }
      result={(r) => (
        <ScoreTile
          value={fmt(r.result)}
          badge={
            r.working.meets_listing_threshold === true
              ? `meets listing threshold (${fmt(r.working.listing_threshold)})`
              : `below listing threshold (${fmt(r.working.listing_threshold)})`
          }
        />
      )}
      details={(r) => (
        <Facts
          title="Values used in the formula"
          items={[
            ["Creatinine", `${fmt(r.working.creatinine_umol_used)} µmol/L`],
            ["Bilirubin", `${fmt(r.working.bilirubin_umol_used)} µmol/L`],
            ["Sodium", `${fmt(r.working.sodium_mmol)} mmol/L`],
            ["INR", fmt(r.working.inr, 2)],
            ["Unrounded score", fmt(r.working.raw_score, 2)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `UKELD score ${fmt(r.result)} (${
            r.working.meets_listing_threshold === true ? "meets" : "does not meet"
          } the listing threshold of ${fmt(r.working.listing_threshold)})`,
          interpretation: r.interpretation,
          findingsTitle: "Results",
          findings: [
            `INR ${inr}`,
            `Creatinine ${creatinine} ${unitText(creatinineUnit)}`,
            `Bilirubin ${bilirubin} ${unitText(bilirubinUnit)}`,
            `Sodium ${sodium} mmol/L`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "ukeld", Component: UkeldCalculator };
