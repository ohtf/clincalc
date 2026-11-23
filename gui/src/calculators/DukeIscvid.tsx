// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Fragment, useState } from "react";
import { Alert, Divider, List, Radio, Stack, Text } from "@mantine/core";
import { IconHeartSearch } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  YesNoField,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Corrected 2023 Duke-ISCVID criteria for infective endocarditis (Fowler 2023, corrected CID 2023;77(8):1222). */

const CONTEXT = "clinician_classification_of_suspected_ie_using_corrected_2023_duke_iscvid_criteria";

const PATHOLOGIC: Choice<string>[] = [
  { value: "none", label: "None" },
  {
    value: "qualifying_microorganism_identified_with_clinical_signs_of_active_ie",
    label: "Microorganism identified in a qualifying specimen, with clinical signs of active IE",
    hint: "By culture, staining, immunologic, or nucleic-acid methods in a vegetation, cardiac tissue, explanted prosthetic valve or sewing ring, ascending aortic graft with valve involvement, endovascular CIED, or arterial embolus.",
  },
  {
    value: "active_endocarditis_identified",
    label: "Active endocarditis identified",
    hint: "Acute or subacute/chronic.",
  },
  {
    value: "unsupported_single_skin_bacterium_pcr_on_valve_or_wire",
    label: "Single skin-bacterium PCR result on a valve or wire, without support",
    hint: "Counts as minor microbiology, not as pathologic evidence.",
  },
];

interface OptionGroup {
  title?: string;
  hint?: string;
  options: Choice<string>[];
}

const ORGANISM_GROUPS: OptionGroup[] = [
  { options: [{ value: "none", label: "None - no positive blood cultures" }] },
  {
    title: "Typical in any patient",
    hint: "1 positive set is minor; 2 or more are major.",
    options: [
      { value: "staphylococcus_aureus", label: "Staphylococcus aureus" },
      { value: "staphylococcus_lugdunensis", label: "Staphylococcus lugdunensis" },
      { value: "enterococcus_faecalis", label: "Enterococcus faecalis" },
      { value: "streptococcus_other_than_pneumoniae_or_pyogenes", label: "Streptococcus, other than S. pneumoniae or S. pyogenes" },
      { value: "granulicatella", label: "Granulicatella" },
      { value: "abiotrophia", label: "Abiotrophia" },
      { value: "gemella", label: "Gemella" },
      { value: "hacek", label: "HACEK group" },
    ],
  },
  {
    title: "Typical only with intracardiac prosthetic material",
    hint: "With material: 2 or more sets are major, 1 set is not a criterion. Without: 2 sets are minor, 3 or more are major.",
    options: [
      { value: "coagulase_negative_staphylococcus_other_than_lugdunensis", label: "Coagulase-negative staphylococcus, other than S. lugdunensis" },
      { value: "corynebacterium_striatum_or_jeikeium", label: "Corynebacterium striatum or jeikeium" },
      { value: "serratia_marcescens", label: "Serratia marcescens" },
      { value: "pseudomonas_aeruginosa", label: "Pseudomonas aeruginosa" },
      { value: "cutibacterium_acnes", label: "Cutibacterium acnes" },
      { value: "nontuberculous_mycobacterium", label: "Non-tuberculous mycobacterium" },
      { value: "candida", label: "Candida" },
    ],
  },
  {
    title: "Not typical",
    hint: "1 set is not a criterion, 2 are minor, 3 or more are major.",
    options: [
      { value: "streptococcus_pneumoniae_or_pyogenes", label: "Streptococcus pneumoniae or Streptococcus pyogenes" },
      { value: "non_faecalis_enterococcus", label: "Enterococcus, other than E. faecalis" },
    ],
  },
  {
    title: "Other organism, classified by a clinician or laboratory specialist",
    hint: "Only when a specialist has classified the organism under the source definitions. Use a named organism above when one applies.",
    options: [
      {
        value: "clinician_classified_other_organism_as_occasionally_causing_ie_and_not_a_common_contaminant",
        label: "Occasionally causes IE and is not a common contaminant",
        hint: "1 or 2 sets are minor; 3 or more are major.",
      },
      {
        value: "clinician_classified_other_organism_as_rarely_causing_ie_or_a_common_contaminant",
        label: "Rarely causes IE, or is a common contaminant",
        hint: "1 set is not a criterion, 2 are minor, 3 or more are major.",
      },
      {
        value: "clinician_classified_organism_as_not_consistent_with_ie",
        label: "Not consistent with IE",
      },
    ],
  },
];
const ORGANISMS = ORGANISM_GROUPS.flatMap((g) => g.options);
const UNIVERSAL_TYPICAL = ORGANISM_GROUPS[1].options.map((o) => o.value);
const PROSTHETIC_ONLY_TYPICAL = ORGANISM_GROUPS[2].options.map((o) => o.value);

