// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconGauge } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** Ankle-brachial pressure index per leg (NICE CG147). */

const MIN = 0;

const BAND_COLOUR: Record<string, string> = {
  normal: "teal",
  borderline: "yellow",
  mild_moderate_pad: "orange",
  severe_pad: "red",
  high_calcified: "orange",
};

const BAND_LABEL: Record<string, string> = {
  normal: "Normal",
  borderline: "Borderline",
  mild_moderate_pad: "Mild-to-moderate PAD",
  severe_pad: "Severe PAD",
  high_calcified: "Abnormally high",
};

const ratio = (v: unknown) => (typeof v === "number" ? v.toFixed(2) : asText(v));

const positive = (v: number | null): v is number => inRange(v, MIN) && v > MIN;

function AbpiCalculator() {
  const [rightAnkle, setRightAnkle] = useState<number | null>(null);
  const [leftAnkle, setLeftAnkle] = useState<number | null>(null);
  const [rightArm, setRightArm] = useState<number | null>(null);
  const [leftArm, setLeftArm] = useState<number | null>(null);

  const complete =
    positive(rightAnkle) && positive(leftAnkle) && positive(rightArm) && positive(leftArm);
  const calc = useCalculation(
    "abpi",
    complete
      ? {
          right_ankle_systolic: rightAnkle,
          left_ankle_systolic: leftAnkle,
          right_brachial_systolic: rightArm,
          left_brachial_systolic: leftArm,
        }
      : null,
  );

  const field = (
    label: string,
    hint: string,
    value: number | null,
    onChange: (v: number | null) => void,
  ) => (
    <NumberField
      label={label}
      hint={hint}
      unit="mmHg"
      value={value}
      onChange={onChange}
      min={MIN}
      decimals={0}
    />
  );

  return (
    <CalculatorPage
      icon={IconGauge}
      title="ABPI"
      badge="Peripheral arterial disease"
      description="Ankle-brachial pressure index for each leg: the higher ankle systolic in that leg over the higher brachial systolic of the two arms (NICE CG147). Used to screen for PAD and to inform compression-therapy safety. A high ABPI does not mean good perfusion."
      onReset={() => {
        setRightAnkle(null);
        setLeftAnkle(null);
        setRightArm(null);
        setLeftArm(null);
      }}
      calc={calc}
      incomplete="Enter all four Doppler systolic pressures to calculate."
      form={
        <>
          <Text fw={600}>Brachial systolic pressures</Text>
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            {field("Right arm", "Brachial systolic.", rightArm, setRightArm)}
            {field("Left arm", "Brachial systolic.", leftArm, setLeftArm)}
          </SimpleGrid>
          <Text fw={600} mt="sm">
            Ankle systolic pressures
          </Text>
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            {field(
              "Right ankle",
              "Higher of dorsalis pedis and posterior tibial, by Doppler.",
              rightAnkle,
              setRightAnkle,
            )}
            {field(
              "Left ankle",
              "Higher of dorsalis pedis and posterior tibial, by Doppler.",
              leftAnkle,
              setLeftAnkle,
            )}
          </SimpleGrid>
        </>
      }
      result={(r) => {
        const band = asText(r.working.overall_band);
        return (
          <ScoreTile
            value={ratio(r.result)}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={BAND_LABEL[band] ?? band}
          />
        );
      }}
      details={(r) => (
        <Facts
          items={[
            ["Right leg", `${ratio(r.working.right_abpi)} (${asText(r.working.right_interpretation)})`],
            ["Left leg", `${ratio(r.working.left_abpi)} (${asText(r.working.left_interpretation)})`],
            ["Brachial used", `${fmt(r.working.brachial_used, 0)} mmHg`],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `ABPI ${ratio(r.result)} (worse leg: ${BAND_LABEL[asText(r.working.overall_band)] ?? asText(r.working.overall_band)})`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [
            `Right ABPI ${ratio(r.working.right_abpi)}, left ABPI ${ratio(r.working.left_abpi)}`,
            `Right brachial systolic ${rightArm} mmHg`,
            `Left brachial systolic ${leftArm} mmHg`,
            `Right ankle systolic ${rightAnkle} mmHg`,
            `Left ankle systolic ${leftAnkle} mmHg`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "abpi", Component: AbpiCalculator };
