// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, Stack, Text } from "@mantine/core";
import { IconBodyScan } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  ScoreTile,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Psoriasis Area and Severity Index, standard clinician-assessed PASI (Fredriksson 1978). */

type Confirmed = "yes" | "no";
type Area = "0" | "1" | "2" | "3" | "4" | "5" | "6";
type Grade = "0" | "1" | "2" | "3" | "4";
type Intensity = "erythema" | "induration" | "desquamation";
type RegionKey = "head_and_neck" | "upper_limbs" | "trunk" | "lower_limbs";
type Region = { area: Area | null } & Record<Intensity, Grade | null>;

const CONFIRMED: Choice<Confirmed>[] = [
  {
    value: "yes",
    label: "Yes - clinician-assessed plaque psoriasis, all four regions examined",
  },
  {
    value: "no",
    label: "No, or not applicable",
    hint: "Diagnosis, patient self-assessment, a partial examination, or PASI-HD and other variants.",
  },
];

const REGIONS: Array<{ key: RegionKey; label: string; weight: string; anatomy: string }> = [
  { key: "head_and_neck", label: "Head and neck", weight: "0.1", anatomy: "Include the neck." },
  { key: "upper_limbs", label: "Upper limbs", weight: "0.2", anatomy: "Include the palms." },
  {
    key: "trunk",
    label: "Trunk",
    weight: "0.3",
    anatomy:
      "Include the axillae and genital area; the inguinal boundary separates trunk from lower limbs.",
  },
  {
    key: "lower_limbs",
    label: "Lower limbs",
    weight: "0.4",
    anatomy:
      "Include the buttocks and soles; the inguinal boundary separates lower limbs from trunk.",
  },
];

const AREA: Choice<Area>[] = (["0", "1", "2", "3", "4", "5", "6"] as const).map((a) => ({
  value: a,
  label: a,
}));

const AREA_TEXT: Record<Area, string> = {
  "0": "none",
  "1": "more than 0% but less than 10%",
  "2": "10-29%",
  "3": "30-49%",
  "4": "50-69%",
  "5": "70-89%",
  "6": "90-100%",
};

const GRADES: Choice<Grade>[] = (["0", "1", "2", "3", "4"] as const).map((g) => ({
  value: g,
  label: g,
}));

const INTENSITIES: Array<{ key: Intensity; label: string }> = [
  { key: "erythema", label: "Erythema" },
  { key: "induration", label: "Induration (thickness)" },
  { key: "desquamation", label: "Desquamation (scaling)" },
];

const emptyRegion = (): Region => ({
  area: null,
  erythema: null,
  induration: null,
  desquamation: null,
});
const emptyRegions = (): Record<RegionKey, Region> => ({
  head_and_neck: emptyRegion(),
  upper_limbs: emptyRegion(),
  trunk: emptyRegion(),
  lower_limbs: emptyRegion(),
});

const answered = (r: Region) => INTENSITIES.every((i) => r[i.key] !== null) && r.area !== null;
const intensitySum = (r: Region) => INTENSITIES.reduce((s, i) => s + Number(r[i.key] ?? 0), 0);
const consistent = (r: Region) => (r.area === "0") === (intensitySum(r) === 0);

/** A horizontal row of radio options for a short scale that must start unselected. */

function RegionSection({
  label,
  weight,
  anatomy,
  region,
  onChange,
}: {
  label: string;
  weight: string;
  anatomy: string;
  region: Region;
  onChange: (region: Region) => void;
}) {
  const setArea = (area: Area) => {
    if (area === "0") onChange({ area, erythema: "0", induration: "0", desquamation: "0" });
    else if (region.area === "0" || region.area === null) onChange({ ...emptyRegion(), area });
    else onChange({ ...region, area });
  };
  return (
    <Stack gap="sm">
      <div>
        <Text fw={600} size="sm" mt="xs">
          {label} (weight {weight})
        </Text>
        <Text size="xs" c="dimmed">
          {anatomy}
        </Text>
      </div>
      <Divider />
      <ChoiceField layout="inline"
        label="Area grade"
        hint="Proportion of this region affected: 0 = none, 1 = more than 0% but less than 10%, 2 = 10-29%, 3 = 30-49%, 4 = 50-69%, 5 = 70-89%, 6 = 90-100%."
        value={region.area}
        onChange={setArea}
        options={AREA}
      />
      {INTENSITIES.map((i) => (
        <ChoiceField layout="inline"
          key={i.key}
          label={i.label}
          value={region[i.key]}
          onChange={(v) => onChange({ ...region, [i.key]: v })}
          options={GRADES}
        />
      ))}
      {answered(region) && !consistent(region) && (
        <Text size="xs" c="red">
          {region.area === "0"
            ? "With no affected area, all three severity grades must be 0."
            : "With an affected area, at least one severity grade must be 1 or more."}
        </Text>
      )}
    </Stack>
  );
}