const MAJOR_LAB: Choice<string>[] = [
  { value: "none", label: "None" },
  {
    value: "blood_nucleic_acid_coxiella_bartonella_or_tropheryma",
    label: "Qualifying blood nucleic-acid detection of Coxiella burnetii, Bartonella species, or Tropheryma whipplei",
  },
  { value: "coxiella_phase_i_igg_greater_than_1_800", label: "Coxiella burnetii phase I IgG above 1:800" },
  { value: "coxiella_single_positive_blood_culture", label: "Single positive blood culture for Coxiella burnetii" },
  {
    value: "bartonella_henselae_or_quintana_igg_at_least_1_800",
    label: "Bartonella henselae or quintana IgG 1:800 or higher",
    hint: "Or an equivalent titre with another method.",
  },
];

const OTHER_MICRO: Choice<string>[] = [
  { value: "none", label: "None" },
  {
    value: "ie_consistent_organism_from_other_sterile_site",
    label: "IE-consistent organism by culture or nucleic-acid test from another normally sterile site",
    hint: "Not cardiac tissue, a cardiac prosthesis, or an arterial embolus.",
  },
  {
    value: "serum_sequencing_other_than_coxiella_bartonella_tropheryma",
    label: "Positive serum amplicon or metagenomic sequencing for an organism other than Coxiella, Bartonella, or Tropheryma",
  },
];

const ANATOMIC: Choice<string>[] = [
  { value: "none_or_nonqualifying", label: "None or non-qualifying" },
  {
    value: "vegetation_perforation_aneurysm_abscess_pseudoaneurysm_or_fistula",
    label: "Vegetation, perforation, aneurysm, abscess, pseudoaneurysm, or intracardiac fistula",
    hint: "On echocardiography or cardiac CT.",
  },
  {
    value: "significant_new_valvular_regurgitation_on_echocardiography_compared_with_previous_imaging",
    label: "Significant new valvular regurgitation on echocardiography, compared with previous imaging",
    hint: "Worsening or changing pre-existing regurgitation alone is not enough. Cardiac CT does not count here.",
  },
  {
    value: "new_partial_prosthetic_valve_dehiscence",
    label: "New partial prosthetic-valve dehiscence, compared with previous imaging",
    hint: "Needs a prosthetic valve ticked under intracardiac material.",
  },
];

const PET_CT: Choice<string>[] = [
  { value: "none_or_nonqualifying", label: "None or non-qualifying" },
  { value: "qualifying_native_valve_abnormal_uptake", label: "Native valve - major" },
  {
    value: "qualifying_implanted_intracardiac_material_uptake_at_least_three_months",
    label: "Implanted intracardiac material, 3 months or more after implantation - major",
  },
  {
    value: "qualifying_implanted_intracardiac_material_uptake_less_than_three_months",
    label: "Implanted intracardiac material, less than 3 months after implantation - minor",
  },
  {
    value: "qualifying_ascending_aortic_graft_uptake_with_concomitant_valve_involvement_at_least_three_months",
    label: "Ascending aortic graft with concomitant valve involvement, 3 months or more after implantation - major",
  },
  {
    value: "qualifying_ascending_aortic_graft_uptake_with_concomitant_valve_involvement_less_than_three_months",
    label: "Ascending aortic graft with concomitant valve involvement, less than 3 months after implantation - minor",
  },
  {
    value: "isolated_generator_pocket_uptake",
    label: "Isolated generator-pocket uptake - neither major nor minor",
    hint: "Needs an endovascular CIED ticked under intracardiac material.",
  },
];

