// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconMicroscope } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Light's criteria for pleural effusion (Light et al., Ann Intern Med 1972). */

type ProteinUnit = "g/L" | "g/dL";

const PROTEIN_UNITS: Choice<ProteinUnit>[] = [
  { value: "g/L", label: "g/L" },
  { value: "g/dL", label: "g/dL" },
];

const CRITERIA = [
  { key: "protein_ratio_criterion", label: "Pleural/serum protein ratio above 0.5" },
  { key: "ldh_ratio_criterion", label: "Pleural/serum LDH ratio above 0.6" },
  {
    key: "ldh_absolute_criterion",
    label: "Pleural LDH above two-thirds of the upper limit of normal for serum LDH",
  },
] as const;

const positive = (v: number | null): v is number => inRange(v, 0) && v > 0;

function LightsCriteriaCalculator() {
  const [proteinUnit, setProteinUnit] = useState<ProteinUnit | null>(null);
  const [pleuralProtein, setPleuralProtein] = useState<number | null>(null);
  const [serumProtein, setSerumProtein] = useState<number | null>(null);
  const [pleuralLdh, setPleuralLdh] = useState<number | null>(null);
  const [serumLdh, setSerumLdh] = useState<number | null>(null);
  const [ldhUln, setLdhUln] = useState<number | null>(null);

  const complete =
    proteinUnit !== null &&
    positive(pleuralProtein) &&
    positive(serumProtein) &&
    positive(pleuralLdh) &&
    positive(serumLdh) &&
    positive(ldhUln);
  const calc = useCalculation(
    "lights_criteria",
    complete
      ? {
          pleural_fluid_protein: pleuralProtein,
          serum_protein: serumProtein,
          pleural_fluid_ldh_iu_l: pleuralLdh,
          serum_ldh_iu_l: serumLdh,
          serum_ldh_upper_limit_of_normal_iu_l: ldhUln,
        }
      : null,
  );

  const pu = proteinUnit ?? undefined;

  return (
    <CalculatorPage
      icon={IconMicroscope}
      title="Light's criteria"
      badge="Pleural effusion"
      description="Classifies a pleural effusion as an exudate if any one of three protein and LDH criteria is met, otherwise a transudate (Light 1972). Needs paired pleural fluid and serum samples and the local laboratory's upper limit of normal for serum LDH."
      onReset={() => {
        setProteinUnit(null);
        setPleuralProtein(null);
        setSerumProtein(null);
        setPleuralLdh(null);
        setSerumLdh(null);
        setLdhUln(null);
      }}
      calc={calc}
      incomplete="Enter all five laboratory values to classify."
      form={
        <>
          <Text fw={600}>Total protein</Text>
          <Divider />
          <ChoiceField
            label="Protein unit"
            hint="Enter pleural fluid and serum protein in the same unit; only their ratio is used."
            value={proteinUnit}
            onChange={setProteinUnit}
            options={PROTEIN_UNITS}
          />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Pleural fluid protein"
              unit={pu}
              value={pleuralProtein}
              onChange={setPleuralProtein}
              min={0}
              decimals={1}
            />
            <NumberField
              label="Serum protein"
              unit={pu}
              value={serumProtein}
              onChange={setSerumProtein}
              min={0}
              decimals={1}
            />
          </SimpleGrid>
          <Text fw={600} mt="xs">
            LDH
          </Text>
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Pleural fluid LDH"
              unit="IU/L"
              value={pleuralLdh}
              onChange={setPleuralLdh}
              min={0}
              decimals={0}
            />
            <NumberField
              label="Serum LDH"
              unit="IU/L"
              value={serumLdh}
              onChange={setSerumLdh}
              min={0}
              decimals={0}
            />
          </SimpleGrid>
          <NumberField
            label="Upper limit of normal for serum LDH"
            hint="Laboratory-specific: use your local laboratory's reference range."
            unit="IU/L"
            value={ldhUln}
            onChange={setLdhUln}
            min={0}
            decimals={0}
          />
        </>
      }
      result={(r) => {
        const exudate = String(r.result) === "true";
        return (
          <ScoreTile
            value={exudate ? "Exudate" : "Transudate"}
            badge={`${CRITERIA.filter((c) => r.working[c.key] === true).length} of 3 criteria met`}
          />
        );
      }}
      details={(r) => (
        <Facts
          items={[
            ["Protein ratio", fmt(r.working.protein_ratio, 2)],
            ["LDH ratio", fmt(r.working.ldh_ratio, 2)],
            ...CRITERIA.map(
              (c) => [c.label, r.working[c.key] === true ? "met" : "not met"] as [string, string],
            ),
          ]}
        />
      )}
      summary={(r) => {
        const met = CRITERIA.filter((c) => r.working[c.key] === true);
        return summaryText({
          heading: `Light's criteria: ${String(r.result) === "true" ? "exudate" : "transudate"} (${met.length} of 3 criteria met)`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [
            `Pleural fluid protein ${pleuralProtein} ${proteinUnit}, serum protein ${serumProtein} ${proteinUnit} (ratio ${fmt(r.working.protein_ratio, 2)})`,
            `Pleural fluid LDH ${pleuralLdh} IU/L, serum LDH ${serumLdh} IU/L (ratio ${fmt(r.working.ldh_ratio, 2)})`,
            `Serum LDH upper limit of normal ${ldhUln} IU/L`,
          ],
          extra: [met.length > 0 && `Criteria met: ${met.map((c) => c.label).join("; ")}.`],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = {
  name: "lights_criteria",
  Component: LightsCriteriaCalculator,
};
