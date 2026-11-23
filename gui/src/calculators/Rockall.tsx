// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Switch } from "@mantine/core";
import { IconDroplet } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  YesNoField,
  asNumber,
  asText,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/**
 * Rockall score after acute upper GI haemorrhage (Rockall 1996). The
 * "Endoscopy performed" switch decides whether the diagnosis and stigmata
 * are sent at all - the engine rejects only one of the pair.
 */

type Comorbidity =
  | "nil_major"
  | "cardiac_failure_ischaemic_heart_disease_or_other_major"
  | "renal_failure_liver_failure_or_disseminated_malignancy";
type Diagnosis =
  | "mallory_weiss_or_no_lesion_identified"
  | "all_other_diagnoses"
  | "upper_gi_malignancy";

const COMORBIDITY: Choice<Comorbidity>[] = [
  { value: "nil_major", label: "Nil major (0)" },
  {
    value: "cardiac_failure_ischaemic_heart_disease_or_other_major",
    label: "Cardiac failure, IHD, or other major comorbidity (2)",
  },
  {
    value: "renal_failure_liver_failure_or_disseminated_malignancy",
    label: "Renal failure, liver failure, or disseminated malignancy (3)",
  },
];

const DIAGNOSIS: Choice<Diagnosis>[] = [
  {
    value: "mallory_weiss_or_no_lesion_identified",
    label: "Mallory-Weiss tear, or no lesion identified (0)",
  },
  { value: "all_other_diagnoses", label: "All other diagnoses (1)" },
  { value: "upper_gi_malignancy", label: "Upper GI malignancy (2)" },
];

const AGE = { min: 0, max: 130 };

const positive = (v: number | null): v is number => inRange(v, 0) && v > 0;

const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

function scoreColour(kind: string, total: number): string {
  if (kind === "Full") {
    if (total >= 6) return "red";
    if (total >= 3) return "yellow";
    return "teal";
  }
  return total === 0 ? "teal" : "yellow";
}

export function RockallCalculator() {
  const [age, setAge] = useState<number | null>(null);
  const [systolic, setSystolic] = useState<number | null>(null);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [comorbidity, setComorbidity] = useState<Comorbidity | null>(null);
  const [endoscopyDone, setEndoscopyDone] = useState(false);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [stigmata, setStigmata] = useState(false);

  const complete =
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age) &&
    positive(systolic) &&
    positive(heartRate) &&
    comorbidity !== null &&
    (!endoscopyDone || diagnosis !== null);
  const calc = useCalculation(
    "rockall",
    complete
      ? {
          age,
          systolic_bp_mm_hg: systolic,
          heart_rate_bpm: heartRate,
          comorbidity,
          ...(endoscopyDone && { diagnosis, major_stigmata_of_recent_haemorrhage: stigmata }),
        }
      : null,
  );

  const zeroEntered = systolic === 0 || heartRate === 0;

  return (
    <CalculatorPage
      icon={IconDroplet}
      title="Rockall Score"
      badge="Upper GI bleeding"
      description="Pre-endoscopy and full post-endoscopy risk of rebleeding and mortality after acute upper GI haemorrhage (Rockall 1996). Complements the pre-endoscopy-only Glasgow-Blatchford score."
      onReset={() => {
        setAge(null);
        setSystolic(null);
        setHeartRate(null);
        setComorbidity(null);
        setEndoscopyDone(false);
        setDiagnosis(null);
        setStigmata(false);
      }}
      calc={calc}
      maw={980}
      incomplete={
        zeroEntered
          ? "Systolic BP and heart rate must be above 0."
          : endoscopyDone
            ? "Enter age, systolic BP, heart rate, comorbidity, and the endoscopic diagnosis to calculate."
            : "Enter age, systolic BP, heart rate, and comorbidity to calculate."
      }
      form={
        <>
          <SimpleGrid cols={3} spacing="md">
            <NumberField
              label="Age"
              unit="years"
              value={age}
              onChange={setAge}
              min={AGE.min}
              max={AGE.max}
              decimals={0}
            />
            <NumberField label="Systolic BP" unit="mmHg" value={systolic} onChange={setSystolic} min={0} />
            <NumberField label="Heart rate" unit="bpm" value={heartRate} onChange={setHeartRate} min={0} />
          </SimpleGrid>
          <ChoiceField
            label="Comorbidity"
            value={comorbidity}
            onChange={setComorbidity}
            options={COMORBIDITY}
          />
          <Divider />
          <Switch
            label="Endoscopy performed"
            description="Add the diagnosis and stigmata to compute the full post-endoscopy score"
            checked={endoscopyDone}
            onChange={(e) => setEndoscopyDone(e.currentTarget.checked)}
          />
          {endoscopyDone && (
            <>
              <ChoiceField
                label="Endoscopic diagnosis"
                value={diagnosis}
                onChange={setDiagnosis}
                options={DIAGNOSIS}
              />
              <YesNoField
                label="Major stigmata of recent haemorrhage"
                hint="Blood in the upper GI tract, an adherent clot, or a visible/spurting vessel"
                checked={stigmata}
                onChange={setStigmata}
              />
            </>
          )}
        </>
      }
      result={(r) => {
        const kind = asText(r.working.score_kind);
        return (
          <>
            <ScoreTile
              value={asText(r.result)}
              outOf={kind === "Full" ? 11 : 7}
              colour={scoreColour(kind, asNumber(r.result) ?? 0)}
              badge={kind === "Full" ? "full" : "pre-endoscopy"}
            />
            {kind === "Full" && (
              <Facts
                items={[["Pre-endoscopy subtotal", `${asText(r.working.pre_endoscopy_score)}/7`]]}
              />
            )}
          </>
        );
      }}
      summary={(r) => {
        const full = asText(r.working.score_kind) === "Full";
        return summaryText({
          heading: `Rockall ${asText(r.result)} (${full ? "full, post-endoscopy" : "pre-endoscopy"})`,
          interpretation: r.interpretation,
          extra: [
            `Age: ${age} years`,
            `Shock: SBP ${systolic} mmHg, HR ${heartRate} bpm`,
            `Comorbidity: ${labelOf(COMORBIDITY, comorbidity)}`,
            full && `Diagnosis: ${labelOf(DIAGNOSIS, diagnosis)}`,
            full && `Major stigmata of recent haemorrhage: ${stigmata ? "yes" : "no"}`,
            !full && `Pre-endoscopy subtotal: ${asText(r.working.pre_endoscopy_score)}/7`,
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "rockall", Component: RockallCalculator };
