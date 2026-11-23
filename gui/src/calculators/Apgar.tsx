// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, Text } from "@mantine/core";
import { IconBabyCarriage } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Conventional Apgar score for one observation set (Apgar 1953; AAP/ACOG 2015). */

type Minute = "1" | "5" | "10" | "15" | "20";
type Resus = "no" | "yes";
type Gestation = "term_or_late_preterm" | "earlier_preterm" | "unknown";
type HeartRate = "absent" | "below_100" | "at_least_100";
type Respiratory = "absent" | "slow_or_irregular" | "good_with_vigorous_cry";
type Tone = "flaccid" | "some_flexion" | "active_motion";
type Reflex = "no_response" | "grimace" | "cough_sneeze_or_active_withdrawal";
type Appearance = "blue_or_pale" | "pink_body_blue_extremities" | "completely_pink";

const MINUTES: Choice<Minute>[] = [
  { value: "1", label: "1 min" },
  { value: "5", label: "5 min" },
  { value: "10", label: "10 min" },
  { value: "15", label: "15 min" },
  { value: "20", label: "20 min" },
];

const RESUS: Choice<Resus>[] = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
];

const GESTATION: Choice<Gestation>[] = [
  { value: "term_or_late_preterm", label: "Term or late preterm" },
  { value: "earlier_preterm", label: "Earlier preterm" },
  { value: "unknown", label: "Unknown" },
];

const HEART_RATE: Choice<HeartRate>[] = [
  { value: "absent", label: "Absent (0)" },
  { value: "below_100", label: "Below 100 beats/min (1)" },
  { value: "at_least_100", label: "100 beats/min or more (2)" },
];

const RESPIRATORY: Choice<Respiratory>[] = [
  { value: "absent", label: "Absent (0)" },
  { value: "slow_or_irregular", label: "Slow or irregular (1)" },
  { value: "good_with_vigorous_cry", label: "Good, with vigorous cry (2)" },
];

const TONE: Choice<Tone>[] = [
  { value: "flaccid", label: "Flaccid (0)" },
  { value: "some_flexion", label: "Some flexion of extremities (1)" },
  { value: "active_motion", label: "Active motion (2)" },
];

const REFLEX: Choice<Reflex>[] = [
  { value: "no_response", label: "No response (0)" },
  { value: "grimace", label: "Grimace (1)" },
  { value: "cough_sneeze_or_active_withdrawal", label: "Cough, sneeze, or active withdrawal (2)" },
];

const APPEARANCE: Choice<Appearance>[] = [
  { value: "blue_or_pale", label: "Blue or pale (0)" },
  { value: "pink_body_blue_extremities", label: "Pink body, blue extremities (1)" },
  { value: "completely_pink", label: "Completely pink (2)" },
];

const BAND_LABEL: Record<string, string> = {
  low: "low",
  moderately_abnormal: "moderately abnormal",
  reassuring: "reassuring",
};
const BAND_COLOUR: Record<string, string> = {
  low: "red",
  moderately_abnormal: "yellow",
  reassuring: "teal",
};

const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

/** Two to five short options in one row; starts unselected like ChoiceField. */

function Section({ title }: { title: string }) {
  return (
    <>
      <Text fw={600} mt="xs">
        {title}
      </Text>
      <Divider />
    </>
  );
}

