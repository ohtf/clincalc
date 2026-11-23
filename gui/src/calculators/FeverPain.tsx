// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconThermometer } from "@tabler/icons-react";

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

/** FeverPAIN for acute sore throat (Little et al, Lancet Infect Dis 2014). */

const CRITERIA = [
  {
    key: "fever",
    label: "Fever in the last 24 hours",
    hint: "Reported or measured fever within the past day.",
  },
  {
    key: "purulence",
    label: "Purulence on the tonsils",
    hint: "Visible pus on the tonsillar surface.",
  },
  {
    key: "attend_rapidly",
    label: "Attended within 3 days of symptom onset",
    hint: "Rapid attendance suggests more severe disease.",
  },
  {
    key: "inflamed_tonsils",
    label: "Severely inflamed tonsils",
    hint: "Markedly red, swollen tonsils on examination.",
  },
  {
    key: "absence_of_cough",
    label: "No cough or coryza",
    hint: "Absence of cough/coryza tilts toward bacterial cause.",
  },
] as const;

type Key = (typeof CRITERIA)[number]["key"];
type Criteria = Record<Key, boolean>;

const noneTicked = (): Criteria =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, false])) as Criteria;

// The engine's `level` follows Little 2014: 0-1 no antibiotic, 2-3 delayed, 4-5 immediate considered.
const LEVEL_COLOUR: Record<string, string> = { "no-rx": "teal", delayed: "yellow", immediate: "red" };

export function FeverPainCalculator() {
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);

  const calc = useCalculation("feverpain", criteria);

  return (
    <CalculatorPage
      icon={IconThermometer}
      title="FeverPAIN"
      badge="Acute sore throat"
      description="Five-item score guiding antibiotic prescribing in acute sore throat (Little et al, Lancet Infect Dis 2014). Validated in adults and children aged 3+."
      onReset={() => setCriteria(noneTicked())}
      formTitle="Tick each criterion that applies"
      calc={calc}
      maw={920}
      form={CRITERIA.map((c) => (
        <YesNoField
          key={c.key}
          label={c.label}
          hint={c.hint}
          checked={criteria[c.key]}
          onChange={(checked) => setCriteria((prev) => ({ ...prev, [c.key]: checked }))}
        />
      ))}
      result={(r) => (
        <ScoreTile
          value={asText(r.result)}
          outOf={5}
          colour={LEVEL_COLOUR[asText(r.working.level)] ?? "teal"}
          badge={asText(r.working.level) || "—"}
        />
      )}
      details={(r) => (
        <Facts
          items={[
            ["Strep isolation", asText(r.working.streptococcus_rate) || "—"],
            ["Prescribing", asText(r.working.prescribing_recommendation) || "—"],
          ]}
        />
      )}
      summary={(r) => {
        const ticked = CRITERIA.filter((c) => criteria[c.key]).map((c) => c.label);
        return summaryText({
          heading: `FeverPAIN ${asText(r.result)} / 5`,
          interpretation: r.interpretation,
          findingsTitle: "Positive criteria",
          findings: ticked,
          extra: [
            ticked.length === 0 && "No criteria met.\n",
            `Prescribing: ${asText(r.working.prescribing_recommendation) || "(not stated)"}`,
            `Streptococcus isolation: ${asText(r.working.streptococcus_rate) || "(not stated)"}`,
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "feverpain", Component: FeverPainCalculator };
