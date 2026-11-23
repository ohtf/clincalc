// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Badge, Group, Text } from "@mantine/core";
import { IconStethoscope } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  ScoreTile,
  YesNoField,
  asText,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** Wells score for pulmonary embolism (Wells 2000), guiding D-dimer versus CTPA (NICE NG158). */

const CRITERIA = [
  {
    key: "clinical_signs_of_dvt",
    label: "Clinical signs and symptoms of DVT",
    hint: "At minimum, leg swelling and pain with palpation of the deep veins.",
    points: "+3",
  },
  {
    key: "pe_most_likely_diagnosis",
    label: "PE is the most likely diagnosis",
    hint: "PE is at least as likely as any alternative diagnosis.",
    points: "+3",
  },
  {
    key: "heart_rate_over_100",
    label: "Heart rate > 100 bpm",
    points: "+1.5",
  },
  {
    key: "immobilisation_or_surgery",
    label: "Immobilisation >= 3 days, or surgery in the previous 4 weeks",
    points: "+1.5",
  },
  {
    key: "previous_dvt_or_pe",
    label: "Previous objectively diagnosed DVT or PE",
    points: "+1.5",
  },
  {
    key: "haemoptysis",
    label: "Haemoptysis",
    points: "+1",
  },
  {
    key: "malignancy",
    label: "Malignancy",
    hint: "Treatment within the last 6 months, or palliative.",
    points: "+1",
  },
] as const satisfies ReadonlyArray<{ key: string; label: string; hint?: string; points: string }>;

type Key = (typeof CRITERIA)[number]["key"];
type Criteria = Record<Key, boolean>;

const noneTicked = (): Criteria =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, false])) as Criteria;

function WithPoints({ label, points }: { label: string; points: string }) {
  return (
    <Group gap="xs">
      <Text>{label}</Text>
      <Badge size="xs" variant="light" color="gray">
        {points}
      </Badge>
    </Group>
  );
}

export function WellsPeCalculator() {
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);

  const calc = useCalculation("wells_pe", criteria);

  return (
    <CalculatorPage
      icon={IconStethoscope}
      title="Wells Score (PE)"
      badge="Pulmonary embolism"
      description="Pretest probability of pulmonary embolism, guiding D-dimer versus CTPA (NICE NG158)."
      onReset={() => setCriteria(noneTicked())}
      formTitle="Tick each criterion that applies"
      calc={calc}
      form={CRITERIA.map((c) => (
        <YesNoField
          key={c.key}
          label={<WithPoints label={c.label} points={c.points} />}
          hint={"hint" in c ? c.hint : undefined}
          checked={criteria[c.key]}
          onChange={(checked) => setCriteria((prev) => ({ ...prev, [c.key]: checked }))}
        />
      ))}
      result={(r) => {
        const twoTier = asText(r.working.two_tier);
        return (
          <ScoreTile
            value={asText(r.result)}
            colour={twoTier === "likely" ? "red" : "teal"}
            badge={twoTier || "—"}
          />
        );
      }}
      details={(r) => (
        <Facts items={[["Three-tier", asText(r.working.three_tier) || "—"]]} />
      )}
      summary={(r) =>
        summaryText({
          heading: `Wells Score (PE) ${asText(r.result)}`,
          interpretation: r.interpretation,
          findingsTitle: "Positive criteria",
          findings: CRITERIA.filter((c) => criteria[c.key]).map((c) => `${c.label} (${c.points})`),
          extra: [
            !CRITERIA.some((c) => criteria[c.key]) && "No criteria met.\n",
            `Two-tier: ${asText(r.working.two_tier) || "—"}`,
            `Three-tier: ${asText(r.working.three_tier) || "—"}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "wells_pe", Component: WellsPeCalculator };