const SURGICAL: Choice<string>[] = [
  { value: "none_or_nonqualifying", label: "None or non-qualifying" },
  {
    value: "direct_evidence_without_major_imaging_or_subsequent_pathologic_confirmation",
    label: "Direct evidence of IE at operation, without major imaging or later pathologic confirmation",
    hint: "e.g. vegetation, abscess, valvular destruction, or prosthetic-valve dehiscence or loosening.",
  },
];

const AUSCULTATION: Choice<string>[] = [
  { value: "none_or_nonqualifying", label: "None or non-qualifying" },
  {
    value: "new_valvular_regurgitation_with_echocardiography_unavailable",
    label: "New valvular regurgitation on auscultation, echocardiography unavailable",
  },
  {
    value: "new_regurgitation_but_echocardiography_available",
    label: "New regurgitation on auscultation, but echocardiography is available",
    hint: "Does not qualify.",
  },
  { value: "changed_preexisting_murmur", label: "Change in a pre-existing murmur", hint: "Does not qualify." },
];

const MATERIAL: Choice<string>[] = [
  { value: "prosthetic_valve", label: "Prosthetic valve" },
  { value: "valve_repair_material", label: "Valve-repair material" },
  { value: "endovascular_cied", label: "Endovascular cardiac implantable electronic device (CIED)" },
  {
    value: "other_intracardiac_prosthetic_material",
    label: "Other intracardiac prosthetic material",
    hint: "Widens the typical-organism list but is not itself a predisposition.",
  },
];

const PREDISPOSITION: Choice<string>[] = [
  { value: "previous_ie", label: "Previous infective endocarditis" },
  {
    value: "previous_valve_repair_without_current_material",
    label: "Previous valve repair, with no repair material remaining",
  },
  { value: "congenital_heart_disease", label: "Congenital heart disease", hint: "Repaired or unrepaired." },
  { value: "more_than_mild_valvular_regurgitation_or_stenosis", label: "More than mild valvular regurgitation or stenosis" },
  { value: "hypertrophic_obstructive_cardiomyopathy", label: "Hypertrophic obstructive cardiomyopathy" },
  { value: "injection_drug_use", label: "Injection drug use" },
];

const VASCULAR: Choice<string>[] = [
  { value: "arterial_embolus", label: "Arterial embolus" },
  { value: "septic_pulmonary_infarct", label: "Septic pulmonary infarct" },
  { value: "cerebral_abscess", label: "Cerebral abscess" },
  { value: "splenic_abscess", label: "Splenic abscess" },
  { value: "mycotic_aneurysm", label: "Mycotic aneurysm" },
  { value: "intracranial_haemorrhage", label: "Intracranial haemorrhage" },
  { value: "conjunctival_haemorrhage", label: "Conjunctival haemorrhage" },
  { value: "janeway_lesion", label: "Janeway lesions" },
  { value: "purulent_purpura", label: "Purulent purpura" },
];

const IMMUNOLOGIC: Choice<string>[] = [
  { value: "positive_rheumatoid_factor", label: "Positive rheumatoid factor" },
  { value: "osler_nodes", label: "Osler nodes" },
  { value: "roth_spots", label: "Roth spots" },
  {
    value: "source_defined_immune_complex_glomerulonephritis",
    label: "Immune-complex glomerulonephritis",
    hint: "Renal biopsy consistent with immune-complex disease, or unexplained AKI or acute-on-chronic kidney injury with at least 2 of haematuria, proteinuria, cellular casts, or serologic perturbation (hypocomplementaemia, cryoglobulinaemia, circulating immune complexes).",
  },
];

