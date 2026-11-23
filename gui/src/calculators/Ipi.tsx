// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconChartDots3 } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  YesNoField,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** International Prognostic Index for aggressive non-Hodgkin lymphoma (NEJM 1993). */

type Confirmed = "yes" | "no";
type Stage = "1" | "2" | "3" | "4";
type Ecog = "0" | "1" | "2" | "3" | "4";

const CONFIRMED: Choice<Confirmed>[] = [
  {
    value: "yes",
    label: "Yes - established aggressive NHL, factors assessed before treatment",
    hint: "Intermediate- or high-grade non-Hodgkin lymphoma, with all factors recorded at diagnosis.",
  },
  {
    value: "no",
    label: "No, or not applicable",
    hint: "Suspected lymphoma not yet diagnosed, indolent lymphoma, or factors recorded after treatment started.",
  },
];

const STAGES: Choice<Stage>[] = [
  { value: "1", label: "Stage I (0)" },
  { value: "2", label: "Stage II (0)" },
  { value: "3", label: "Stage III (1)" },
  { value: "4", label: "Stage IV (1)" },
];

const ECOG: Choice<Ecog>[] = [
  { value: "0", label: "0 (0)" },
  { value: "1", label: "1 (0)" },
  { value: "2", label: "2 - ambulatory but unable to work (1)" },
  { value: "3", label: "3 (1)" },
  { value: "4", label: "4 (1)" },
];

const AGE = { min: 18, max: 120 };
const SITES = { min: 0, max: 50 };

const RISK_LABEL: Record<string, string> = {
  low: "Low risk",
  low_intermediate: "Low-intermediate risk",
  high_intermediate: "High-intermediate risk",
  high: "High risk",
};
const RISK_COLOUR: Record<string, string> = {
  low: "teal",
  low_intermediate: "yellow",
  high_intermediate: "orange",
  high: "red",
};

const point = (v: unknown) => (v === true ? "1" : "0");

function IpiCalculator() {
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [sites, setSites] = useState<number | null>(null);
  const [ecog, setEcog] = useState<Ecog | null>(null);
  const [ldh, setLdh] = useState(false);

  const complete =
    confirmed === "yes" &&
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age) &&
    stage !== null &&
    inRange(sites, SITES.min, SITES.max) &&
    Number.isInteger(sites) &&
    ecog !== null;
  const calc = useCalculation(
    "ipi",
    complete
      ? {
          aggressive_nhl_before_treatment_confirmed: true,
          age_years: age,
          ann_arbor_stage: Number(stage),
          extranodal_sites: sites,
          ecog_performance_status: Number(ecog),
          ldh_above_upper_limit_of_normal: ldh,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconChartDots3}
      title="International Prognostic Index"
      badge="Aggressive non-Hodgkin lymphoma"
      description="Five pre-treatment factors, one point each, grouped into the original four risk groups (International NHL Prognostic Factors Project, NEJM 1993). Survival figures are from the pre-rituximab derivation cohort."
      onReset={() => {
        setConfirmed(null);
        setAge(null);
        setStage(null);
        setSites(null);
        setEcog(null);
        setLdh(false);
      }}
      calc={calc}
      incomplete={
        confirmed === "no"
          ? "The IPI applies only to established aggressive non-Hodgkin lymphoma assessed before treatment."
          : "Confirm applicability and answer every factor to calculate."
      }
      form={
        <>
          <ChoiceField
            label="Applicability"
            hint="The IPI is not a diagnostic test."
            value={confirmed}
            onChange={setConfirmed}
            options={CONFIRMED}
          />
          <Text fw={600} size="sm" mt="xs">
            Factors at diagnosis
          </Text>
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Age at diagnosis"
              hint="Over 60 scores 1; exactly 60 scores 0."
              unit="years"
              value={age}
              onChange={setAge}
              min={AGE.min}
              max={AGE.max}
              decimals={0}
            />
            <NumberField
              label="Extranodal sites"
              hint="More than 1 scores 1; one site scores 0."
              unit="sites"
              value={sites}
              onChange={setSites}
              min={SITES.min}
              max={SITES.max}
              decimals={0}
            />
          </SimpleGrid>
          <ChoiceField
            label="Ann Arbor stage"
            hint="Stage number only; A/B and bulk suffixes do not affect the IPI."
            value={stage}
            onChange={setStage}
            options={STAGES}
          />
          <ChoiceField
            label="ECOG performance status"
            hint="2 or more scores 1."
            value={ecog}
            onChange={setEcog}
            options={ECOG}
          />
          <YesNoField
            label="Serum LDH above the upper limit of normal (1)"
            hint="Use the reporting laboratory's own range; a value equal to the upper limit is not raised."
            checked={ldh}
            onChange={setLdh}
          />
        </>
      }
      result={(r) => {
        const group = asText(r.working.risk_group);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={5}
            colour={RISK_COLOUR[group] ?? "teal"}
            badge={RISK_LABEL[group] ?? group}
          />
        );
      }}
      details={(r) => (
        <Facts
          title="Points"
          items={[
            ["Age over 60", point(r.working.age_over_60)],
            ["Stage III or IV", point(r.working.stage_iii_or_iv)],
            ["More than 1 extranodal site", point(r.working.more_than_one_extranodal_site)],
            ["ECOG 2 or more", point(r.working.performance_status_2_or_more)],
            ["LDH raised", point(r.working.ldh_above_upper_limit_of_normal)],
          ]}
        />
      )}
      summary={(r) => {
        const group = asText(r.working.risk_group);
        return summaryText({
          heading: `IPI ${fmt(r.result)} / 5 (${(RISK_LABEL[group] ?? group).toLowerCase()})`,
          interpretation: r.interpretation,
          findingsTitle: "Factors at diagnosis",
          findings: [
            "Established aggressive non-Hodgkin lymphoma, assessed before treatment",
            `Age ${age} years`,
            `Ann Arbor stage ${["I", "II", "III", "IV"][Number(stage) - 1]}`,
            `Extranodal sites: ${sites}`,
            `ECOG performance status ${ecog}`,
            ldh
              ? "Serum LDH above the upper limit of normal"
              : "Serum LDH not above the upper limit of normal",
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "ipi", Component: IpiCalculator };
