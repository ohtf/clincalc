// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState, type ReactNode } from "react";
import { Box, Divider, NumberInput, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconHeartRateMonitor } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  YesNoField,
  compact,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** APACHE II severity of disease classification (Knaus 1985). */

type ChronicHealth = "none" | "elective_postoperative" | "nonoperative_or_emergency_postoperative";

const CHRONIC_HEALTH: Choice<ChronicHealth>[] = [
  { value: "none", label: "None (0)" },
  { value: "elective_postoperative", label: "Elective postoperative admission (2)" },
  {
    value: "nonoperative_or_emergency_postoperative",
    label: "Non-operative or emergency postoperative admission (5)",
  },
];

/** Software guardrails only (non-negative quantities, the pH scale), not clinical limits. */
const NON_NEGATIVE = 0;
const PH = { min: 0, max: 14 };
const FIO2 = { min: 0.21, max: 1.0 };
const GCS = { min: 3, max: 15 };
const AGE = { min: 0, max: 120 };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap="sm">
      <div>
        <Text fw={600} size="sm">
          {title}
        </Text>
        <Divider mt={4} />
      </div>
      {children}
    </Stack>
  );
}

function Pao2Field({
  value,
  onChange,
  hint,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  hint: string;
}) {
  return (
    <NumberInput
      label="PaO2"
      description={hint}
      value={value ?? ""}
      onChange={(v) => {
        if (v === "" || v === "-") return onChange(null);
        const n = typeof v === "number" ? v : Number(v);
        onChange(Number.isFinite(n) ? n : null);
      }}
      decimalScale={0}
      allowDecimal={false}
      allowNegative={false}
      clampBehavior="none"
      hideControls
      rightSection={
        <Text size="xs" c="dimmed" pr={8}>
          mmHg
        </Text>
      }
      rightSectionWidth="auto"
      error={value !== null && !(value > 0) ? "Expected more than 0 mmHg" : undefined}
      data-min={0}
    />
  );
}