function PasiCalculator() {
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);
  const [regions, setRegions] = useState<Record<RegionKey, Region>>(emptyRegions);

  const all = REGIONS.map((r) => regions[r.key]);
  const complete = confirmed === "yes" && all.every((r) => answered(r) && consistent(r));
  const toInput = (r: Region) => ({
    area_grade: Number(r.area),
    erythema: Number(r.erythema),
    induration: Number(r.induration),
    desquamation: Number(r.desquamation),
  });
  const calc = useCalculation(
    "pasi",
    complete
      ? {
          assessment_context: "clinician_assessed_plaque_psoriasis",
          head_and_neck: toInput(regions.head_and_neck),
          upper_limbs: toInput(regions.upper_limbs),
          trunk: toInput(regions.trunk),
          lower_limbs: toInput(regions.lower_limbs),
        }
      : null,
  );

  const regionScore = (w: Record<string, unknown>, key: RegionKey) => {
    const region = w[key] as Record<string, unknown> | undefined;
    return fmt(region?.weighted_score);
  };

  return (
    <CalculatorPage
      icon={IconBodyScan}
      title="PASI"
      badge="Plaque psoriasis"
      description="Standard clinician-assessed Psoriasis Area and Severity Index (0-72): for each of four regions, the area grade times the sum of erythema, induration, and desquamation, weighted by region (Fredriksson 1978). Does not diagnose psoriasis, calculate PASI 75/90/100, or determine treatment."
      onReset={() => {
        setConfirmed(null);
        setRegions(emptyRegions());
      }}
      calc={calc}
      incomplete={
        confirmed === "no"
          ? "PASI here applies only to a clinician's standard assessment of plaque psoriasis across all four regions."
          : "Confirm the assessment context and grade every region to calculate."
      }
      form={
        <>
          <ChoiceField
            label="Assessment context"
            hint="A clinician trained in PASI is assessing plaque psoriasis and can assess all four regions."
            value={confirmed}
            onChange={setConfirmed}
            options={CONFIRMED}
          />
          <Text size="xs" c="dimmed">
            Severity grades are the average across all plaques in the region, not the worst plaque:
            0 = absent, 1 = slight, 2 = moderate, 3 = severe, 4 = very severe. Choosing an area of 0
            sets the region's severity grades to 0.
          </Text>
          {REGIONS.map((r) => (
            <RegionSection
              key={r.key}
              label={r.label}
              weight={r.weight}
              anatomy={r.anatomy}
              region={regions[r.key]}
              onChange={(region) => setRegions((prev) => ({ ...prev, [r.key]: region }))}
            />
          ))}
        </>
      }
      result={(r) => <ScoreTile value={fmt(r.result)} outOf={72} />}
      details={(r) => (
        <Facts
          title="Weighted region scores"
          items={REGIONS.map((region) => [region.label, regionScore(r.working, region.key)])}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `PASI ${fmt(r.result)} / 72`,
          interpretation: r.interpretation,
          findingsTitle: "Regions (area grade; erythema, induration, desquamation)",
          findings: REGIONS.map((region) => {
            const g = regions[region.key];
            return g.area === "0"
              ? `${region.label}: not affected`
              : `${region.label}: area ${g.area} (${AREA_TEXT[g.area as Area]}); E${g.erythema} I${g.induration} D${g.desquamation}; weighted ${regionScore(r.working, region.key)}`;
          }),
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "pasi", Component: PasiCalculator };