const REJECTION: Choice<string>[] = [
  {
    value: "firm_alternate_microbiologic_diagnosis_all_three_conditions",
    label: "Firm alternate microbiological diagnosis",
    hint: "All three: an identifiable bloodstream source for an organism that is not typical in this patient, rapid resolution of the bloodstream infection, and no IE evidence on cardiac imaging.",
  },
  {
    value: "firm_alternate_nonmicrobiologic_diagnosis_both_conditions",
    label: "Firm alternate non-microbiological diagnosis",
    hint: "Both: a non-IE cause for the imaging findings, and no microbiological evidence of IE.",
  },
  { value: "no_recurrence_after_less_than_four_days_antibiotics", label: "No recurrence after less than 4 days of antibiotics" },
  {
    value: "no_pathologic_or_macroscopic_ie_at_surgery_or_autopsy_with_less_than_four_days_antibiotics",
    label: "No pathologic or macroscopic IE at surgery or autopsy, after less than 4 days of antibiotics",
  },
];

const MAJOR_DOMAINS: Array<[string, string]> = [
  ["microbiologic", "Microbiology"],
  ["imaging", "Imaging"],
  ["surgical", "Surgical"],
];
const MINOR_DOMAINS: Array<[string, string]> = [
  ["predisposition", "Predisposition"],
  ["fever", "Fever"],
  ["vascular", "Vascular"],
  ["immunologic", "Immunologic"],
  ["microbiologic", "Microbiology"],
  ["imaging", "Imaging"],
  ["physical_exam", "Physical examination"],
];

const BASIS_LABEL: Record<string, string> = {
  pathologic_criteria: "pathologic criteria",
  explicit_rejection_criteria: "explicit rejection criteria",
  two_major_criteria: "2 major criteria",
  one_major_and_three_minor_criteria: "1 major and 3 minor criteria",
  five_minor_criteria: "5 minor criteria",
  one_major_and_one_minor_criterion: "1 major and 1 minor criterion",
  three_minor_criteria: "3 minor criteria",
  below_possible_clinical_criteria: "below the possible threshold",
};

const PET_IMAGING_MAJOR = [
  "qualifying_native_valve_abnormal_uptake",
  "qualifying_implanted_intracardiac_material_uptake_at_least_three_months",
  "qualifying_ascending_aortic_graft_uptake_with_concomitant_valve_involvement_at_least_three_months",
];
const PET_IMAGING_MINOR = [
  "qualifying_implanted_intracardiac_material_uptake_less_than_three_months",
  "qualifying_ascending_aortic_graft_uptake_with_concomitant_valve_involvement_less_than_three_months",
];
const PATHOLOGIC_DEFINITE = [
  "qualifying_microorganism_identified_with_clinical_signs_of_active_ie",
  "active_endocarditis_identified",
];

const labelOf = (options: Choice<string>[], value: string | null) =>
  options.find((o) => o.value === value)?.label ?? "";

interface State {
  material: string[];
  pathologic: string | null;
  organism: string | null;
  sets: number | null;
  majorLab: string | null;
  otherMicro: string | null;
  anatomic: string | null;
  petCt: string | null;
  surgical: string | null;
  predisposition: string[];
  temperature: number | null;
  vascular: string[];
  immunologic: string[];
  auscultation: string | null;
  rejection: string[];
}

const blank = (): State => ({
  material: [],
  pathologic: null,
  organism: null,
  sets: null,
  majorLab: null,
  otherMicro: null,
  anatomic: null,
  petCt: null,
  surgical: null,
  predisposition: [],
  temperature: null,
  vascular: [],
  immunologic: [],
  auscultation: null,
  rejection: [],
});

