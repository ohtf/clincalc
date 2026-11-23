// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconTestPipe } from "@tabler/icons-react";

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

/** International Staging System for multiple myeloma (Greipp 2005). */

type Confirmed = "yes" | "no";

const CONFIRMED: Choice<Confirmed>[] = [
  { value: "yes", label: "Yes - previously untreated symptomatic multiple myeloma" },
  {
    value: "no",
    label: "No, or not applicable",
    hint: "MGUS, smouldering myeloma, or relapsed or previously treated myeloma.",
  },
];

const B2M = { min: 0, max: 200 };
const ALBUMIN = { min: 0, max: 80 };

function IssMyelomaCalculator() {
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);
  const [b2m, setB2m] = useState<number | null>(null);
  const [albumin, setAlbumin] = useState<number | null>(null);

  const complete =
    confirmed === "yes" &&
    inRange(b2m, B2M.min, B2M.max) &&
    b2m > B2M.min &&
    inRange(albumin, ALBUMIN.min, ALBUMIN.max) &&
    albumin > ALBUMIN.min;
  const calc = useCalculation(
    "iss_myeloma",
    complete
      ? {
          untreated_symptomatic_myeloma_confirmed: true,
          beta2_microglobulin_mg_l: b2m,
          albumin_g_l: albumin,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconTestPipe}
      title="ISS (myeloma)"
      badge="Multiple myeloma"
      description="International Staging System for previously untreated symptomatic multiple myeloma, from serum beta2-microglobulin and albumin at diagnosis (Greipp 2005). Not the Injury Severity Score."
      onReset={() => {
        setConfirmed(null);
        setB2m(null);
        setAlbumin(null);
      }}
      calc={calc}
      incomplete={
        confirmed === "no"
          ? "ISS applies only to previously untreated symptomatic multiple myeloma; it is not a diagnostic test."
          : "Confirm applicability and enter both laboratory values to calculate."
      }
      form={
        <>
          <ChoiceField
            label="Applicability"
            hint="ISS is a staging system, not a diagnostic test."
            value={confirmed}
            onChange={setConfirmed}
            options={CONFIRMED}
          />
          <Text fw={600} size="sm" mt="xs">
            Serum values at diagnosis, before treatment
          </Text>
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Beta2-microglobulin"
              hint="Below 3.5 (with albumin at least 35 g/L) is stage I; 5.5 or more is stage III."
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
        </>
      }
      result={(r) => <ScoreTile value={asText(r.result)} badge={`ISS stage ${asText(r.result)}`} />}
      details={(r) => (
        <Facts
          title="Published cohort figure"
          items={[
            [
              "Median overall survival (2005 cohort)",
              `${fmt(r.working.published_median_overall_survival_months)} months`,
            ],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `ISS stage ${asText(r.result)} (multiple myeloma)`,
          interpretation: r.interpretation,
          findingsTitle: "Values at diagnosis",
          findings: [
            "Previously untreated symptomatic multiple myeloma",
            `Beta2-microglobulin ${b2m} mg/L`,
            `Albumin ${albumin} g/L`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "iss_myeloma",
  Component: IssMyelomaCalculator,
};