function ApgarCalculator() {
  const [minute, setMinute] = useState<Minute | null>(null);
  const [resus, setResus] = useState<Resus | null>(null);
  const [gestation, setGestation] = useState<Gestation | null>(null);
  const [heartRate, setHeartRate] = useState<HeartRate | null>(null);
  const [respiratory, setRespiratory] = useState<Respiratory | null>(null);
  const [tone, setTone] = useState<Tone | null>(null);
  const [reflex, setReflex] = useState<Reflex | null>(null);
  const [appearance, setAppearance] = useState<Appearance | null>(null);

  const complete =
    minute !== null &&
    resus !== null &&
    gestation !== null &&
    heartRate !== null &&
    respiratory !== null &&
    tone !== null &&
    reflex !== null &&
    appearance !== null;
  const calc = useCalculation(
    "apgar",
    complete
      ? {
          minute_after_birth: Number(minute),
          assessment_during_resuscitation: resus === "yes",
          gestational_context: gestation,
          heart_rate: heartRate,
          respiratory_effort: respiratory,
          muscle_tone: tone,
          reflex_irritability: reflex,
          appearance,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconBabyCarriage}
      title="Apgar score"
      badge="Newborn assessment"
      description="Conventional Apgar score for one observation set after birth (Apgar 1953; AAP/ACOG 2015). It documents the infant's status and response to resuscitation; it does not decide whether to resuscitate, diagnose asphyxia, or predict an individual outcome."
      onReset={() => {
        setMinute(null);
        setResus(null);
        setGestation(null);
        setHeartRate(null);
        setRespiratory(null);
        setTone(null);
        setReflex(null);
        setAppearance(null);
      }}
      calc={calc}
      incomplete="Record the assessment context and all five signs to calculate."
      form={
        <>
          <Section title="Assessment context" />
          <ChoiceField layout="inline"
            label="Minutes after birth"
            hint="All five signs must come from this one completed minute. Routinely at 1 and 5 minutes, then every 5 minutes to 20 if the 5-minute score is below 7."
            value={minute}
            onChange={setMinute}
            options={MINUTES}
          />
          <ChoiceField layout="inline"
            label="Assisted resuscitation in progress?"
            hint="Positive-pressure ventilation, CPAP, intubation, chest compressions, or medication. Not scored, but assisted and unassisted scores are not equivalent."
            value={resus}
            onChange={setResus}
            options={RESUS}
          />
          <ChoiceField layout="inline"
            label="Gestational context"
            hint="Choose term or late preterm only when established. Prematurity can lower tone, colour, and reflex scores without asphyxia."
            value={gestation}
            onChange={setGestation}
            options={GESTATION}
          />
          <Section title="Signs" />
          <ChoiceField label="Heart rate" value={heartRate} onChange={setHeartRate} options={HEART_RATE} />
          <ChoiceField
            label="Respiratory effort"
            hint="Spontaneous effort only - do not score ventilator-delivered breaths."
            value={respiratory}
            onChange={setRespiratory}
            options={RESPIRATORY}
          />
          <ChoiceField label="Muscle tone" value={tone} onChange={setTone} options={TONE} />
          <ChoiceField
            label="Reflex irritability"
            hint="Response to stimulation."
            value={reflex}
            onChange={setReflex}
            options={REFLEX}
          />
          <ChoiceField
            label="Appearance (colour)"
            hint="Visual colour is subjective, affected by skin pigmentation and lighting, and is not oxygen saturation."
            value={appearance}
            onChange={setAppearance}
            options={APPEARANCE}
          />
        </>
      }
      result={(r) => {
        const band = asText(r.working.five_minute_band);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={10}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={band ? BAND_LABEL[band] ?? band : `${fmt(r.working.minute_after_birth)} min`}
          />
        );
      }}
      details={(r) => (
        <Facts
          title="Points"
          items={[
            ["Heart rate", fmt(r.working.heart_rate_points)],
            ["Respiratory effort", fmt(r.working.respiratory_effort_points)],
            ["Muscle tone", fmt(r.working.muscle_tone_points)],
            ["Reflex irritability", fmt(r.working.reflex_irritability_points)],
            ["Appearance", fmt(r.working.appearance_points)],
          ]}
        />
      )}
      summary={(r) => {
        const band = asText(r.working.five_minute_band);
        return summaryText({
          heading: `Apgar score ${fmt(r.result)}/10 at ${minute} minute${minute === "1" ? "" : "s"}${band ? ` (${BAND_LABEL[band] ?? band})` : ""}`,
          interpretation: r.interpretation,
          findingsTitle: "Observations",
          findings: [
            `Heart rate: ${labelOf(HEART_RATE, heartRate)}`,
            `Respiratory effort: ${labelOf(RESPIRATORY, respiratory)}`,
            `Muscle tone: ${labelOf(TONE, tone)}`,
            `Reflex irritability: ${labelOf(REFLEX, reflex)}`,
            `Appearance: ${labelOf(APPEARANCE, appearance)}`,
            `Gestational context: ${labelOf(GESTATION, gestation).toLowerCase()}`,
            resus === "yes"
              ? "Assessed during assisted resuscitation"
              : "Not assessed during assisted resuscitation",
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "apgar", Component: ApgarCalculator };
