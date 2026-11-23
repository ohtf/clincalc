// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Fragment, useState } from "react";
import { Alert, Divider, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { IconBrain } from "@tabler/icons-react";

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

/** NIH Stroke Scale, standard adult version (NINDS, updated February 2024; Brott 1989). */

const CONTEXT = "clinician_administered_standard_adult_nihss_using_authorized_scale_materials";
type Context = typeof CONTEXT;

const CONTEXT_OPTIONS: Choice<Context>[] = [
  {
    value: CONTEXT,
    label: "A trained clinician is administering the standard adult NIHSS using an authorised version of the scale materials",
    hint: "Including the required picture-description, object-naming, reading, and dysarthria stimuli. Not for PedNIHSS, self-assessment, or a partial examination.",
  },
];

const ARM_OPTIONS = (side: string): Choice<string>[] => [
  { value: "no_drift_for_ten_seconds", label: "No drift for 10 seconds (0)" },
  { value: "drift_without_hitting_support", label: "Drift without hitting the support (1)" },
  { value: "some_effort_against_gravity", label: "Some effort against gravity (2)" },
  { value: "no_effort_against_gravity", label: "No effort against gravity (3)" },
  { value: "no_movement", label: "No movement (4)" },
  {
    value: "untestable_amputation_or_shoulder_fusion",
    label: `Untestable: amputation or ${side} shoulder fusion (UN)`,
  },
];

const LEG_OPTIONS = (side: string): Choice<string>[] => [
  { value: "no_drift_for_five_seconds", label: "No drift for 5 seconds (0)" },
  { value: "drift_without_hitting_bed", label: "Drift without hitting the bed (1)" },
  { value: "some_effort_against_gravity", label: "Some effort against gravity (2)" },
  { value: "no_effort_against_gravity", label: "No effort against gravity (3)" },
  { value: "no_movement", label: "No movement (4)" },
  {
    value: "untestable_amputation_or_hip_fusion",
    label: `Untestable: amputation or ${side} hip fusion (UN)`,
  },
];

interface Item {
  key: string;
  code: string;
  label: string;
  hint?: string;
  options: Choice<string>[];
  /** The option value that is UN, if the item allows it. */
  un?: string;
}

const LOC_ITEMS: Item[] = [
  {
    key: "level_of_consciousness",
    code: "1a",
    label: "Level of consciousness",
    hint: "Choose a response even with an endotracheal tube, language barrier, or oral trauma. Score 3 only for reflex motor or autonomic effects, or total unresponsiveness with flaccidity and areflexia.",
    options: [
      { value: "alert", label: "Alert (0)" },
      { value: "arousable_by_minor_stimulation", label: "Arousable by minor stimulation (1)" },
      {
        value: "requires_repeated_or_strong_stimulation",
        label: "Requires repeated or strong stimulation (2)",
      },
      { value: "reflex_responses_or_unresponsive", label: "Reflex responses only, or unresponsive (3)" },
    ],
  },
  {
    key: "loc_questions",
    code: "1b",
    label: "LOC questions: current month and age, asked once",
    hint: "Only the initial answers count, and near-correct answers get no credit.",
    options: [
      { value: "both_correct", label: "Both correct (0)" },
      { value: "one_correct", label: "One correct (1)" },
      {
        value: "non_aphasic_communication_barrier",
        label: "Non-aphasic communication barrier (1)",
        hint: "Intubation, oral trauma, severe dysarthria, language barrier, or another non-aphasic inability to speak.",
      },
      {
        value: "neither_correct_or_aphasic_or_stuporous",
        label: "Neither correct, or aphasic or stuporous (2)",
      },
    ],
  },
  {
    key: "loc_commands",
    code: "1c",
    label: "LOC commands: open and close the eyes, then grip and release the non-paretic hand",
    hint: "Use the first attempt. Demonstrate if there is no response; credit an unequivocal attempt frustrated by weakness.",
    options: [
      { value: "both_correct", label: "Both correct (0)" },
      { value: "one_correct", label: "One correct (1)" },
      { value: "neither_correct", label: "Neither correct (2)" },
    ],
  },
];

const EYE_FACE_ITEMS: Item[] = [
  {
    key: "best_gaze",
    code: "2",
    label: "Best gaze (horizontal)",
    hint: "Horizontal movement only. Reflex oculocephalic movement may be used; do not use caloric testing.",
    options: [
      { value: "normal", label: "Normal (0)" },
      {
        value: "partial_gaze_palsy",
        label: "Partial gaze palsy (1)",
        hint: "Including isolated CN III, IV, or VI paresis, or conjugate deviation overcome by voluntary or oculocephalic activity.",
      },
      {
        value: "forced_deviation_or_total_paresis",
        label: "Forced deviation or total gaze paresis (2)",
        hint: "Not overcome by the oculocephalic manoeuvre.",
      },
    ],
  },
  {
    key: "visual_fields",
    code: "3",
    label: "Visual fields",
    hint: "Test the remaining eye in unilateral blindness or enucleation. Blindness from any cause scores 3. Visual extinction scores 1 and also informs item 11.",
    options: [
      { value: "no_visual_loss", label: "No visual loss (0)" },
      { value: "partial_hemianopia", label: "Partial hemianopia (1)" },
      { value: "complete_hemianopia", label: "Complete hemianopia (2)" },
      { value: "bilateral_hemianopia_or_blindness", label: "Bilateral hemianopia or blindness (3)" },
    ],
  },
  {
    key: "facial_palsy",
    code: "4",
    label: "Facial palsy",
    hint: "In a poorly responsive patient, score the symmetry of grimace to noxious stimulation.",
    options: [
      { value: "normal_symmetry", label: "Normal symmetrical movement (0)" },
      { value: "minor_paralysis", label: "Minor paralysis (1)" },
      { value: "partial_lower_face_paralysis", label: "Partial paralysis, lower face (2)" },
      { value: "complete_one_or_both_sides", label: "Complete paralysis, one or both sides (3)" },
    ],
  },
];

const ARM_HINT =
  "Held at 90° sitting or 45° supine for 10 seconds. UN only for amputation or shoulder fusion, not weakness, pain, poor effort, paralysis, or inability to understand.";
const LEG_HINT =
  "Held at 30° supine for 5 seconds. UN only for amputation or hip fusion, not weakness, pain, poor effort, paralysis, or inability to understand.";

const MOTOR_ITEMS: Item[] = [
  {
    key: "motor_arm_left",
    code: "5a",
    label: "Motor arm, left",
    hint: ARM_HINT,
    options: ARM_OPTIONS("left"),
    un: "untestable_amputation_or_shoulder_fusion",
  },
  {
    key: "motor_arm_right",
    code: "5b",
    label: "Motor arm, right",
    hint: ARM_HINT,
    options: ARM_OPTIONS("right"),
    un: "untestable_amputation_or_shoulder_fusion",
  },
  {
    key: "motor_leg_left",
    code: "6a",
    label: "Motor leg, left",
    hint: LEG_HINT,
    options: LEG_OPTIONS("left"),
    un: "untestable_amputation_or_hip_fusion",
  },
  {
    key: "motor_leg_right",
    code: "6b",
    label: "Motor leg, right",
    hint: LEG_HINT,
    options: LEG_OPTIONS("right"),
    un: "untestable_amputation_or_hip_fusion",
  },
];

const LATER_ITEMS: Item[] = [
  {
    key: "limb_ataxia",
    code: "7",
    label: "Limb ataxia",
    hint: "Finger-nose-finger and heel-shin, out of proportion to weakness. Score 0, not UN, when paralysis or inability to understand prevents demonstration.",
    options: [
      { value: "absent", label: "Absent (0)" },
      { value: "present_in_one_limb", label: "Present in one limb (1)" },
      { value: "present_in_two_limbs", label: "Present in two limbs (2)" },
      { value: "untestable_amputation_or_joint_fusion", label: "Untestable: amputation or joint fusion (UN)" },
    ],
    un: "untestable_amputation_or_joint_fusion",
  },
  {
    key: "sensory",
    code: "8",
    label: "Sensory",
    hint: "Stroke-attributable pinprick and touch response only. A nonresponsive quadriplegic patient, and every patient scored 3 on item 1a, scores 2.",
    options: [
      { value: "normal", label: "Normal (0)" },
      { value: "mild_to_moderate_loss", label: "Mild to moderate loss (1)" },
      { value: "severe_or_total_loss", label: "Severe or total loss (2)" },
    ],
  },
  {
    key: "best_language",
    code: "9",
    label: "Best language",
    hint: "From picture description, object naming, sentence reading, and performance throughout the examination. Intubation does not make language untestable: ask for writing. Every patient scored 3 on item 1a scores 3.",
    options: [
      { value: "no_aphasia", label: "No aphasia (0)" },
      { value: "mild_to_moderate_aphasia", label: "Mild to moderate aphasia (1)" },
      { value: "severe_aphasia", label: "Severe aphasia (2)" },
      { value: "mute_or_global_aphasia", label: "Mute or global aphasia (3)" },
    ],
  },
  {
    key: "dysarthria",
    code: "10",
    label: "Dysarthria",
    hint: "Do not mark UN for aphasia or muteness alone; UN is only for intubation or another physical barrier to producing speech.",
    options: [
      { value: "normal", label: "Normal (0)" },
      { value: "mild_to_moderate", label: "Mild to moderate (1)" },
      { value: "severe_or_anarthric", label: "Severe or anarthric (2)" },
      {
        value: "untestable_intubation_or_physical_barrier",
        label: "Untestable: intubation or other physical barrier (UN)",
      },
    ],
    un: "untestable_intubation_or_physical_barrier",
  },
  {
    key: "extinction_inattention",
    code: "11",
    label: "Extinction and inattention",
    hint: "Double simultaneous stimulation and spatial attention. Never UN. Severe visual loss alone does not imply neglect; if visual testing is impossible but cutaneous attention is normal, score 0.",
    options: [
      { value: "none", label: "None (0)" },
      { value: "one_modality", label: "In one modality (1)" },
      { value: "profound_or_more_than_one_modality", label: "Profound, or in more than one modality (2)" },
    ],
  },
];

const SECTIONS = [
  { title: "Level of consciousness (1a-1c)", items: LOC_ITEMS, grid: false },
  { title: "Gaze, visual fields, and face (2-4)", items: EYE_FACE_ITEMS, grid: false },
  { title: "Motor (5a-6b)", items: MOTOR_ITEMS, grid: true },
  { title: "Ataxia, sensation, language, speech, and attention (7-11)", items: LATER_ITEMS, grid: false },
];

const ITEMS = SECTIONS.flatMap((s) => s.items);
const UN_ITEMS = ITEMS.filter((i) => i.un);

type Answers = Record<string, string | null>;
type Explanations = Record<string, string>;

const unanswered = (): Answers => Object.fromEntries(ITEMS.map((i) => [i.key, null]));

/** The engine's own consistency rules, restated so the form can explain them. */
function conflicts(a: Answers): string[] {
  const out: string[] = [];
  if (a.level_of_consciousness === "reflex_responses_or_unresponsive") {
    if (a.loc_questions !== null && a.loc_questions !== "neither_correct_or_aphasic_or_stuporous")
      out.push("With 1a scored 3, item 1b must be 'neither correct, or aphasic or stuporous'.");
    if (a.loc_commands !== null && a.loc_commands !== "neither_correct")
      out.push("With 1a scored 3, item 1c must be 'neither correct'.");
    for (const key of ["motor_arm_left", "motor_arm_right", "motor_leg_left", "motor_leg_right"]) {
      const v = a[key];
      if (v !== null && !["no_effort_against_gravity", "no_movement"].includes(v) && !v.startsWith("untestable"))
        out.push(
          `With 1a scored 3, ${ITEMS.find((i) => i.key === key)?.code} must be no effort against gravity, no movement, or UN.`,
        );
    }
    if (a.limb_ataxia !== null && !["absent", "untestable_amputation_or_joint_fusion"].includes(a.limb_ataxia))
      out.push("With 1a scored 3, item 7 must be absent (or UN for amputation or joint fusion).");
    if (a.sensory !== null && a.sensory !== "severe_or_total_loss")
      out.push("With 1a scored 3, item 8 scores 2 (severe or total loss).");
    if (a.best_language !== null && a.best_language !== "mute_or_global_aphasia")
      out.push("With 1a scored 3, item 9 scores 3 (mute or global aphasia).");
    if (
      a.dysarthria !== null &&
      !["severe_or_anarthric", "untestable_intubation_or_physical_barrier"].includes(a.dysarthria)
    )
      out.push("With 1a scored 3, item 10 must be severe or anarthric, or UN for a physical barrier.");
  }
  const motor = [a.motor_arm_left, a.motor_arm_right, a.motor_leg_left, a.motor_leg_right];
  if (motor.every((v) => v !== null)) {
    const capable = motor.filter((v) => v !== "no_movement" && !v!.startsWith("untestable")).length;
    const ataxic =
      a.limb_ataxia === "present_in_one_limb" ? 1 : a.limb_ataxia === "present_in_two_limbs" ? 2 : 0;
    if (ataxic > capable)
      out.push(
        `Item 7 records ataxia in ${ataxic} limb${ataxic > 1 ? "s" : ""}, but only ${capable} limb${capable === 1 ? " is" : "s are"} able to move and be examined.`,
      );
  }
  return out;
}

const optionLabel = (item: Item, value: string | null) =>
  item.options.find((o) => o.value === value)?.label ?? "";

function NihssCalculator() {
  const [context, setContext] = useState<Context | null>(null);
  const [answers, setAnswers] = useState<Answers>(unanswered);
  const [explanations, setExplanations] = useState<Explanations>({});

  const unItems = UN_ITEMS.filter((i) => answers[i.key] === i.un);
  const problems = conflicts(answers);
  const complete =
    context !== null &&
    ITEMS.every((i) => answers[i.key] !== null) &&
    unItems.every((i) => (explanations[i.key] ?? "").trim() !== "") &&
    problems.length === 0;

  const input = complete
    ? {
        assessment_context: context,
        ...answers,
        ...(unItems.length > 0 && {
          unscored_explanations: Object.fromEntries(
            unItems.map((i) => [i.key, explanations[i.key].trim()]),
          ),
        }),
      }
    : null;
  const calc = useCalculation("nihss", input);

  const renderItem = (item: Item) => (
    <Stack key={item.key} gap={6}>
      <ChoiceField
        label={`${item.code}. ${item.label}`}
        hint={item.hint}
        value={answers[item.key]}
        onChange={(v) => setAnswers((prev) => ({ ...prev, [item.key]: v }))}
        options={item.options}
      />
      {item.un && answers[item.key] === item.un && (
        <TextInput
          label={`Physical barrier for ${item.code} (required)`}
          description="The source requires the reason for every UN entry to be documented."
          value={explanations[item.key] ?? ""}
          onChange={(e) => {
            const text = e.currentTarget.value;
            setExplanations((prev) => ({ ...prev, [item.key]: text }));
          }}
          error={(explanations[item.key] ?? "").trim() === "" ? "Describe the physical barrier" : undefined}
        />
      )}
    </Stack>
  );

  return (
    <CalculatorPage
      icon={IconBrain}
      title="NIH Stroke Scale"
      badge="Acute stroke"
      description="Standard adult NIHSS (NINDS, updated February 2024). Administer the items in order, record each response immediately without revising earlier items, and score what the patient does, not what you think they could do. If any item is UN, no total is reported."
      onReset={() => {
        setContext(null);
        setAnswers(unanswered());
        setExplanations({});
      }}
      calc={calc}
      incomplete={
        problems.length > 0
          ? `These entries are inconsistent, so no score is shown: ${problems.join(" ")}`
          : "Confirm the context and score all 15 items to calculate."
      }
      maw={1100}
      form={
        <>
          <ChoiceField
            label="Assessment context"
            value={context}
            onChange={setContext}
            options={CONTEXT_OPTIONS}
          />
          {SECTIONS.map((s) => (
            <Fragment key={s.title}>
              <Divider mt="sm" />
              <Text fw={600}>{s.title}</Text>
              {s.grid ? (
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" verticalSpacing="lg">
                  {s.items.map(renderItem)}
                </SimpleGrid>
              ) : (
                s.items.map(renderItem)
              )}
            </Fragment>
          ))}
          {problems.length > 0 && (
            <Alert color="orange" variant="light" title="These entries are inconsistent">
              <Stack gap={4}>
                {problems.map((p) => (
                  <Text key={p} size="sm">
                    {p}
                  </Text>
                ))}
              </Stack>
            </Alert>
          )}
        </>
      }
      result={(r) =>
        typeof r.result === "number" ? (
          <ScoreTile value={fmt(r.result)} outOf={42} />
        ) : (
          <ScoreTile value="UN" badge="total not calculable" />
        )
      }
      details={(r) => (
        <Stack gap="sm">
          {typeof r.result !== "number" && (
            <Facts
              title="Incomplete"
              items={[
                ["Sum of scored items (not a total)", fmt(r.working.partial_scored_item_sum)],
                ["Unscored", unItems.map((i) => i.code).join(", ")],
              ]}
            />
          )}
          <Facts
            title="Points"
            items={ITEMS.map((i) => [
              i.code,
              r.working[`${i.key}_points`] === undefined ? "UN" : fmt(r.working[`${i.key}_points`]),
            ])}
          />
        </Stack>
      )}
      summary={(r) =>
        summaryText({
          heading:
            typeof r.result === "number"
              ? `NIHSS ${fmt(r.result)} / 42`
              : `NIHSS total not calculable (UN: ${unItems.map((i) => i.code).join(", ")}; sum of scored items ${fmt(r.working.partial_scored_item_sum)}, not a total)`,
          interpretation: r.interpretation,
          findingsTitle: "Items",
          findings: ITEMS.map((i) => {
            const line = `${i.code} ${i.label}: ${optionLabel(i, answers[i.key])}`;
            return i.un && answers[i.key] === i.un
              ? `${line} - ${asText(explanations[i.key]).trim()}`
              : line;
          }),
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "nihss", Component: NihssCalculator };
