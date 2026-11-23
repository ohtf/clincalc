// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Alert, Group, Radio } from "@mantine/core";
import { IconStethoscope } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  ScoreTile,
  asText,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Wasvary/Kaiser modified Hinchey classification of diverticulitis (Kaiser 2005). */

type Cause = "yes" | "no";
type Finding =
  | "mild_clinical_diverticulitis"
  | "confined_pericolic_inflammation_or_phlegmon"
  | "confined_pericolic_or_mesocolic_abscess"
  | "pelvic_distant_intra_abdominal_or_retroperitoneal_abscess"
  | "generalized_purulent_peritonitis"
  | "generalized_fecal_peritonitis"
  | "generalized_peritonitis_contamination_not_established"
  | "fistula"
  | "obstruction";
type Basis = "clinical" | "ct" | "operative" | "ct_and_operative";

const CAUSE: Choice<Cause>[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No, or not yet established" },
];

const FINDINGS: Choice<Finding>[] = [
  { value: "mild_clinical_diverticulitis", label: "Stage 0: mild clinical diverticulitis" },
  { value: "confined_pericolic_inflammation_or_phlegmon", label: "Stage Ia: confined pericolic inflammation or phlegmon" },
  { value: "confined_pericolic_or_mesocolic_abscess", label: "Stage Ib: confined pericolic or mesocolic abscess" },
  {
    value: "pelvic_distant_intra_abdominal_or_retroperitoneal_abscess",
    label: "Stage II: pelvic, distant intra-abdominal, or retroperitoneal abscess",
    hint: "Abscess location, not size, separates Ib from II.",
  },
  {
    value: "generalized_purulent_peritonitis",
    label: "Stage III: generalised purulent peritonitis",
    hint: "No open communication with the bowel lumen. Needs operative evidence.",
  },
  {
    value: "generalized_fecal_peritonitis",
    label: "Stage IV: faecal peritonitis",
    hint: "Free perforation or open communication with the bowel. Needs operative evidence.",
  },
  {
    value: "generalized_peritonitis_contamination_not_established",
    label: "Generalised peritonitis, contamination not established",
    hint: "Use instead of guessing III or IV when purulent versus faecal contamination has not been seen. Free gas or fluid on CT alone does not establish it.",
  },
  { value: "fistula", label: "Fistula (Kaiser additional category)" },
  { value: "obstruction", label: "Obstruction (Kaiser additional category)" },
];

const BASES: Choice<Basis>[] = [
  { value: "clinical", label: "Clinical assessment" },
  { value: "ct", label: "CT" },
  { value: "operative", label: "Operative findings" },
  { value: "ct_and_operative", label: "CT and operative findings" },
];

const ALL_BASES: Basis[] = ["clinical", "ct", "operative", "ct_and_operative"];
const ALLOWED_BASES: Record<Finding, Basis[]> = {
  mild_clinical_diverticulitis: ["clinical"],
  confined_pericolic_inflammation_or_phlegmon: ["ct", "operative", "ct_and_operative"],
  confined_pericolic_or_mesocolic_abscess: ["ct", "operative", "ct_and_operative"],
  pelvic_distant_intra_abdominal_or_retroperitoneal_abscess: ["ct", "operative", "ct_and_operative"],
  generalized_purulent_peritonitis: ["operative", "ct_and_operative"],
  generalized_fecal_peritonitis: ["operative", "ct_and_operative"],
  generalized_peritonitis_contamination_not_established: ["clinical", "ct"],
  fistula: ALL_BASES,
  obstruction: ALL_BASES,
};

const BASIS_HINT: Partial<Record<Finding, string>> = {
  mild_clinical_diverticulitis: "Stage 0 is a clinical diagnosis without imaging or operative confirmation.",
  confined_pericolic_inflammation_or_phlegmon: "Stages Ia, Ib, and II need imaging or operative evidence.",
  confined_pericolic_or_mesocolic_abscess: "Stages Ia, Ib, and II need imaging or operative evidence.",
  pelvic_distant_intra_abdominal_or_retroperitoneal_abscess: "Stages Ia, Ib, and II need imaging or operative evidence.",
  generalized_purulent_peritonitis: "Stages III and IV need operative evidence of the contamination.",
  generalized_fecal_peritonitis: "Stages III and IV need operative evidence of the contamination.",
  generalized_peritonitis_contamination_not_established:
    "With operative findings, choose stage III or IV from the contamination seen instead.",
};