function Apache2Calculator() {
  const [temperature, setTemperature] = useState<number | null>(null);
  const [map, setMap] = useState<number | null>(null);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [respRate, setRespRate] = useState<number | null>(null);
  const [fio2, setFio2] = useState<number | null>(null);
  const [pao2, setPao2] = useState<number | null>(null);
  const [aaGradient, setAaGradient] = useState<number | null>(null);
  const [ph, setPh] = useState<number | null>(null);
  const [sodium, setSodium] = useState<number | null>(null);
  const [potassium, setPotassium] = useState<number | null>(null);
  const [creatinine, setCreatinine] = useState<number | null>(null);
  const [arf, setArf] = useState(false);
  const [haematocrit, setHaematocrit] = useState<number | null>(null);
  const [wbc, setWbc] = useState<number | null>(null);
  const [gcs, setGcs] = useState<number | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [chronic, setChronic] = useState<ChronicHealth | null>(null);

  const fio2Valid = inRange(fio2, FIO2.min, FIO2.max);
  const usesGradient = fio2Valid && fio2 >= 0.5;
  const usesPao2 = fio2Valid && fio2 < 0.5;
  const oxygenationComplete = usesGradient
    ? inRange(aaGradient, NON_NEGATIVE)
    : usesPao2
      ? pao2 !== null && Number.isFinite(pao2) && pao2 > 0
      : false;

  const complete =
    inRange(temperature, NON_NEGATIVE) &&
    inRange(map, NON_NEGATIVE) &&
    inRange(heartRate, NON_NEGATIVE) &&
    inRange(respRate, NON_NEGATIVE) &&
    fio2Valid &&
    oxygenationComplete &&
    inRange(ph, PH.min, PH.max) &&
    inRange(sodium, NON_NEGATIVE) &&
    inRange(potassium, NON_NEGATIVE) &&
    inRange(creatinine, NON_NEGATIVE) &&
    inRange(haematocrit, NON_NEGATIVE) &&
    inRange(wbc, NON_NEGATIVE) &&
    inRange(gcs, GCS.min, GCS.max) &&
    Number.isInteger(gcs) &&
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age) &&
    chronic !== null;

  const calc = useCalculation(
    "apache2",
    complete
      ? compact({
          temperature_c: temperature,
          mean_arterial_pressure_mm_hg: map,
          heart_rate: heartRate,
          respiratory_rate: respRate,
          fio2,
          pao2_mm_hg: usesPao2 ? pao2 : null,
          aa_gradient_mm_hg: usesGradient ? aaGradient : null,
          arterial_ph: ph,
          sodium_mmol_l: sodium,
          potassium_mmol_l: potassium,
          creatinine_mg_dl: creatinine,
          acute_renal_failure: arf,
          hematocrit_percent: haematocrit,
          wbc_10_9_l: wbc,
          glasgow_coma_scale: gcs,
          age,
          chronic_health_status: chronic,
        })
      : null,
  );

  return (
    <CalculatorPage
      icon={IconHeartRateMonitor}
      title="APACHE II"
      badge="ICU severity"
      description="Acute Physiology and Chronic Health Evaluation II: acute physiology, age, and chronic health points from the worst values in the first 24 hours in intensive care (Knaus 1985). Mortality prediction also needs the diagnostic category and is not given here."
      onReset={() => {
        setTemperature(null);
        setMap(null);
        setHeartRate(null);
        setRespRate(null);
        setFio2(null);
        setPao2(null);
        setAaGradient(null);
        setPh(null);
        setSodium(null);
        setPotassium(null);
        setCreatinine(null);
        setArf(false);
        setHaematocrit(null);
        setWbc(null);
        setGcs(null);
        setAge(null);
        setChronic(null);
      }}
      formTitle="Worst values in the first 24 hours"
      calc={calc}
      incomplete="Enter every physiological value, age, and chronic health status to calculate."
      form={
        <Stack gap="md">
          <Section title="Bedside observations">
            <SimpleGrid cols={2} spacing="md">
              <NumberField
                label="Temperature (core)"
                hint="0 points at 36.0-38.4."
                unit="°C"
                value={temperature}
                onChange={setTemperature}
                min={NON_NEGATIVE}
                decimals={1}
              />
              <NumberField
                label="Mean arterial pressure"
                hint="0 points at 70-109."
                unit="mmHg"
                value={map}
                onChange={setMap}
                min={NON_NEGATIVE}
                decimals={0}
              />
              <NumberField
                label="Heart rate"
                hint="0 points at 70-109."
                unit="/min"
                value={heartRate}
                onChange={setHeartRate}
                min={NON_NEGATIVE}
                decimals={0}
              />
              <NumberField
                label="Respiratory rate"
                hint="0 points at 12-24."
                unit="/min"
                value={respRate}
                onChange={setRespRate}
                min={NON_NEGATIVE}
                decimals={0}
              />
              <NumberField
                label="Glasgow Coma Scale"
                hint="Scores 15 minus the GCS."
                value={gcs}
                onChange={setGcs}
                min={GCS.min}
                max={GCS.max}
                decimals={0}
              />
            </SimpleGrid>
          </Section>

          <Section title="Oxygenation">
            <SimpleGrid cols={2} spacing="md">
              <NumberField
                label="FiO2"
                hint="As a fraction. 0.5 or more scores the A-a gradient; under 0.5 scores the PaO2."
                value={fio2}
                onChange={setFio2}
                min={FIO2.min}
                max={FIO2.max}
                decimals={2}
              />
              <div />
              <Box style={{ opacity: usesGradient ? 0.45 : 1 }}>
                <Pao2Field
                  value={pao2}
                  onChange={setPao2}
                  hint={
                    usesGradient
                      ? "Not used: FiO2 is 0.5 or more."
                      : "Used when FiO2 is under 0.5. Over 70 scores 0."
                  }
                />
              </Box>
              <Box style={{ opacity: usesPao2 ? 0.45 : 1 }}>
                <NumberField
                  label="A-a gradient"
                  hint={
                    usesPao2
                      ? "Not used: FiO2 is under 0.5."
                      : "Used when FiO2 is 0.5 or more. Under 200 scores 0."
                  }
                  unit="mmHg"
                  value={aaGradient}
                  onChange={setAaGradient}
                  min={NON_NEGATIVE}
                  decimals={0}
                />
              </Box>
            </SimpleGrid>
          </Section>

          <Section title="Blood results">
            <SimpleGrid cols={2} spacing="md">
              <NumberField
                label="Arterial pH"
                hint="0 points at 7.33-7.49."
                value={ph}
                onChange={setPh}
                min={PH.min}
                max={PH.max}
                decimals={2}
              />
              <NumberField
                label="Sodium"
                hint="0 points at 130-149."
                unit="mmol/L"
                value={sodium}
                onChange={setSodium}
                min={NON_NEGATIVE}
                decimals={0}
              />
              <NumberField
                label="Potassium"
                hint="0 points at 3.5-5.4."
                unit="mmol/L"
                value={potassium}
                onChange={setPotassium}
                min={NON_NEGATIVE}
                decimals={1}
              />
              <NumberField
                label="Creatinine"
                hint="0 points at 0.6-1.4. From µmol/L, divide by 88.4."
                unit="mg/dL"
                value={creatinine}
                onChange={setCreatinine}
                min={NON_NEGATIVE}
                decimals={2}
              />
              <NumberField
                label="Haematocrit"
                hint="0 points at 30-45.9."
                unit="%"
                value={haematocrit}
                onChange={setHaematocrit}
                min={NON_NEGATIVE}
                decimals={1}
              />
              <NumberField
                label="White cell count"
                hint="0 points at 3-14.9."
                unit="x10⁹/L"
                value={wbc}
                onChange={setWbc}
                min={NON_NEGATIVE}
                decimals={1}
              />
            </SimpleGrid>
            <YesNoField
              label="Acute renal failure"
              hint="Doubles the creatinine points."
              checked={arf}
              onChange={setArf}
            />
          </Section>

          <Section title="Age and chronic health">
            <SimpleGrid cols={2} spacing="md">
              <NumberField
                label="Age"
                hint="44 or under 0; 45-54 2; 55-64 3; 65-74 5; 75 or over 6."
                unit="years"
                value={age}
                onChange={setAge}
                min={AGE.min}
                max={AGE.max}
                decimals={0}
              />
            </SimpleGrid>
            <ChoiceField
              label="Chronic health status"
              hint="Points apply only with a history of severe organ insufficiency or immunocompromise; otherwise choose none."
              value={chronic}
              onChange={setChronic}
              options={CHRONIC_HEALTH}
            />
          </Section>
        </Stack>
      }
      result={(r) => <ScoreTile value={fmt(r.result)} outOf={71} />}
      details={(r) => (
        <Facts
          title="Components"
          items={[
            ["Acute physiology", fmt(r.working.acute_physiology_score)],
            ["Age", fmt(r.working.age_points)],
            ["Chronic health", fmt(r.working.chronic_health_points)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `APACHE II ${fmt(r.result)} (acute physiology ${fmt(r.working.acute_physiology_score)}, age ${fmt(r.working.age_points)}, chronic health ${fmt(r.working.chronic_health_points)})`,
          interpretation: r.interpretation,
          findingsTitle: "Worst values in the first 24 hours",
          findings: [
            `Temperature ${fmt(temperature)} °C`,
            `Mean arterial pressure ${fmt(map)} mmHg`,
            `Heart rate ${fmt(heartRate)}/min`,
            `Respiratory rate ${fmt(respRate)}/min`,
            `FiO2 ${fmt(fio2, 2)}`,
            usesPao2 && `PaO2 ${fmt(pao2)} mmHg`,
            usesGradient && `A-a gradient ${fmt(aaGradient)} mmHg`,
            `Arterial pH ${fmt(ph, 2)}`,
            `Sodium ${fmt(sodium)} mmol/L`,
            `Potassium ${fmt(potassium)} mmol/L`,
            `Creatinine ${fmt(creatinine, 2)} mg/dL${arf ? " with acute renal failure" : ""}`,
            `Haematocrit ${fmt(haematocrit)}%`,
            `White cell count ${fmt(wbc)} x10⁹/L`,
            `GCS ${gcs}`,
            `Age ${age} years`,
            `Chronic health: ${CHRONIC_HEALTH.find((c) => c.value === chronic)?.label ?? ""}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "apache2", Component: Apache2Calculator };
