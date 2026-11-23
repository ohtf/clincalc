// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconFlask } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  NumberField,
  ScoreTile,
  fmt,
  inRange,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
  ChoiceField,
} from "../kit";

/** MELD 3.0 under current OPTN allocation rules (Kim 2021). */

/** Two or three short options side by side; starts unselected like ChoiceField. */

type MassUnit = "umol/L" | "mg/dL";
type AlbuminUnit = "g/L" | "g/dL";
type YesNo = "yes" | "no";

const MASS_UNITS: Choice<MassUnit>[] = [
  { value: "umol/L", label: "µmol/L" },
  { value: "mg/dL", label: "mg/dL" },
];
const ALBUMIN_UNITS: Choice<AlbuminUnit>[] = [
  { value: "g/L", label: "g/L" },
  { value: "g/dL", label: "g/dL" },
];
const YES_NO: Choice<YesNo>[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const AGE = { min: 12, max: 120 };

const positive = (v: number | null): v is number => v !== null && Number.isFinite(v) && v > 0;
const unitText = (u: string | null) => (u === "umol/L" ? "µmol/L" : (u ?? ""));

function Meld3Calculator() {
  const [age, setAge] = useState<number | null>(null);
  const [female, setFemale] = useState<YesNo | null>(null);
  const [bilirubin, setBilirubin] = useState<number | null>(null);
  const [bilirubinUnit, setBilirubinUnit] = useState<MassUnit | null>(null);
  const [inr, setInr] = useState<number | null>(null);
  const [creatinine, setCreatinine] = useState<number | null>(null);
  const [creatinineUnit, setCreatinineUnit] = useState<MassUnit | null>(null);
  const [sodium, setSodium] = useState<number | null>(null);
  const [albumin, setAlbumin] = useState<number | null>(null);
  const [albuminUnit, setAlbuminUnit] = useState<AlbuminUnit | null>(null);
  const [dialysis, setDialysis] = useState<YesNo | null>(null);

  const complete =
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age) &&
    female !== null &&
    positive(bilirubin) &&
    bilirubinUnit !== null &&
    positive(inr) &&
    positive(creatinine) &&
    creatinineUnit !== null &&
    positive(sodium) &&
    positive(albumin) &&
    albuminUnit !== null &&
    dialysis !== null;
  const calc = useCalculation(
    "meld_3",
    complete
      ? {
          registration_age_years: age,
          female_for_adult_meld: female === "yes",
          bilirubin,
          bilirubin_unit: bilirubinUnit,
          inr,
          creatinine,
          creatinine_unit: creatinineUnit,
          sodium_mmol_l: sodium,
          albumin,
          albumin_unit: albuminUnit,
          qualifying_dialysis_in_prior_7_days: dialysis === "yes",
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconFlask}
      title="MELD 3.0"
      badge="Liver transplant candidates"
      description="Current OPTN MELD 3.0 score for candidates registered at age 12 or older (Kim 2021), rounded and constrained to 6-40. Not an official allocation determination: the OPTN system and current policy are authoritative."
      onReset={() => {
        setAge(null);
        setFemale(null);
        setBilirubin(null);
        setBilirubinUnit(null);
        setInr(null);
        setCreatinine(null);
        setCreatinineUnit(null);
        setSodium(null);
        setAlbumin(null);
        setAlbuminUnit(null);
        setDialysis(null);
      }}
      calc={calc}
      incomplete="Complete every field, including each unit, to calculate."
      form={
        <>
          <Text fw={600}>Candidate</Text>
          <Divider />
          <NumberField
            label="Age at registration"
            hint="Completed years when registered for transplant, not current age. Under 12 uses PELD."
            unit="years"
            value={age}
            onChange={setAge}
            min={AGE.min}
            max={AGE.max}
            decimals={0}
          />
          <ChoiceField layout="inline"
            label="OPTN adult female coefficient applies"
            hint="Used only when registered at 18 or older; candidates registered at 12-17 receive the same 1.33 points regardless."
            value={female}
            onChange={setFemale}
            options={YES_NO}
          />

          <Text fw={600} mt="sm">
            Laboratory results
          </Text>
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Total bilirubin"
              hint="Values below 1.0 mg/dL are set to 1.0."
              unit={unitText(bilirubinUnit)}
              value={bilirubin}
              onChange={setBilirubin}
              min={0}
              decimals={1}
            />
            <ChoiceField layout="inline"
              label="Bilirubin unit"
              hint="1 mg/dL = 17.1 µmol/L."
              value={bilirubinUnit}
              onChange={setBilirubinUnit}
              options={MASS_UNITS}
            />
            <NumberField
              label="Creatinine"
              hint="Constrained to 1.0-3.0 mg/dL before the equation."
              unit={unitText(creatinineUnit)}
              value={creatinine}
              onChange={setCreatinine}
              min={0}
              decimals={1}
            />
            <ChoiceField layout="inline"
              label="Creatinine unit"
              hint="1 mg/dL = 88.4 µmol/L."
              value={creatinineUnit}
              onChange={setCreatinineUnit}
              options={MASS_UNITS}
            />
            <NumberField
              label="Albumin"
              hint="Constrained to 1.5-3.5 g/dL (15-35 g/L) before the equation."
              unit={unitText(albuminUnit)}
              value={albumin}
              onChange={setAlbumin}
              min={0}
              decimals={1}
            />
            <ChoiceField layout="inline"
              label="Albumin unit"
              hint="1 g/dL = 10 g/L."
              value={albuminUnit}
              onChange={setAlbuminUnit}
              options={ALBUMIN_UNITS}
            />
            <NumberField
              label="Sodium"
              hint="Constrained to 125-137 mmol/L."
              unit="mmol/L"
              value={sodium}
              onChange={setSodium}
              min={0}
              decimals={1}
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
            label="Qualifying dialysis in the 7 days before the creatinine test"
            hint="At least two dialysis treatments, or at least 24 hours of CVVHD. A single treatment does not qualify. If yes, creatinine is set to 3.0 mg/dL."
            value={dialysis}
            onChange={setDialysis}
            options={YES_NO}
          />
        </>
      }
      result={(r) => <ScoreTile value={fmt(r.result)} badge="OPTN MELD 3.0" />}
      details={(r) => (
        <Facts
          title="Values used in the formula"
          items={[
            ["Bilirubin", `${fmt(r.working.bilirubin_mgdl_used, 2)} mg/dL`],
            ["INR", fmt(r.working.inr_used, 2)],
            ["Creatinine", `${fmt(r.working.creatinine_mgdl_used, 2)} mg/dL`],
            ["Sodium", `${fmt(r.working.sodium_mmol_l_used)} mmol/L`],
            ["Albumin", `${fmt(r.working.albumin_g_dl_used, 2)} g/dL`],
            ["Sex or adolescent term", fmt(r.working.sex_or_adolescent_points, 2)],
            ["Uncapped score", fmt(r.working.rounded_uncapped_policy_score)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `MELD 3.0 score ${fmt(r.result)} (OPTN, constrained to 6-40)`,
          interpretation: r.interpretation,
          findingsTitle: "Inputs",
          findings: [
            `Age at registration ${age} years`,
            age !== null && age >= 18
              ? `Adult female coefficient: ${female === "yes" ? "applies" : "does not apply"}`
              : "Registered at 12-17: adolescent term applies",
            `Bilirubin ${bilirubin} ${unitText(bilirubinUnit)}`,
            `INR ${inr}`,
            `Creatinine ${creatinine} ${unitText(creatinineUnit)}`,
            `Sodium ${sodium} mmol/L`,
            `Albumin ${albumin} ${unitText(albuminUnit)}`,
            dialysis === "yes"
              ? "Qualifying dialysis in the prior 7 days: creatinine set to 3.0 mg/dL"
              : "No qualifying dialysis in the prior 7 days",
          ],
          extra: [typeof r.working.limitations === "string" && r.working.limitations],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "meld_3", Component: Meld3Calculator };
