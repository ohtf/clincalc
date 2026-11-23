// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconFlask } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  compact,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** Serum anion gap (Emmett & Narins 1977) with optional albumin correction (Figge 1998). */

const SODIUM = { min: 80, max: 220 };
const CHLORIDE = { min: 50, max: 160 };
const BICARBONATE = { min: 1, max: 60 };
const POTASSIUM = { min: 1, max: 10 };
const ALBUMIN = { min: 5, max: 70 };

function AnionGapCalculator() {
  const [sodium, setSodium] = useState<number | null>(null);
  const [chloride, setChloride] = useState<number | null>(null);
  const [bicarbonate, setBicarbonate] = useState<number | null>(null);
  const [potassium, setPotassium] = useState<number | null>(null);
  const [albumin, setAlbumin] = useState<number | null>(null);

  const optionalOk =
    (potassium === null || inRange(potassium, POTASSIUM.min, POTASSIUM.max)) &&
    (albumin === null || inRange(albumin, ALBUMIN.min, ALBUMIN.max));
  const complete =
    inRange(sodium, SODIUM.min, SODIUM.max) &&
    inRange(chloride, CHLORIDE.min, CHLORIDE.max) &&
    inRange(bicarbonate, BICARBONATE.min, BICARBONATE.max) &&
    optionalOk;
  const calc = useCalculation(
    "anion_gap",
    complete
      ? compact({
          sodium_mmol_l: sodium,
          chloride_mmol_l: chloride,
          bicarbonate_mmol_l: bicarbonate,
          potassium_mmol_l: potassium,
          albumin_g_l: albumin,
        })
      : null,
  );

  return (
    <CalculatorPage
      icon={IconFlask}
      title="Anion gap"
      badge="Acid-base"
      description="Serum anion gap from sodium, chloride, and bicarbonate (Emmett and Narins 1977), with optional potassium and an optional albumin correction to 40 g/L (Figge 1998). Local reference intervals vary."
      onReset={() => {
        setSodium(null);
        setChloride(null);
        setBicarbonate(null);
        setPotassium(null);
        setAlbumin(null);
      }}
      calc={calc}
      incomplete="Enter sodium, chloride, and bicarbonate to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Sodium"
              unit="mmol/L"
              value={sodium}
              onChange={setSodium}
              min={SODIUM.min}
              max={SODIUM.max}
            />
            <NumberField
              label="Chloride"
              unit="mmol/L"
              value={chloride}
              onChange={setChloride}
              min={CHLORIDE.min}
              max={CHLORIDE.max}
            />
            <NumberField
              label="Bicarbonate"
              unit="mmol/L"
              value={bicarbonate}
              onChange={setBicarbonate}
              min={BICARBONATE.min}
              max={BICARBONATE.max}
            />
          </SimpleGrid>
          <Text fw={600} size="sm" mt="xs">
            Optional
          </Text>
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Potassium"
              hint="Optional. Leave empty to exclude potassium; many reference ranges omit it."
              unit="mmol/L"
              value={potassium}
              onChange={setPotassium}
              min={POTASSIUM.min}
              max={POTASSIUM.max}
            />
            <NumberField
              label="Albumin"
              hint="Optional. Adds about 0.25 mmol/L per 1 g/L below 40 g/L."
              unit="g/L"
              value={albumin}
              onChange={setAlbumin}
              min={ALBUMIN.min}
              max={ALBUMIN.max}
            />
          </SimpleGrid>
        </>
      }
      result={(r) => (
        <ScoreTile
          value={fmt(r.result)}
          unit="mmol/L"
          badge={
            r.working.albumin_corrected_anion_gap_mmol_l !== undefined
              ? "Albumin-corrected"
              : "Anion gap"
          }
        />
      )}
      details={(r) => (
        <Facts
          items={[
            ["Anion gap", `${fmt(r.working.anion_gap_mmol_l)} mmol/L`],
            r.working.albumin_corrected_anion_gap_mmol_l !== undefined && [
              "Albumin-corrected",
              `${fmt(r.working.albumin_corrected_anion_gap_mmol_l)} mmol/L`,
            ],
            ["Potassium included", r.working.includes_potassium ? "yes" : "no"],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading:
            r.working.albumin_corrected_anion_gap_mmol_l !== undefined
              ? `Albumin-corrected anion gap ${fmt(r.result)} mmol/L (uncorrected ${fmt(r.working.anion_gap_mmol_l)} mmol/L)`
              : `Anion gap ${fmt(r.result)} mmol/L${r.working.includes_potassium ? " (including potassium)" : ""}`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [
            `Sodium ${sodium} mmol/L`,
            potassium !== null && `Potassium ${potassium} mmol/L`,
            `Chloride ${chloride} mmol/L`,
            `Bicarbonate ${bicarbonate} mmol/L`,
            albumin !== null && `Albumin ${albumin} g/L`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "anion_gap", Component: AnionGapCalculator };
