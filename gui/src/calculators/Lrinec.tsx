// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, NumberInput, SimpleGrid, Text } from "@mantine/core";
import { IconBandage } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** LRINEC score for necrotising fasciitis (Wong 2004; Fernando 2019). */

type Suspected = "yes" | "no";

const SUSPECTED: Choice<Suspected>[] = [
  { value: "yes", label: "Yes - severe soft-tissue infection is suspected" },
  { value: "no", label: "No" },
];

/** A value that must be strictly greater than zero (the schema's exclusiveMinimum). */
function PositiveField({
  label,
  hint,
  unit,
  value,
  onChange,
  decimals,
}: {
  label: string;
  hint: string;
  unit: string;
  value: number | null;
  onChange: (value: number | null) => void;
  decimals: number;
}) {
  return (
    <NumberInput
      label={label}
      description={hint}
      value={value ?? ""}
      onChange={(v) => {
        if (v === "" || v === "-") return onChange(null);
        const n = typeof v === "number" ? v : Number(v);
        onChange(Number.isFinite(n) ? n : null);
      }}
      decimalScale={decimals}
      allowNegative={false}
      clampBehavior="none"
      hideControls
      rightSection={
        <Text size="xs" c="dimmed" pr={8} style={{ whiteSpace: "nowrap" }}>
          {unit}
        </Text>
      }
      rightSectionWidth="auto"
      error={value !== null && !(value > 0) ? `Expected more than 0 ${unit}` : undefined}
      data-min={0}
    />
  );
}

const positive = (v: number | null): v is number => v !== null && Number.isFinite(v) && v > 0;

const BAND_COLOUR: Record<string, string> = { low: "teal", intermediate: "yellow", high: "red" };

function LrinecCalculator() {
  const [suspected, setSuspected] = useState<Suspected | null>(null);
  const [crp, setCrp] = useState<number | null>(null);
  const [wbc, setWbc] = useState<number | null>(null);
  const [hb, setHb] = useState<number | null>(null);
  const [sodium, setSodium] = useState<number | null>(null);
  const [creatinine, setCreatinine] = useState<number | null>(null);
  const [glucose, setGlucose] = useState<number | null>(null);

  const complete =
    suspected === "yes" &&
    inRange(crp, 0) &&
    inRange(wbc, 0) &&
    positive(hb) &&
    positive(sodium) &&
    positive(creatinine) &&
    positive(glucose);
  const calc = useCalculation(
    "lrinec",
    complete
      ? {
          severe_soft_tissue_infection_suspected: true,
          crp_mg_l: crp,
          wbc_x10_9_l: wbc,
          haemoglobin_g_dl: hb,
          sodium_mmol_l: sodium,
          creatinine_umol_l: creatinine,
          glucose_mmol_l: glucose,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconBandage}
      title="LRINEC"
      badge="Necrotising soft-tissue infection"
      description="Laboratory Risk Indicator for Necrotising Fasciitis: six routine blood tests scored 0-13 as a diagnostic adjunct in suspected severe soft-tissue infection (Wong 2004). Not a rule-out test (Fernando 2019); clinical concern warrants early surgical consultation."
      onReset={() => {
        setSuspected(null);
        setCrp(null);
        setWbc(null);
        setHb(null);
        setSodium(null);
        setCreatinine(null);
        setGlucose(null);
      }}
      calc={calc}
      incomplete={
        suspected === "no"
          ? "LRINEC is intended only when severe soft-tissue infection is suspected; it was not derived for indiscriminate screening."
          : "Confirm the clinical context and enter all six results to calculate."
      }
      form={
        <>
          <ChoiceField
            label="Is severe soft-tissue infection suspected?"
            value={suspected}
            onChange={setSuspected}
            options={SUSPECTED}
          />
          <Divider />
          <Text size="xs" c="dimmed">
            Initial-evaluation results, in the units shown. Convert US units (creatinine, glucose in mg/dL) first.
          </Text>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="C-reactive protein"
              hint="150 or more scores 4."
              unit="mg/L"
              value={crp}
              onChange={setCrp}
              min={0}
              decimals={1}
            />
            <NumberField
              label="White cell count"
              hint="Under 15 scores 0; 15-25 scores 1; over 25 scores 2."
              unit="x10⁹/L"
              value={wbc}
              onChange={setWbc}
              min={0}
              decimals={1}
            />
            <PositiveField
              label="Haemoglobin"
              hint="Over 13.5 scores 0; 11-13.5 scores 1; under 11 scores 2."
              unit="g/dL"
              value={hb}
              onChange={setHb}
              decimals={1}
            />
            <PositiveField
              label="Sodium"
              hint="Under 135 scores 2."
              unit="mmol/L"
              value={sodium}
              onChange={setSodium}
              decimals={0}
            />
            <PositiveField
              label="Creatinine"
              hint="Over 141 scores 2."
              unit="µmol/L"
              value={creatinine}
              onChange={setCreatinine}
              decimals={0}
            />
            <PositiveField
              label="Glucose"
              hint="Over 10 scores 1."
              unit="mmol/L"
              value={glucose}
              onChange={setGlucose}
              decimals={1}
            />
          </SimpleGrid>
        </>
      }
      result={(r) => {
        const band = asText(r.working.original_study_risk_category);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={13}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={band && `${band} (original study)`}
          />
        );
      }}
      details={(r) => (
        <Facts
          title="Points"
          items={[
            ["CRP", fmt(r.working.crp_points)],
            ["WCC", fmt(r.working.wbc_points)],
            ["Haemoglobin", fmt(r.working.haemoglobin_points)],
            ["Sodium", fmt(r.working.sodium_points)],
            ["Creatinine", fmt(r.working.creatinine_points)],
            ["Glucose", fmt(r.working.glucose_points)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `LRINEC ${fmt(r.result)} / 13 (${asText(r.working.original_study_risk_category)} original-study risk category)`,
          interpretation: r.interpretation,
          findingsTitle: "Initial results",
          findings: [
            `CRP ${fmt(crp)} mg/L (${fmt(r.working.crp_points)})`,
            `White cell count ${fmt(wbc)} x10⁹/L (${fmt(r.working.wbc_points)})`,
            `Haemoglobin ${fmt(hb)} g/dL (${fmt(r.working.haemoglobin_points)})`,
            `Sodium ${fmt(sodium)} mmol/L (${fmt(r.working.sodium_points)})`,
            `Creatinine ${fmt(creatinine)} µmol/L (${fmt(r.working.creatinine_points)})`,
            `Glucose ${fmt(glucose)} mmol/L (${fmt(r.working.glucose_points)})`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "lrinec", Component: LrinecCalculator };
