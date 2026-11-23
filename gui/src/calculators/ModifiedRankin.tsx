// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconWalk } from "@tabler/icons-react";

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

/** Modified Rankin Scale (Rankin 1957; van Swieten 1988). */

type Grade = "0" | "1" | "2" | "3" | "4" | "5" | "6";

const GRADES: Choice<Grade>[] = [
  { value: "0", label: "0 No symptoms at all" },
  {
    value: "1",
    label: "1 No significant disability despite symptoms",
    hint: "Able to carry out all usual duties and activities.",
  },
  {
    value: "2",
    label: "2 Slight disability",
    hint: "Unable to carry out all previous activities, but able to look after own affairs without assistance.",
  },
  {
    value: "3",
    label: "3 Moderate disability",
    hint: "Requiring some help, but able to walk without assistance.",
  },
  {
    value: "4",
    label: "4 Moderately severe disability",
    hint: "Unable to walk without assistance and unable to attend to own bodily needs without assistance.",
  },
  {
    value: "5",
    label: "5 Severe disability",
    hint: "Bedridden, incontinent, and requiring constant nursing care and attention.",
  },
  { value: "6", label: "6 Dead" },
];

function ModifiedRankinCalculator() {
  const [grade, setGrade] = useState<Grade | null>(null);

  const calc = useCalculation("modified_rankin", grade !== null ? { grade: Number(grade) } : null);

  return (
    <CalculatorPage
      icon={IconWalk}
      title="Modified Rankin Scale"
      badge="Disability after stroke"
      description="Global disability grade from 0 (no symptoms) to 6 (dead), used to grade functional outcome after stroke (Rankin 1957; van Swieten 1988)."
      onReset={() => setGrade(null)}
      formTitle="Choose the grade that best describes the patient"
      calc={calc}
      incomplete="Choose a grade."
      form={<ChoiceField label="mRS grade" value={grade} onChange={setGrade} options={GRADES} />}
      result={(r) => (
        <ScoreTile
          value={fmt(r.result)}
          outOf={6}
          badge={
            r.working.good_functional_outcome === true
              ? "good functional outcome (0-2)"
              : "poor functional outcome (3-6)"
          }
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Modified Rankin Scale ${fmt(r.result)} / 6: ${asText(r.working.descriptor)}`,
          interpretation: r.interpretation,
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "modified_rankin",
  Component: ModifiedRankinCalculator,
};
