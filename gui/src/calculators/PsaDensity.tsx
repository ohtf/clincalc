// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid, Text } from "@mantine/core";
import { IconFlask2 } from "@tabler/icons-react";

import {
  CalculatorPage,
  inRange,
  NumberField,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** PSA density: total serum PSA / imaging-derived prostate volume (Benson 1992; Yusim 2020). */

function PsaDensityCalculator() {
  const [psa, setPsa] = useState<number | null>(null);
  const [volume, setVolume] = useState<number | null>(null);

  const complete = inRange(psa, 0) && inRange(volume, 0) && volume > 0;
  const calc = useCalculation(
    "psa_density",
    complete ? { total_psa_ng_ml: psa, prostate_volume_ml: volume } : null,
  );

  return (
    <CalculatorPage
      icon={IconFlask2}
      title="PSA density"
      badge="Prostate assessment"
      description="Total serum PSA divided by imaging-derived total prostate volume (Benson 1992; Yusim 2020). A continuous adjunct to clinical and MRI-based assessment, not a diagnosis or a stand-alone biopsy rule; no universal cut-off is applied."
      onReset={() => {
        setPsa(null);
        setVolume(null);
      }}
      calc={calc}
      incomplete="Enter total PSA and prostate volume to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Total serum PSA"
              hint="Total PSA, not free or percent free PSA."
              unit="ng/mL"
              value={psa}
              onChange={setPsa}
              min={0}
              decimals={2}
            />
            <NumberField
              label="Total prostate volume"
              hint="From MRI or ultrasound; 1 mL = 1 cc = 1 cm³. Not a lesion volume."
              unit="mL"
              value={volume}
              onChange={setVolume}
              min={0}
              decimals={1}
            />
          </SimpleGrid>
          {volume === 0 && (
            <Text size="xs" c="red">
              Prostate volume must be greater than 0 mL.
            </Text>
          )}
          <Text size="xs" c="dimmed">
            The imaging modality and volume-estimation method materially affect PSA density;
            interpret the result in that context.
          </Text>
        </>
      }
      result={(r) => (
        <ScoreTile value={fmt(r.result, 3)} unit={asText(r.working.result_unit) || "ng/mL/cc"} />
      )}
      summary={(r) =>
        summaryText({
          heading: `PSA density ${fmt(r.result, 3)} ${asText(r.working.result_unit) || "ng/mL/cc"}`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [`Total serum PSA ${psa} ng/mL`, `Total prostate volume ${volume} mL`],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "psa_density",
  Component: PsaDensityCalculator,
};
