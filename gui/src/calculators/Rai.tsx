// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconDropletHalf2 } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  YesNoField,
  asText,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Rai stage and modified Rai risk group for established CLL (Rai 1975; iwCLL, Hallek 2018). */

type Confirmed = "yes" | "no";

const CONFIRMED: Choice<Confirmed>[] = [
  {
    value: "yes",
    label: "Yes - CLL is established by diagnostic criteria",
    hint: "The diagnostic lymphocytosis defines stage 0.",
  },
  {
    value: "no",
    label: "No, or not yet established",
    hint: "Includes suspected CLL, monoclonal B-cell lymphocytosis (MBL), and SLL without established CLL.",
  },
];

const HB = { min: 0, max: 30 };
const PLATELETS = { min: 0, max: 2000 };

const RISK_COLOUR: Record<string, string> = { low: "teal", intermediate: "yellow", high: "red" };

function RaiCalculator() {
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);
  const [hb, setHb] = useState<number | null>(null);
  const [platelets, setPlatelets] = useState<number | null>(null);
  const [nodes, setNodes] = useState(false);
  const [organomegaly, setOrganomegaly] = useState(false);

  const complete =
    confirmed === "yes" &&
    inRange(hb, HB.min, HB.max) &&
    hb > HB.min &&
    inRange(platelets, PLATELETS.min, PLATELETS.max);
  const calc = useCalculation(
    "rai",
    complete
      ? {
          cll_diagnosis_confirmed: true,
          haemoglobin_g_dl: hb,
          platelet_count_10_9_l: platelets,
          lymphadenopathy: nodes,
          splenomegaly_or_hepatomegaly: organomegaly,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconDropletHalf2}
      title="Rai stage"
      badge="Chronic lymphocytic leukaemia"
      description="Historical prognostic stage (0-IV) for established CLL, with the iwCLL 2018 modified three-group risk classification (Rai 1975; Hallek 2018). Not a diagnostic test and not a treatment instruction."
      onReset={() => {
        setConfirmed(null);
        setHb(null);
        setPlatelets(null);
        setNodes(false);
        setOrganomegaly(false);
      }}
      calc={calc}
      incomplete={
        confirmed === "no"
          ? "Rai staging applies only once CLL is established; it is not a diagnostic test."
          : "Confirm the diagnosis and enter haemoglobin and platelet count to calculate."
      }
      form={
        <>
          <ChoiceField
            label="Is CLL already diagnosed?"
            hint="Rai staging is used only after CLL has been established; it does not diagnose CLL."
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
              hint="Stage III if below 11 g/dL."
              unit="g/dL"
              value={hb}
              onChange={setHb}
              min={HB.min}
              max={HB.max}
              decimals={1}
            />
            <NumberField
              label="Platelet count"
              hint="Stage IV if below 100 x10^9/L."
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
          <Text size="xs" c="dimmed">
            Clinicians must attribute the cause of anaemia or thrombocytopenia; the stage does not
            distinguish disease-related from autoimmune or other causes.
          </Text>
          <Text fw={600} size="sm" mt="xs">
            Physical examination
          </Text>
          <Divider />
          <YesNoField
            label="Enlarged lymph nodes"
            hint="Clinically enlarged nodes in any site (stage I). CT-only lymphadenopathy does not count."
            checked={nodes}
            onChange={setNodes}
          />
          <YesNoField
            label="Enlarged spleen and/or liver"
            hint="Clinically enlarged on examination (stage II). Imaging-only enlargement or a normally palpable liver edge does not count."
            checked={organomegaly}
            onChange={setOrganomegaly}
          />
        </>
      }
      result={(r) => {
        const risk = asText(r.working.modified_rai_risk_group);
        return (
          <ScoreTile
            value={asText(r.result)}
            colour={RISK_COLOUR[risk] ?? "teal"}
            badge={risk && `${risk} risk (modified Rai)`}
          />
        );
      }}
      details={(r) => (
        <Facts
          items={[
            ["Hb below 11 g/dL", asText(r.working.haemoglobin_below_11_g_dl)],
            ["Platelets below 100 x10^9/L", asText(r.working.platelet_count_below_100_10_9_l)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Rai stage ${asText(r.result)} (modified Rai ${asText(r.working.modified_rai_risk_group)} risk)`,
          interpretation: r.interpretation,
          findingsTitle: "Findings",
          findings: [
            "CLL diagnosis established",
            `Haemoglobin ${hb} g/dL`,
            `Platelet count ${platelets} x10^9/L`,
            nodes && "Enlarged lymph nodes on examination",
            organomegaly && "Enlarged spleen and/or liver on examination",
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "rai", Component: RaiCalculator };
