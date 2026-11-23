// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid } from "@mantine/core";
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

/** Original MELD score with UNOS bounding rules (Kamath 2001). */

/** Two or three short options side by side; starts unselected like ChoiceField. */

type Unit = "umol/L" | "mg/dL";
type YesNo = "yes" | "no";

const UNITS: Choice<Unit>[] = [
  { value: "umol/L", label: "µmol/L" },
  { value: "mg/dL", label: "mg/dL" },
];
const YES_NO: Choice<YesNo>[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const positive = (v: number | null): v is number => v !== null && Number.isFinite(v) && v > 0;
const unitText = (u: Unit | null) => (u === "umol/L" ? "µmol/L" : (u ?? ""));

function MeldCalculator() {
  const [bilirubin, setBilirubin] = useState<number | null>(null);
  const [bilirubinUnit, setBilirubinUnit] = useState<Unit | null>(null);
  const [inr, setInr] = useState<number | null>(null);
  const [creatinine, setCreatinine] = useState<number | null>(null);
  const [creatinineUnit, setCreatinineUnit] = useState<Unit | null>(null);
  const [dialysis, setDialysis] = useState<YesNo | null>(null);

  const complete =
    positive(bilirubin) &&
    bilirubinUnit !== null &&
    positive(inr) &&
    positive(creatinine) &&
    creatinineUnit !== null &&
    dialysis !== null;
  const calc = useCalculation(
    "meld",
    complete
      ? {
          bilirubin,
          bilirubin_unit: bilirubinUnit,
          inr,
          creatinine,
          creatinine_unit: creatinineUnit,
          dialysis_twice_past_week: dialysis === "yes",
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconFlask}
      title="MELD (original)"
      badge="End-stage liver disease"
      description="The original 2001 Model for End-Stage Liver Disease: 3-month mortality risk from bilirubin, INR, and creatinine, with the UNOS bounding rules (Kamath 2001). Current allocation uses MELD-Na or MELD 3.0, which will differ."
      onReset={() => {
        setBilirubin(null);
        setBilirubinUnit(null);
        setInr(null);
        setCreatinine(null);
        setCreatinineUnit(null);
        setDialysis(null);
      }}
      calc={calc}
      incomplete="Enter the three results with their units and answer the dialysis question to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Total bilirubin"
              hint="Values below 1.0 mg/dL (17.1 µmol/L) are set to 1.0."
              unit={unitText(bilirubinUnit)}
              value={bilirubin}
              onChange={setBilirubin}
              min={0}
              decimals={1}
            />
            <ChoiceField layout="inline"
              label="Bilirubin unit"
              hint="Check the unit on the report: the two differ about 17-fold."
              value={bilirubinUnit}
              onChange={setBilirubinUnit}
              options={UNITS}
            />
            <NumberField
              label="Creatinine"
              hint="Set to at least 1.0 and at most 4.0 mg/dL (88.4-353.6 µmol/L)."
              unit={unitText(creatinineUnit)}
              value={creatinine}
              onChange={setCreatinine}
              min={0}
              decimals={1}
            />
            <ChoiceField layout="inline"
              label="Creatinine unit"
              hint="Check the unit on the report: the two differ about 88-fold."
              value={creatinineUnit}
              onChange={setCreatinineUnit}
              options={UNITS}
            />
            <NumberField
              label="INR"
              hint="Values below 1.0 are set to 1.0."
              value={inr}
              onChange={setInr}
              min={0}
              decimals={2}
            />
          </SimpleGrid>
          <Divider />
          <ChoiceField layout="inline"
            label="Dialysis twice or more in the past week, or 24 hours of CVVHD"
            hint="If yes, creatinine is set to 4.0 mg/dL whatever the measured value."
            value={dialysis}
            onChange={setDialysis}
            options={YES_NO}
          />
        </>
      }
      result={(r) => <ScoreTile value={fmt(r.result)} badge="original MELD" />}
      details={(r) => (
        <Facts
          title="Values used in the formula"
          items={[
            ["Bilirubin", `${fmt(r.working.bilirubin_mgdl_used, 2)} mg/dL`],
            ["INR", fmt(r.working.inr_used, 2)],
            ["Creatinine", `${fmt(r.working.creatinine_mgdl_used, 2)} mg/dL`],
            ["Unrounded score", fmt(r.working.raw_score, 2)],
            ["Reportable range", `${fmt(r.working.score_min)}-${fmt(r.working.score_max)}`],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `MELD score ${fmt(r.result)} (original 2001 model)`,
          interpretation: r.interpretation,
          findingsTitle: "Results",
          findings: [
            `Bilirubin ${bilirubin} ${unitText(bilirubinUnit)}`,
            `INR ${inr}`,
            `Creatinine ${creatinine} ${unitText(creatinineUnit)}`,
            dialysis === "yes"
              ? "Dialysis twice or more in the past week (or 24 hours of CVVHD): creatinine set to 4.0 mg/dL"
              : "No qualifying dialysis in the past week",
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "meld", Component: MeldCalculator };
