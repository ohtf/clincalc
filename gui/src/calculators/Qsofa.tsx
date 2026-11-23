// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid } from "@mantine/core";
import { IconVirus } from "@tabler/icons-react";

import {
  CalculatorPage,
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
} from "../kit";

/** qSOFA bedside prompt from the Sepsis-3 consensus (Singer 2016). */

const RR = { min: 0, max: 120 };
const SBP = { min: 0, max: 300 };

const BAND_LABEL: Record<string, string> = { "high-risk": "qSOFA positive", "low-risk": "qSOFA negative" };
const BAND_COLOUR: Record<string, string> = { "high-risk": "red", "low-risk": "teal" };

const met = (v: unknown) => (v === true ? "met" : "not met");

function QsofaCalculator() {
  const [rr, setRr] = useState<number | null>(null);
  const [sbp, setSbp] = useState<number | null>(null);
  const [alteredMentation, setAlteredMentation] = useState(false);

  const complete = inRange(rr, RR.min, RR.max) && inRange(sbp, SBP.min, SBP.max);
  const calc = useCalculation(
    "qsofa",
    complete
      ? { respiratory_rate: rr, systolic_bp: sbp, altered_mentation: alteredMentation }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconVirus}
      title="qSOFA"
      badge="Suspected infection"
      description="Three-item bedside prompt from Sepsis-3 (Singer 2016). A score of 2 or more in suspected infection flags a higher risk of poor outcome and should prompt assessment for organ dysfunction. A prognostic prompt, not a diagnosis or a sole screening tool."
      onReset={() => {
        setRr(null);
        setSbp(null);
        setAlteredMentation(false);
      }}
      calc={calc}
      incomplete="Enter respiratory rate and systolic blood pressure to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Respiratory rate"
              hint="22 or more scores 1."
              unit="/min"
              value={rr}
              onChange={setRr}
              min={RR.min}
              max={RR.max}
              decimals={0}
            />
            <NumberField
              label="Systolic blood pressure"
              hint="100 or less scores 1."
              unit="mmHg"
              value={sbp}
              onChange={setSbp}
              min={SBP.min}
              max={SBP.max}
              decimals={0}
            />
          </SimpleGrid>
          <Divider />
          <YesNoField
            label="Altered mentation"
            hint="Glasgow Coma Scale score below 15. Scores 1."
            checked={alteredMentation}
            onChange={setAlteredMentation}
          />
        </>
      }
      result={(r) => {
        const band = asText(r.working.level);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={3}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={BAND_LABEL[band] ?? band}
          />
        );
      }}
      details={(r) => (
        <Facts
          title="Criteria"
          items={[
            ["Respiratory rate 22 or more", met(r.working.respiratory_rate_criterion)],
            ["Systolic BP 100 or less", met(r.working.systolic_bp_criterion)],
            ["Altered mentation", met(r.working.altered_mentation_criterion)],
          ]}
        />
      )}
      summary={(r) => {
        const band = asText(r.working.level);
        return summaryText({
          heading: `qSOFA ${fmt(r.result)} / 3 (${BAND_LABEL[band] ?? band})`,
          interpretation: r.interpretation,
          findingsTitle: "Observations",
          findings: [
            `Respiratory rate ${rr}/min`,
            `Systolic blood pressure ${sbp} mmHg`,
            alteredMentation && "Altered mentation (GCS below 15)",
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "qsofa", Component: QsofaCalculator };
