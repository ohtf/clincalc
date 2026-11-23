// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconWoman } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  ScoreTile,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Bishop score for cervical favourability before induction of labour (Bishop 1964). */

type Dilation = "closed" | "1_2_cm" | "3_4_cm" | "5_plus_cm";
type Effacement = "0_30_percent" | "40_50_percent" | "60_70_percent" | "80_plus_percent";
type Station = "minus_3" | "minus_2" | "minus_1_or_0" | "plus_1_or_plus_2";
type Consistency = "Firm" | "Medium" | "Soft";
type Position = "Posterior" | "MidPosition" | "Anterior";

const DILATION: Choice<Dilation>[] = [
  { value: "closed", label: "Closed (0)" },
  { value: "1_2_cm", label: "1-2 cm (1)" },
  { value: "3_4_cm", label: "3-4 cm (2)" },
  { value: "5_plus_cm", label: "5 cm or more (3)" },
];

const EFFACEMENT: Choice<Effacement>[] = [
  { value: "0_30_percent", label: "0-30% (0)" },
  { value: "40_50_percent", label: "40-50% (1)" },
  { value: "60_70_percent", label: "60-70% (2)" },
  { value: "80_plus_percent", label: "80% or more (3)" },
];

const STATION: Choice<Station>[] = [
  { value: "minus_3", label: "-3 (0)" },
  { value: "minus_2", label: "-2 (1)" },
  { value: "minus_1_or_0", label: "-1 or 0 (2)" },
  { value: "plus_1_or_plus_2", label: "+1 or +2 (3)" },
];

const CONSISTENCY: Choice<Consistency>[] = [
  { value: "Firm", label: "Firm (0)" },
  { value: "Medium", label: "Medium (1)" },
  { value: "Soft", label: "Soft (2)" },
];

const POSITION: Choice<Position>[] = [
  { value: "Posterior", label: "Posterior (0)" },
  { value: "MidPosition", label: "Mid-position (1)" },
  { value: "Anterior", label: "Anterior (2)" },
];

const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

/** Two to five short options in one row; starts unselected like ChoiceField. */

function BishopCalculator() {
  const [dilation, setDilation] = useState<Dilation | null>(null);
  const [effacement, setEffacement] = useState<Effacement | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [consistency, setConsistency] = useState<Consistency | null>(null);
  const [position, setPosition] = useState<Position | null>(null);

  const complete =
    dilation !== null &&
    effacement !== null &&
    station !== null &&
    consistency !== null &&
    position !== null;
  const calc = useCalculation(
    "bishop",
    complete ? { dilation, effacement, station, consistency, position } : null,
  );

  return (
    <CalculatorPage
      icon={IconWoman}
      title="Bishop score"
      badge="Induction of labour"
      description="Five-part cervical examination score of how favourable the cervix is for induction of labour (Bishop 1964). A score of 8 or more is considered favourable."
      onReset={() => {
        setDilation(null);
        setEffacement(null);
        setStation(null);
        setConsistency(null);
        setPosition(null);
      }}
      calc={calc}
      incomplete="Answer all five cervical findings to calculate."
      form={
        <>
          <ChoiceField label="Dilation" value={dilation} onChange={setDilation} options={DILATION} />
          <ChoiceField label="Effacement" value={effacement} onChange={setEffacement} options={EFFACEMENT} />
          <ChoiceField
            label="Fetal station"
            hint="Relative to the ischial spines."
            value={station}
            onChange={setStation}
            options={STATION}
          />
          <ChoiceField layout="inline"
            label="Consistency"
            value={consistency}
            onChange={setConsistency}
            options={CONSISTENCY}
          />
          <ChoiceField layout="inline"
            label="Position"
            value={position}
            onChange={setPosition}
            options={POSITION}
          />
        </>
      }
      result={(r) => (
        <ScoreTile
          value={fmt(r.result)}
          outOf={13}
          badge={r.working.favourable === true ? "favourable" : undefined}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Bishop score ${fmt(r.result)}/13${r.working.favourable === true ? " (favourable)" : ""}`,
          interpretation: r.interpretation,
          findingsTitle: "Cervical findings",
          findings: [
            `Dilation: ${labelOf(DILATION, dilation)}`,
            `Effacement: ${labelOf(EFFACEMENT, effacement)}`,
            `Station: ${labelOf(STATION, station)}`,
            `Consistency: ${labelOf(CONSISTENCY, consistency)}`,
            `Position: ${labelOf(POSITION, position)}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "bishop", Component: BishopCalculator };
