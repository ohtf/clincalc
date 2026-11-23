// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconMicroscope } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
  ChoiceField,
} from "../kit";

/** Gleason score and ISUP/WHO Grade Group for prostate cancer (Epstein 2016, ISUP 2014). */

type Pattern = "1" | "2" | "3" | "4" | "5";

const PATTERNS: Choice<Pattern>[] = (["1", "2", "3", "4", "5"] as const).map((p) => ({
  value: p,
  label: p,
}));

/** A horizontal row of radio options for a short scale that must start unselected. */

function GleasonCalculator() {
  const [primary, setPrimary] = useState<Pattern | null>(null);
  const [secondary, setSecondary] = useState<Pattern | null>(null);

  const complete = primary !== null && secondary !== null;
  const calc = useCalculation(
    "gleason",
    complete ? { primary_pattern: Number(primary), secondary_pattern: Number(secondary) } : null,
  );

  return (
    <CalculatorPage
      icon={IconMicroscope}
      title="Gleason Grade Group"
      badge="Prostate cancer"
      description="Gleason score and ISUP/WHO Grade Group (1-5) from the primary and secondary architectural patterns (ISUP 2014; Epstein 2016). Score 7 splits by which pattern is primary: 3+4 is Grade Group 2, 4+3 is Grade Group 3."
      onReset={() => {
        setPrimary(null);
        setSecondary(null);
      }}
      calc={calc}
      incomplete="Choose the primary and secondary patterns to calculate."
      form={
        <>
          <ChoiceField layout="inline"
            label="Primary pattern"
            hint="The most prevalent pattern, written first (the 3 in 3+4). Do not swap primary and secondary."
            value={primary}
            onChange={setPrimary}
            options={PATTERNS}
          />
          <ChoiceField layout="inline"
            label="Secondary pattern"
            hint="The next most prevalent pattern, written second (the 4 in 3+4)."
            value={secondary}
            onChange={setSecondary}
            options={PATTERNS}
          />
        </>
      }
      result={(r) => (
        <ScoreTile value={fmt(r.working.grade_group)} outOf={5} badge={asText(r.working.risk)} />
      )}
      details={(r) => (
        <Facts
          items={[
            ["Gleason score", `${primary}+${secondary} = ${fmt(r.working.gleason_score)}`],
            ["Grade Group", fmt(r.working.grade_group)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Gleason ${primary}+${secondary} = ${fmt(r.working.gleason_score)}, ISUP/WHO Grade Group ${fmt(r.working.grade_group)} (${asText(r.working.risk)})`,
          interpretation: r.interpretation,
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "gleason", Component: GleasonCalculator };