/** Combinations the engine rejects as contradictory, in clinician language. */
function conflicts(s: State): string[] {
  const out: string[] = [];
  const has = (list: string[], v: string) => list.includes(v);
  const anyMaterial = s.material.length > 0;
  const pathologicDefinite = s.pathologic !== null && PATHOLOGIC_DEFINITE.includes(s.pathologic);
  const imagingMajor =
    (s.anatomic !== null && s.anatomic !== "none_or_nonqualifying") ||
    (s.petCt !== null && PET_IMAGING_MAJOR.includes(s.petCt));
  const anyCardiacImaging = imagingMajor || (s.petCt !== null && PET_IMAGING_MINOR.includes(s.petCt));
  const surgical = s.surgical === "direct_evidence_without_major_imaging_or_subsequent_pathologic_confirmation";
  const altMicro = has(s.rejection, "firm_alternate_microbiologic_diagnosis_all_three_conditions");
  const altNonMicro = has(s.rejection, "firm_alternate_nonmicrobiologic_diagnosis_both_conditions");
  const noIeAtSurgery = has(
    s.rejection,
    "no_pathologic_or_macroscopic_ie_at_surgery_or_autopsy_with_less_than_four_days_antibiotics",
  );

  if (has(s.predisposition, "previous_valve_repair_without_current_material") && has(s.material, "valve_repair_material")) {
    out.push("Previous valve repair with no material remaining contradicts current valve-repair material.");
  }
  if (s.anatomic === "new_partial_prosthetic_valve_dehiscence" && !has(s.material, "prosthetic_valve")) {
    out.push("Prosthetic-valve dehiscence needs a prosthetic valve ticked under intracardiac material.");
  }
  if (s.petCt !== null && s.petCt.startsWith("qualifying_implanted_intracardiac_material") && !anyMaterial) {
    out.push("PET/CT uptake on implanted intracardiac material needs at least one intracardiac material ticked.");
  }
  if (s.petCt === "isolated_generator_pocket_uptake" && !has(s.material, "endovascular_cied")) {
    out.push("Generator-pocket uptake needs an endovascular CIED ticked under intracardiac material.");
  }
  if (surgical && imagingMajor) {
    out.push("Direct surgical evidence counts only when there is no major imaging criterion.");
  }
  if (surgical && pathologicDefinite) {
    out.push("Direct surgical evidence without later pathologic confirmation contradicts the pathologic evidence entered.");
  }
  if (pathologicDefinite && (altMicro || altNonMicro || noIeAtSurgery)) {
    out.push("Pathologic evidence of IE contradicts a firm alternate diagnosis or no IE at surgery or autopsy.");
  }
  if (altMicro) {
    const typical =
      s.organism !== null &&
      (UNIVERSAL_TYPICAL.includes(s.organism) || (anyMaterial && PROSTHETIC_ONLY_TYPICAL.includes(s.organism)));
    if (s.organism === null || s.organism === "none" || typical) {
      out.push(
        "A firm alternate microbiological diagnosis needs positive blood cultures for an organism that is not typical for this patient.",
      );
    }
    if (anyCardiacImaging) {
      out.push("A firm alternate microbiological diagnosis needs no IE evidence on cardiac imaging.");
    }
  }
  if (altNonMicro && !altMicro) {
    const anyMicro =
      s.pathologic === "qualifying_microorganism_identified_with_clinical_signs_of_active_ie" ||
      s.pathologic === "unsupported_single_skin_bacterium_pcr_on_valve_or_wire" ||
      (s.organism !== null && s.organism !== "none" && s.organism !== "clinician_classified_organism_as_not_consistent_with_ie") ||
      (s.majorLab !== null && s.majorLab !== "none") ||
      (s.otherMicro !== null && s.otherMicro !== "none");
    if (anyMicro) {
      out.push("A firm alternate non-microbiological diagnosis needs no microbiological evidence of IE.");
    }
  }
  if (noIeAtSurgery && surgical) {
    out.push("Direct surgical evidence of IE contradicts no IE at surgery or autopsy.");
  }
  return out;
}

