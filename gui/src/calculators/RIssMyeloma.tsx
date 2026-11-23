// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconDna2 } from "@tabler/icons-react";

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

/** Revised International Staging System for multiple myeloma (Palumbo 2015). */

type Confirmed = "yes" | "no";
type Result = "detected" | "not_detected";

const CONFIRMED: Choice<Confirmed>[] = [
  { value: "yes", label: "Yes - newly diagnosed multiple myeloma" },
  {
    value: "no",
    label: "No, or not applicable",
    hint: "MGUS, smouldering myeloma, or relapsed or previously treated myeloma.",
  },
];

const FISH: Choice<Result>[] = [
  {
    value: "detected",
    label: "Detected",
    hint: "At least one of del(17p), t(4;14), or t(14;16) at or above the laboratory's positivity cut-off.",
  },
  {
    value: "not_detected",
    label: "None detected",
    hint: "None of the three on a FISH result. Other abnormalities such as gain(1q) or del(13) do not count.",
  },
];

const LDH: Choice<Result>[] = [
  { value: "detected", label: "Above the upper limit of normal" },
  {
    value: "not_detected",
    label: "Not above the upper limit of normal",
    hint: "A value exactly at the limit is treated as not raised.",
  },
];

const B2M = { min: 0, max: 200 };
const ALBUMIN = { min: 0, max: 80 };

function RIssMyelomaCalculator() {
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);
  const [b2m, setB2m] = useState<number | null>(null);
  const [albumin, setAlbumin] = useState<number | null>(null);
  const [fish, setFish] = useState<Result | null>(null);
  const [ldh, setLdh] = useState<Result | null>(null);

  const complete =
    confirmed === "yes" &&
    inRange(b2m, B2M.min, B2M.max) &&
    b2m > B2M.min &&
    inRange(albumin, ALBUMIN.min, ALBUMIN.max) &&
    albumin > ALBUMIN.min &&
    fish !== null &&
    ldh !== null;
  const calc = useCalculation(
    "r_iss_myeloma",
    complete
      ? {
          newly_diagnosed_myeloma_confirmed: true,
          beta2_microglobulin_mg_l: b2m,
          albumin_g_l: albumin,
          high_risk_chromosomal_abnormality: fish === "detected",
          ldh_above_upper_limit_of_normal: ldh === "detected",
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconDna2}
      title="R-ISS (myeloma)"
      badge="Multiple myeloma"
      description="Revised International Staging System for newly diagnosed multiple myeloma: ISS plus high-risk FISH cytogenetics and serum LDH (Palumbo 2015). If no FISH result is available, use ISS instead."
      onReset={() => {
        setConfirmed(null);
        setB2m(null);
        setAlbumin(null);
        setFish(null);
        setLdh(null);
      }}
      calc={calc}
      incomplete={
        confirmed === "no"
          ? "R-ISS applies only to newly diagnosed multiple myeloma; it is not a diagnostic test."
          : "Confirm applicability, enter both laboratory values, and answer the cytogenetics and LDH questions to calculate."
      }
      form={
        <>
          <ChoiceField
            label="Applicability"
            hint="R-ISS is a staging system, not a diagnostic test."
            value={confirmed}
            onChange={setConfirmed}
            options={CONFIRMED}
          />
          <Text fw={600} size="sm" mt="xs">
            Serum values at diagnosis
          </Text>
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Beta2-microglobulin"
              hint="Below 3.5 (with albumin at least 35 g/L) is ISS stage I; 5.5 or more is ISS stage III."
              unit="mg/L"
              value={b2m}
              onChange={setB2m}
              min={B2M.min}
              max={B2M.max}
              decimals={1}
            />
            <NumberField
              label="Albumin"
              hint="In g/L: multiply g/dL by 10 (3.5 g/dL = 35 g/L)."
              unit="g/L"
              value={albumin}
              onChange={setAlbumin}
              min={ALBUMIN.min}
              max={ALBUMIN.max}
              decimals={1}
            />
          </SimpleGrid>
          {(b2m === 0 || albumin === 0) && (
            <Text size="xs" c="red">
              Both values must be greater than 0.
            </Text>
          )}
          <Text fw={600} size="sm" mt="xs">
            Cytogenetics and LDH
          </Text>
          <Divider />
          <ChoiceField
            label="High-risk chromosomal abnormality by interphase FISH"
            hint="On purified plasma cells. If cytogenetics are unavailable, use ISS rather than answering 'none detected'."
            value={fish}
            onChange={setFish}
            options={FISH}
          />
          <ChoiceField
            label="Serum LDH"
            hint="Against the local laboratory's upper limit of normal."
            value={ldh}
            onChange={setLdh}
            options={LDH}
          />
        </>
      }
      result={(r) => (
        <ScoreTile value={asText(r.result)} badge={`R-ISS stage ${asText(r.result)}`} />
      )}
      details={(r) => (
        <Facts
          items={[
            ["ISS stage", asText(r.working.iss_stage)],
            [
              "5-year overall survival (2015 cohort)",
              `${fmt(r.working.published_five_year_overall_survival_percent)}%`,
            ],
            [
              "5-year progression-free survival (2015 cohort)",
              `${fmt(r.working.published_five_year_progression_free_survival_percent)}%`,
            ],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `R-ISS stage ${asText(r.result)} (ISS stage ${asText(r.working.iss_stage)})`,
          interpretation: r.interpretation,
          findingsTitle: "Values at diagnosis",
          findings: [
            "Newly diagnosed multiple myeloma",
            `Beta2-microglobulin ${b2m} mg/L`,
            `Albumin ${albumin} g/L`,
            fish === "detected"
              ? "High-risk FISH abnormality detected (del(17p), t(4;14), or t(14;16))"
              : "No high-risk FISH abnormality detected",
            ldh === "detected"
              ? "Serum LDH above the upper limit of normal"
              : "Serum LDH not above the upper limit of normal",
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "r_iss_myeloma",
  Component: RIssMyelomaCalculator,
};
