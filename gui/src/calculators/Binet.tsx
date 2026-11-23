// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconDroplets } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
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
  type Choice,
} from "../kit";

/** Binet staging of established CLL (Binet 1981; iwCLL, Hallek 2018). */

type Confirmed = "yes" | "no";

const CONFIRMED: Choice<Confirmed>[] = [
  { value: "yes", label: "Yes - CLL is established by diagnostic criteria" },
  {
    value: "no",
    label: "No, or not yet established",
    hint: "Includes suspected CLL, monoclonal B-cell lymphocytosis (MBL), and SLL without established CLL.",
  },
];

const AREAS = [
  {
    key: "head_and_neck_involved",
    label: "Head and neck, including Waldeyer ring",
    hint: "Clinically enlarged nodes (at least 1 cm); all groups in this area count once.",
  },
  {
    key: "axillae_involved",
    label: "Axillae",
    hint: "Either or both axillae; bilateral or multiple axillary groups count once.",
  },
  {
    key: "groins_involved",
    label: "Groins, including superficial femoral nodes",
    hint: "Either or both groins; both groins count once.",
  },
  {
    key: "spleen_involved",
    label: "Spleen",
    hint: "Palpable splenic enlargement; imaging-only enlargement does not count.",
  },
  {
    key: "liver_involved",
    label: "Liver",
    hint: "Palpable, clinically enlarged liver; a normally palpable edge or imaging-only enlargement does not count.",
  },
] as const;

type AreaKey = (typeof AREAS)[number]["key"];
type Areas = Record<AreaKey, boolean>;

const HB = { min: 0, max: 30 };
const PLATELETS = { min: 0, max: 2000 };

const noneInvolved = (): Areas => Object.fromEntries(AREAS.map((a) => [a.key, false])) as Areas;

function BinetCalculator() {
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);
  const [hb, setHb] = useState<number | null>(null);
  const [platelets, setPlatelets] = useState<number | null>(null);
  const [areas, setAreas] = useState<Areas>(noneInvolved);

  const complete =
    confirmed === "yes" &&
    inRange(hb, HB.min, HB.max) &&
    hb > HB.min &&
    inRange(platelets, PLATELETS.min, PLATELETS.max);
  const calc = useCalculation(
    "binet",
    complete
      ? {
          cll_diagnosis_confirmed: true,
          haemoglobin_g_dl: hb,
          platelet_count_10_9_l: platelets,
          ...areas,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconDroplets}
      title="Binet stage"
      badge="Chronic lymphocytic leukaemia"
      description="Historical prognostic stage for established CLL from five lymphoid areas on physical examination and the blood count (Binet 1981; iwCLL 2018). Not a diagnostic test and not a treatment instruction."
      onReset={() => {
        setConfirmed(null);
        setHb(null);
        setPlatelets(null);
        setAreas(noneInvolved());
      }}
      calc={calc}
      incomplete={
        confirmed === "no"
          ? "Binet staging applies only once CLL is established; it is not a diagnostic test."
          : "Confirm the diagnosis and enter haemoglobin and platelet count to calculate."
      }
      form={
        <>
          <ChoiceField
            label="Is CLL already diagnosed?"
            hint="Binet staging is used only after CLL has been established; it does not diagnose CLL."
            value={confirmed}
            onChange={setConfirmed}
            options={CONFIRMED}
          />
          <Text fw={600} size="sm" mt="xs">
            Blood count
          </Text>
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Haemoglobin"
              hint="Stage C if below 10 g/dL."
              unit="g/dL"
              value={hb}
              onChange={setHb}
              min={HB.min}
              max={HB.max}
              decimals={1}
            />
            <NumberField
              label="Platelet count"
              hint="Stage C if below 100 x10^9/L."
              unit="x10^9/L"
              value={platelets}
              onChange={setPlatelets}
              min={PLATELETS.min}
              max={PLATELETS.max}
              decimals={0}
            />
          </SimpleGrid>
          {hb === 0 && (
            <Text size="xs" c="red">
              Haemoglobin must be greater than 0 g/dL.
            </Text>
          )}
          <Text fw={600} size="sm" mt="xs">
            Lymphoid areas involved on physical examination
          </Text>
          <Divider />
          <Text size="xs" c="dimmed">
            Tick each area that is involved. CT-only nodes do not alter the Binet stage.
          </Text>
          {AREAS.map((a) => (
            <YesNoField
              key={a.key}
              label={a.label}
              hint={a.hint}
              checked={areas[a.key]}
              onChange={(checked) => setAreas((prev) => ({ ...prev, [a.key]: checked }))}
            />
          ))}
        </>
      }
      result={(r) => (
        <ScoreTile value={asText(r.result)} badge={`Binet stage ${asText(r.result)}`} />
      )}
      details={(r) => (
        <Facts
          items={[
            ["Areas involved", `${fmt(r.working.involved_area_count)} / 5`],
            ["Hb below 10 g/dL", asText(r.working.haemoglobin_below_10_g_dl)],
            ["Platelets below 100 x10^9/L", asText(r.working.platelet_count_below_100_10_9_l)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Binet stage ${asText(r.result)} (${fmt(r.working.involved_area_count)} of 5 lymphoid areas involved)`,
          interpretation: r.interpretation,
          findingsTitle: "Findings",
          findings: [
            "CLL diagnosis established",
            `Haemoglobin ${hb} g/dL`,
            `Platelet count ${platelets} x10^9/L`,
            ...AREAS.filter((a) => areas[a.key]).map((a) => `Involved: ${a.label}`),
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "binet", Component: BinetCalculator };