function Section({ title, hint }: { title: string; hint?: string }) {
  return (
    <Stack gap={2} mt="sm">
      <Text fw={600}>{title}</Text>
      {hint && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
      <Divider mt={4} />
    </Stack>
  );
}

function CheckboxSet({
  options,
  value,
  onChange,
}: {
  options: Choice<string>[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <>
      {options.map((o) => (
        <YesNoField
          key={o.value}
          label={o.label}
          hint={o.hint}
          checked={value.includes(o.value)}
          onChange={(checked) => {
            const next = checked ? [...value, o.value] : value.filter((v) => v !== o.value);
            onChange(options.filter((x) => next.includes(x.value)).map((x) => x.value));
          }}
        />
      ))}
    </>
  );
}

function GroupedChoice({
  label,
  hint,
  value,
  onChange,
  groups,
}: {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (value: string) => void;
  groups: OptionGroup[];
}) {
  return (
    <Radio.Group label={label} description={hint} value={value} onChange={onChange}>
      <Stack gap={8} mt={8}>
        {groups.map((g, i) => (
          <Fragment key={i}>
            {g.title && (
              <Stack gap={0} mt={6}>
                <Text size="sm" fw={600} c="dimmed">
                  {g.title}
                </Text>
                {g.hint && (
                  <Text size="xs" c="dimmed">
                    {g.hint}
                  </Text>
                )}
              </Stack>
            )}
            {g.options.map((o) => (
              <Radio key={o.value} value={o.value} label={o.label} description={o.hint} />
            ))}
          </Fragment>
        ))}
      </Stack>
    </Radio.Group>
  );
}

function DukeIscvidCalculator() {
  const [s, setS] = useState<State>(blank);
  const set = <K extends keyof State>(key: K) => (value: State[K]) => setS((prev) => ({ ...prev, [key]: value }));

  const problems = conflicts(s);
  const setsOk = s.organism === "none" || (inRange(s.sets, 1, 255) && Number.isInteger(s.sets));
  const temperatureOk = s.temperature === null || Number.isFinite(s.temperature);
  const complete =
    s.pathologic !== null &&
    s.organism !== null &&
    setsOk &&
    s.majorLab !== null &&
    s.otherMicro !== null &&
    s.anatomic !== null &&
    s.petCt !== null &&
    s.surgical !== null &&
    s.auscultation !== null &&
    temperatureOk &&
    problems.length === 0;

  const calc = useCalculation(
    "duke_iscvid",
    complete
      ? {
          assessment_context: CONTEXT,
          pathologic_evidence: s.pathologic,
          intracardiac_prosthetic_material: s.material,
          blood_culture_organism: s.organism,
          positive_blood_culture_sets: s.organism === "none" ? 0 : s.sets,
          major_laboratory_evidence: s.majorLab,
          anatomic_imaging_evidence: s.anatomic,
          pet_ct_evidence: s.petCt,
          surgical_inspection_evidence: s.surgical,
          predisposition: s.predisposition,
          maximum_documented_temperature_c: s.temperature,
          vascular_phenomena: s.vascular,
          immunologic_phenomena: s.immunologic,
          other_minor_microbiology: s.otherMicro,
          auscultation_evidence: s.auscultation,
          rejection_evidence: s.rejection,
        }
      : null,
  );

  const domains = (v: unknown, keys: Array<[string, string]>) => {
    const d = (v ?? {}) as Record<string, unknown>;
    return keys.filter(([k]) => d[k] === true).map(([, label]) => label);
  };

  const entered = (): string[] => {
    const lines: Array<string | false> = [
      s.material.length > 0 && `Intracardiac prosthetic material: ${s.material.map((v) => labelOf(MATERIAL, v)).join("; ")}`,
      s.pathologic !== "none" && `Pathology: ${labelOf(PATHOLOGIC, s.pathologic)}`,
      s.organism !== "none" && `Blood cultures: ${labelOf(ORGANISMS, s.organism)}, ${s.sets} positive set${s.sets === 1 ? "" : "s"}`,
      s.majorLab !== "none" && `Laboratory: ${labelOf(MAJOR_LAB, s.majorLab)}`,
      s.otherMicro !== "none" && `Other microbiology: ${labelOf(OTHER_MICRO, s.otherMicro)}`,
      s.anatomic !== "none_or_nonqualifying" && `Echocardiography or cardiac CT: ${labelOf(ANATOMIC, s.anatomic)}`,
      s.petCt !== "none_or_nonqualifying" && `FDG PET/CT uptake: ${labelOf(PET_CT, s.petCt)}`,
      s.surgical !== "none_or_nonqualifying" && `Surgery: ${labelOf(SURGICAL, s.surgical)}`,
      s.predisposition.length > 0 && `Predisposition: ${s.predisposition.map((v) => labelOf(PREDISPOSITION, v)).join("; ")}`,
      s.temperature !== null
        ? `Maximum documented temperature ${s.temperature} °C`
        : "No valid temperature measurement documented",
      s.vascular.length > 0 && `Vascular phenomena: ${s.vascular.map((v) => labelOf(VASCULAR, v)).join("; ")}`,
      s.immunologic.length > 0 && `Immunologic phenomena: ${s.immunologic.map((v) => labelOf(IMMUNOLOGIC, v)).join("; ")}`,
      s.auscultation !== "none_or_nonqualifying" && `Auscultation: ${labelOf(AUSCULTATION, s.auscultation)}`,
      s.rejection.length > 0 && `Rejection evidence: ${s.rejection.map((v) => labelOf(REJECTION, v)).join("; ")}`,
    ];
    return lines.filter((l): l is string => Boolean(l));
  };

  return (
    <CalculatorPage
      icon={IconHeartSearch}
      title="Duke-ISCVID criteria"
      badge="Suspected endocarditis"
      description="Clinician classification of suspected infective endocarditis as definite, possible, or rejected, using the corrected 2023 Duke-ISCVID research case definition (Fowler 2023). Enter the evidence; the criteria are derived. It supplements, never replaces, clinical judgement."
      onReset={() => setS(blank())}
      calc={calc}
      incomplete={
        problems.length > 0
          ? `Contradictory entries - resolve to classify: ${problems.join(" ")}`
          : "Answer every section to classify. Lists left unticked mean none."
      }
      maw={1100}
      form={
        <>
          <Section
            title="Intracardiac prosthetic material"
            hint="Current material only; tick each that applies. Any entry widens the organisms counted as typical. A prosthetic valve, valve-repair material, or endovascular CIED is also a predisposition."
          />
          <CheckboxSet options={MATERIAL} value={s.material} onChange={set("material")} />

          <Section title="Pathologic criteria" />
          <ChoiceField
            label="Pathologic evidence"
            hint="Molecular and staining results can persist after treated IE and can be false positive."
            value={s.pathologic}
            onChange={set("pathologic")}
            options={PATHOLOGIC}
          />

          <Section title="Microbiology" />
          <GroupedChoice
            label="Organism in positive blood cultures"
            value={s.organism}
            onChange={(v) => setS((prev) => ({ ...prev, organism: v, sets: v === "none" ? null : prev.sets }))}
            groups={ORGANISM_GROUPS}
          />
          {s.organism !== null && s.organism !== "none" && (
            <NumberField
              label="Positive blood-culture sets"
              hint="A set is one simultaneously drawn aerobic and anaerobic bottle pair, positive if either bottle grows the organism."
              value={s.sets}
              onChange={set("sets")}
              min={1}
              max={255}
              decimals={0}
            />
          )}
          <ChoiceField
            label="Other laboratory evidence (major)"
            hint="Coxiella IgG must be above 1:800; Bartonella IgG 1:800 or higher."
            value={s.majorLab}
            onChange={set("majorLab")}
            options={MAJOR_LAB}
          />
          <ChoiceField
            label="Other microbiology (minor)"
            hint="Counts only when there is no major microbiology criterion."
            value={s.otherMicro}
            onChange={set("otherMicro")}
            options={OTHER_MICRO}
          />

          <Section title="Imaging" />
          <ChoiceField
            label="Echocardiography or cardiac CT"
            hint="A vegetation is an oscillating intracardiac mass on a valve, cardiac tissue, endovascular CIED, or implanted material, with no other anatomic explanation."
            value={s.anatomic}
            onChange={set("anatomic")}
            options={ANATOMIC}
          />
          <ChoiceField
            label="FDG PET/CT"
            hint="Qualifying visually abnormal uptake. For prosthetic valves, use intense focal, multifocal, or heterogeneous uptake; some prostheses have intrinsic non-pathological uptake."
            value={s.petCt}
            onChange={set("petCt")}
            options={PET_CT}
          />

          <Section title="Surgery" />
          <ChoiceField
            label="Surgical inspection"
            hint="This does not justify omitting histopathologic and microbiologic sampling."
            value={s.surgical}
            onChange={set("surgical")}
            options={SURGICAL}
          />

          <Section title="Predisposition" hint="Tick each that applies. Current prosthetic material is entered above, not here." />
          <CheckboxSet options={PREDISPOSITION} value={s.predisposition} onChange={set("predisposition")} />

          <Section title="Fever" />
          <NumberField
            label="Maximum documented temperature"
            hint="Optional - leave empty if no valid measurement is documented. Fever needs above 38.0 °C; exactly 38.0 °C does not count."
            unit="°C"
            value={s.temperature}
            onChange={set("temperature")}
            decimals={1}
          />

          <Section title="Vascular phenomena" hint="Clinical or radiological; any one or more is a single minor criterion." />
          <CheckboxSet options={VASCULAR} value={s.vascular} onChange={set("vascular")} />

          <Section title="Immunologic phenomena" hint="Any one or more is a single minor criterion." />
          <CheckboxSet options={IMMUNOLOGIC} value={s.immunologic} onChange={set("immunologic")} />

          <Section title="Physical examination" />
          <ChoiceField
            label="Auscultation"
            value={s.auscultation}
            onChange={set("auscultation")}
            options={AUSCULTATION}
          />

          <Section
            title="Rejection evidence"
            hint="Tick each that applies. An explicit rejection route takes precedence over criterion counts unless pathologic criteria are met. Less than 4 days is strict."
          />
          <CheckboxSet options={REJECTION} value={s.rejection} onChange={set("rejection")} />

          {problems.length > 0 && (
            <Alert color="orange" variant="light" title="Contradictory entries">
              <List size="sm" spacing={4}>
                {problems.map((p) => (
                  <List.Item key={p}>{p}</List.Item>
                ))}
              </List>
            </Alert>
          )}
        </>
      }
      result={(r) => {
        const result = asText(r.result);
        return (
          <ScoreTile
            value={result ? result[0].toUpperCase() + result.slice(1) : ""}
            badge={BASIS_LABEL[asText(r.working.classification_basis)] ?? asText(r.working.classification_basis)}
          />
        );
      }}
      details={(r) => {
        const major = domains(r.working.major_domains, MAJOR_DOMAINS);
        const minor = domains(r.working.minor_domains, MINOR_DOMAINS);
        return (
          <Stack gap="sm">
            <Facts
              title="Criterion domains"
              items={[
                ["Major", fmt(r.working.major_count)],
                ["Minor", fmt(r.working.minor_count)],
                r.working.pathologic_definite === true && ["Pathologic criteria", "met"],
              ]}
            />
            <Facts title="Major domains met" items={major.map((m) => [m, "yes"] as [string, string])} />
            <Facts title="Minor domains met" items={minor.map((m) => [m, "yes"] as [string, string])} />
          </Stack>
        );
      }}
      summary={(r) => {
        const major = domains(r.working.major_domains, MAJOR_DOMAINS);
        const minor = domains(r.working.minor_domains, MINOR_DOMAINS);
        return summaryText({
          heading: `Duke-ISCVID (corrected 2023): ${asText(r.result) === "rejected" ? "IE rejected" : `${asText(r.result)} IE`} (${BASIS_LABEL[asText(r.working.classification_basis)] ?? asText(r.working.classification_basis)})`,
          interpretation: r.interpretation,
          findingsTitle: "Evidence entered",
          findings: entered(),
          extra: [
            `Major domains met (${fmt(r.working.major_count)}): ${major.length > 0 ? major.join(", ") : "none"}`,
            `Minor domains met (${fmt(r.working.minor_count)}): ${minor.length > 0 ? minor.join(", ") : "none"}`,
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "duke_iscvid", Component: DukeIscvidCalculator };
