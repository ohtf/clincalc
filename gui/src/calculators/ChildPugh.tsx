// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid } from "@mantine/core";
import { IconTestPipe } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  NumberField,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Child-Pugh score for cirrhosis severity (Pugh 1973). */

/** Two or three short options side by side; starts unselected like ChoiceField. */

type BilirubinUnit = "umol/L" | "mg/dL";
type AlbuminUnit = "g/L" | "g/dL";
type Ascites = "none" | "mild" | "moderate-severe";
type Encephalopathy = "none" | "grade1-2" | "grade3-4";

const BILIRUBIN_UNITS: Choice<BilirubinUnit>[] = [
  { value: "umol/L", label: "µmol/L" },
  { value: "mg/dL", label: "mg/dL" },
];
const ALBUMIN_UNITS: Choice<AlbuminUnit>[] = [
  { value: "g/L", label: "g/L" },
  { value: "g/dL", label: "g/dL" },
];

const ASCITES: Choice<Ascites>[] = [
  { value: "none", label: "None (1)" },
  { value: "mild", label: "Mild, or controlled by diuretics (2)" },
  { value: "moderate-severe", label: "Moderate to severe, or refractory to diuretics (3)" },
];

const ENCEPHALOPATHY: Choice<Encephalopathy>[] = [
  { value: "none", label: "None (1)" },
  {
    value: "grade1-2",
    label: "Grade 1-2, or suppressed with medication (2)",
    hint: "Mild confusion to disorientation or drowsiness.",
  },
  {
    value: "grade3-4",
    label: "Grade 3-4, or refractory (3)",
    hint: "Marked confusion or somnolence through to coma.",
  },
];

const CLASS_COLOUR: Record<string, string> = { A: "teal", B: "yellow", C: "red" };

const positive = (v: number | null): v is number => v !== null && Number.isFinite(v) && v > 0;
const unitText = (u: string | null) => (u === "umol/L" ? "µmol/L" : (u ?? ""));
const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

function ChildPughCalculator() {
  const [bilirubin, setBilirubin] = useState<number | null>(null);
  const [bilirubinUnit, setBilirubinUnit] = useState<BilirubinUnit | null>(null);
  const [albumin, setAlbumin] = useState<number | null>(null);
  const [albuminUnit, setAlbuminUnit] = useState<AlbuminUnit | null>(null);
  const [inr, setInr] = useState<number | null>(null);
  const [ascites, setAscites] = useState<Ascites | null>(null);
  const [encephalopathy, setEncephalopathy] = useState<Encephalopathy | null>(null);

  const complete =
    positive(bilirubin) &&
    bilirubinUnit !== null &&
    positive(albumin) &&
    albuminUnit !== null &&
    positive(inr) &&
    ascites !== null &&
    encephalopathy !== null;
  const calc = useCalculation(
    "child_pugh",
    complete
      ? {
          bilirubin,
          bilirubin_unit: bilirubinUnit,
          albumin,
          albumin_unit: albuminUnit,
          inr,
          ascites,
          encephalopathy,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconTestPipe}
      title="Child-Pugh score"
      badge="Cirrhosis"
      description="Severity of chronic liver disease from five parameters, each scored 1-3, giving class A (5-6), B (7-9), or C (10-15) (Pugh 1973). It does not replace specialist hepatology assessment."
      onReset={() => {
        setBilirubin(null);
        setBilirubinUnit(null);
        setAlbumin(null);
        setAlbuminUnit(null);
        setInr(null);
        setAscites(null);
        setEncephalopathy(null);
      }}
      calc={calc}
      incomplete="Enter the three results with their units and grade ascites and encephalopathy to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Total bilirubin"
              hint="Under 34 µmol/L (2 mg/dL) scores 1, 34-50 (2-3) scores 2, over 50 (3) scores 3."
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
              options={BILIRUBIN_UNITS}
            />
            <NumberField
              label="Albumin"
              hint="Over 35 g/L (3.5 g/dL) scores 1, 28-35 (2.8-3.5) scores 2, under 28 (2.8) scores 3."
              unit={unitText(albuminUnit)}
              value={albumin}
              onChange={setAlbumin}
              min={0}
              decimals={1}
            />
            <ChoiceField layout="inline"
              label="Albumin unit"
              hint="UK laboratories report g/L (1 g/dL = 10 g/L)."
              value={albuminUnit}
              onChange={setAlbuminUnit}
              options={ALBUMIN_UNITS}
            />
            <NumberField
              label="INR"
              hint="Use the INR, not the prothrombin time in seconds. Under 1.7 scores 1, 1.7-2.3 scores 2, over 2.3 scores 3."
              value={inr}
              onChange={setInr}
              min={0}
              decimals={2}
            />
          </SimpleGrid>
          <Divider />
          <ChoiceField
            label="Ascites"
            hint="Score the underlying severity including the response to diuretics, not only what is palpable today."
            value={ascites}
            onChange={setAscites}
            options={ASCITES}
          />
          <ChoiceField
            label="Hepatic encephalopathy (West Haven)"
            hint="Score the underlying grade including the response to medication, not only the current treated state."
            value={encephalopathy}
            onChange={setEncephalopathy}
            options={ENCEPHALOPATHY}
          />
        </>
      }
      result={(r) => {
        const cls = asText(r.working.class);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={15}
            colour={CLASS_COLOUR[cls] ?? "teal"}
            badge={cls && `Class ${cls}`}
          />
        );
      }}
      details={(r) => (
        <Facts
          title="Points"
          items={[
            ["Bilirubin", fmt(r.working.bilirubin_points)],
            ["Albumin", fmt(r.working.albumin_points)],
            ["INR", fmt(r.working.inr_points)],
            ["Ascites", fmt(r.working.ascites_points)],
            ["Encephalopathy", fmt(r.working.encephalopathy_points)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Child-Pugh score ${fmt(r.result)} / 15 (class ${asText(r.working.class)})`,
          interpretation: r.interpretation,
          findingsTitle: "Parameters",
          findings: [
            `Bilirubin ${bilirubin} ${unitText(bilirubinUnit)} (${fmt(r.working.bilirubin_points)})`,
            `Albumin ${albumin} ${unitText(albuminUnit)} (${fmt(r.working.albumin_points)})`,
            `INR ${inr} (${fmt(r.working.inr_points)})`,
            `Ascites: ${labelOf(ASCITES, ascites)}`,
            `Encephalopathy: ${labelOf(ENCEPHALOPATHY, encephalopathy)}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "child_pugh", Component: ChildPughCalculator };
