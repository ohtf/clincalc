// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconLungs } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** MRC Dyspnoea Scale, classic grades 1-5 (Fletcher 1959). */

const GRADES: Choice<string>[] = [
  { value: "1", label: "Grade 1 - Not troubled by breathlessness except on strenuous exercise" },
  {
    value: "2",
    label: "Grade 2 - Short of breath when hurrying on the level or walking up a slight hill",
  },
  {
    value: "3",
    label:
      "Grade 3 - Walks slower than contemporaries on the level because of breathlessness, or has to stop for breath when walking at own pace",
  },
  {
    value: "4",
    label:
      "Grade 4 - Stops for breath after walking about 100 metres or after a few minutes on the level",
  },
  {
    value: "5",
    label: "Grade 5 - Too breathless to leave the house, or breathless when dressing or undressing",
  },
];

function MrcDyspnoeaCalculator() {
  const [grade, setGrade] = useState<string | null>(null);

  const calc = useCalculation("mrc_dyspnoea", grade !== null ? { grade: Number(grade) } : null);

  return (
    <CalculatorPage
      icon={IconLungs}
      title="MRC Dyspnoea Scale"
      badge="Breathlessness"
      description="Grades the disability breathlessness causes in everyday activity, on the classic MRC 1-5 scale (Fletcher 1959) used in UK COPD assessment. The modified mMRC scale numbers the same descriptors 0-4; this is not that scale."
      onReset={() => setGrade(null)}
      formTitle="Which description best matches the patient?"
      calc={calc}
      incomplete="Choose a grade."
      form={
        <ChoiceField
          label="MRC grade (classic 1-5 scale)"
          value={grade}
          onChange={setGrade}
          options={GRADES}
        />
      }
      result={(r) => <ScoreTile value={fmt(r.result)} outOf={5} badge="MRC (classic)" />}
      summary={(r) =>
        summaryText({
          heading: `MRC Dyspnoea grade ${fmt(r.result)} / 5 (classic MRC scale): ${asText(r.working.descriptor)}`,
          interpretation: r.interpretation,
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "mrc_dyspnoea",
  Component: MrcDyspnoeaCalculator,
};