const KIND_LABEL: Record<string, string> = {
  modified_hinchey_stage: "modified Hinchey stage",
  kaiser_additional_category: "Kaiser additional category",
  safety_indeterminate: "stage III or IV not established",
};

const RESULT_DISPLAY: Record<string, string> = {
  fistula: "Fistula",
  obstruction: "Obstruction",
  indeterminate_iii_or_iv: "III or IV",
};

function HincheyCalculator() {
  const [cause, setCause] = useState<Cause | null>(null);
  const [finding, setFinding] = useState<Finding | null>(null);
  const [basis, setBasis] = useState<Basis | null>(null);

  const allowed = finding ? ALLOWED_BASES[finding] : ALL_BASES;
  const basisOptions = BASES.filter((b) => allowed.includes(b.value));

  const complete = cause === "yes" && finding !== null && basis !== null && allowed.includes(basis);
  const calc = useCalculation(
    "hinchey",
    complete ? { diverticular_disease_is_cause: true, assessment_basis: basis, finding } : null,
  );

  const label = <T extends string>(options: Choice<T>[], value: T | null) =>
    options.find((o) => o.value === value)?.label ?? "";

  return (
    <CalculatorPage
      icon={IconStethoscope}
      title="Modified Hinchey classification"
      badge="Diverticulitis"
      description="Anatomical classification of diverticulitis: the Wasvary modification of Hinchey (1978) as operationalised for CT and extended with fistula and obstruction by Kaiser (2005). It classifies; it does not prescribe treatment."
      onReset={() => {
        setCause(null);
        setFinding(null);
        setBasis(null);
      }}
      calc={calc}
      incomplete={
        cause === "no"
          ? "The classification applies only when diverticular disease is the established cause. Exclude mimics such as colorectal cancer and non-diverticular perforation first."
          : "Confirm the cause, then choose the finding and the evidence it rests on."
      }
      form={
        <>
          <Radio.Group
            label="Is diverticular disease the established cause of the current finding?"
            description="The classification does not establish the diagnosis or exclude malignancy."
            value={cause}
            onChange={(v) => setCause(v as Cause)}
          >
            <Group gap="lg" mt={8}>
              {CAUSE.map((o) => (
                <Radio key={o.value} value={o.value} label={o.label} />
              ))}
            </Group>
          </Radio.Group>
          {cause === "no" && (
            <Alert color="orange" variant="light">
              The modified Hinchey classification is not applied until diverticular disease is established as the cause.
            </Alert>
          )}
          <ChoiceField
            label="Finding"
            hint="The single category best supported by the current clinical, CT, or operative findings."
            value={finding}
            onChange={(f) => {
              setFinding(f);
              if (basis !== null && !ALLOWED_BASES[f].includes(basis)) setBasis(null);
            }}
            options={FINDINGS}
          />
          <ChoiceField
            label="Evidence for the finding"
            hint={finding ? BASIS_HINT[finding] : "Choose the finding first; some findings need operative evidence."}
            value={basis}
            onChange={setBasis}
            options={basisOptions}
          />
        </>
      }
      result={(r) => {
        const result = asText(r.result);
        return (
          <ScoreTile
            value={RESULT_DISPLAY[result] ?? result}
            badge={KIND_LABEL[asText(r.working.category_kind)] ?? asText(r.working.category_kind)}
          />
        );
      }}
      details={(r) => (
        <Facts
          items={[
            ["Finding", asText(r.working.anatomical_finding)],
            ["Evidence", label(BASES, basis)],
          ]}
        />
      )}
      summary={(r) => {
        const result = asText(r.result);
        const kind = asText(r.working.category_kind);
        const heading =
          kind === "modified_hinchey_stage"
            ? `Modified Hinchey stage ${result}: ${asText(r.working.anatomical_finding)}`
            : kind === "kaiser_additional_category"
              ? `Diverticular disease, Kaiser additional category: ${asText(r.working.anatomical_finding)}`
              : `Diverticulitis: ${asText(r.working.anatomical_finding)} (modified Hinchey III or IV not established)`;
        return summaryText({
          heading,
          interpretation: r.interpretation,
          findingsTitle: "Basis",
          findings: [`Evidence: ${label(BASES, basis)}`, "Diverticular disease confirmed as the cause"],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "hinchey", Component: HincheyCalculator };
