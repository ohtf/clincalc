// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Badge, Group, MultiSelect, Progress, Stack, Text } from "@mantine/core";
import { IconPill } from "@tabler/icons-react";

import {
  CalculatorPage,
  ScoreTile,
  asNumber,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/**
 * ACMI (Anticholinergic Medication Index), cumulative anticholinergic burden
 * 0-100 (Best et al, BMJ Medicine 2026). `MEDICATIONS` must stay in sync with
 * `MEDICATION_SLUGS`/`display_name()` in `src/calculators/acmi.rs`.
 */

const MEDICATIONS: Array<{ value: string; label: string }> = [
  { value: "alverine", label: "Alverine" },
  { value: "amantadine", label: "Amantadine" },
  { value: "amisulpride", label: "Amisulpride" },
  { value: "amitriptyline", label: "Amitriptyline" },
  { value: "aripiprazole", label: "Aripiprazole" },
  { value: "atenolol", label: "Atenolol" },
  { value: "atropine", label: "Atropine" },
  { value: "baclofen", label: "Baclofen" },
  { value: "bendroflumethiazide", label: "Bendroflumethiazide" },
  { value: "betamethasone", label: "Betamethasone" },
  { value: "bumetanide", label: "Bumetanide" },
  { value: "buprenorphine", label: "Buprenorphine" },
  { value: "captopril", label: "Captopril" },
  { value: "carbamazepine", label: "Carbamazepine" },
  { value: "cetirizine", label: "Cetirizine" },
  { value: "chlorphenamine", label: "Chlorphenamine" },
  { value: "chlorpromazine", label: "Chlorpromazine" },
  { value: "cimetidine", label: "Cimetidine" },
  { value: "cinnarizine", label: "Cinnarizine" },
  { value: "citalopram", label: "Citalopram" },
  { value: "clomipramine", label: "Clomipramine" },
  { value: "clonazepam", label: "Clonazepam" },
  { value: "clonidine", label: "Clonidine" },
  { value: "codeine", label: "Codeine" },
  { value: "colchicine", label: "Colchicine" },
  { value: "cyclizine", label: "Cyclizine" },
  { value: "darifenacin", label: "Darifenacin" },
  { value: "desloratadine", label: "Desloratadine" },
  { value: "dexamethasone", label: "Dexamethasone" },
  { value: "diazepam", label: "Diazepam" },
  { value: "digoxin", label: "Digoxin" },
  { value: "dihydrocodeine", label: "Dihydrocodeine" },
  { value: "dipyridamole", label: "Dipyridamole" },
  { value: "dosulepin", label: "Dosulepin" },
  { value: "doxazosin", label: "Doxazosin" },
  { value: "escitalopram", label: "Escitalopram" },
  { value: "fentanyl", label: "Fentanyl" },
  { value: "fesoterodine", label: "Fesoterodine" },
  { value: "fexofenadine", label: "Fexofenadine" },
  { value: "fluoxetine", label: "Fluoxetine" },
  { value: "flupentixol", label: "Flupentixol" },
  { value: "furosemide", label: "Furosemide" },
  { value: "glycopyrronium_bromide", label: "Glycopyrronium bromide" },
  { value: "haloperidol", label: "Haloperidol" },
  { value: "hydralazine", label: "Hydralazine" },
  { value: "hydrochlorothiazide", label: "Hydrochlorothiazide" },
  { value: "hydrocortisone", label: "Hydrocortisone" },
  { value: "hydroxyzine", label: "Hydroxyzine" },
  { value: "hyoscine", label: "Hyoscine" },
  { value: "imipramine", label: "Imipramine" },
  { value: "indapamide", label: "Indapamide" },
  { value: "indoramin", label: "Indoramin" },
  { value: "ipratropium", label: "Ipratropium" },
  { value: "isosorbide", label: "Isosorbide" },
  { value: "loperamide", label: "Loperamide" },
  { value: "loratadine", label: "Loratadine" },
  { value: "lorazepam", label: "Lorazepam" },
  { value: "mebeverine", label: "Mebeverine" },
  { value: "metoprolol", label: "Metoprolol" },
  { value: "midazolam", label: "Midazolam" },
  { value: "mirtazapine", label: "Mirtazapine" },
  { value: "morphine", label: "Morphine" },
  { value: "nefopam", label: "Nefopam" },
  { value: "nifedipine", label: "Nifedipine" },
  { value: "nortriptyline", label: "Nortriptyline" },
  { value: "olanzapine", label: "Olanzapine" },
  { value: "oxybutynin", label: "Oxybutynin" },
  { value: "oxycodone", label: "Oxycodone" },
  { value: "paroxetine", label: "Paroxetine" },
  { value: "prednisolone", label: "Prednisolone" },
  { value: "prochlorperazine", label: "Prochlorperazine" },
  { value: "procyclidine", label: "Procyclidine" },
  { value: "promethazine", label: "Promethazine" },
  { value: "quetiapine", label: "Quetiapine" },
  { value: "ranitidine", label: "Ranitidine" },
  { value: "risperidone", label: "Risperidone" },
  { value: "solifenacin", label: "Solifenacin" },
  { value: "temazepam", label: "Temazepam" },
  { value: "theophylline", label: "Theophylline" },
  { value: "tiotropium_bromide", label: "Tiotropium bromide" },
  { value: "tolterodine", label: "Tolterodine" },
  { value: "tramadol", label: "Tramadol" },
  { value: "trazodone", label: "Trazodone" },
  { value: "trihexyphenidyl", label: "Trihexyphenidyl" },
  { value: "trospium_chloride", label: "Trospium chloride" },
  { value: "umeclidinium", label: "Umeclidinium" },
  { value: "venlafaxine", label: "Venlafaxine" },
  { value: "warfarin", label: "Warfarin" },
];

interface Contribution {
  name: string;
  contribution: number;
}

function contributions(working: Record<string, unknown>): Contribution[] {
  const raw = working.medications;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const e = entry as Record<string, unknown>;
      return { name: String(e.name ?? ""), contribution: asNumber(e.acmi_contribution) ?? 0 };
    })
    .sort((a, b) => b.contribution - a.contribution);
}

const score = (v: unknown) => asNumber(v) ?? 0;

export function AcmiCalculator() {
  const [selected, setSelected] = useState<string[]>([]);

  const calc = useCalculation("acmi", { medications: selected });

  return (
    <CalculatorPage
      icon={IconPill}
      title="ACMI"
      badge="Anticholinergic burden"
      description="Cumulative anticholinergic burden (0-100) from current prescriptions, weighted by a clinical prediction model for falls and delirium in adults aged over 65 (Best et al, BMJ Medicine 2026)."
      onReset={() => setSelected([])}
      formTitle="Current anticholinergic medications"
      calc={calc}
      maw={920}
      form={
        <>
          <MultiSelect
            aria-label="Current anticholinergic medications"
            data={MEDICATIONS}
            value={selected}
            onChange={setSelected}
            searchable
            clearable
            placeholder="Search by drug name…"
            nothingFoundMessage="No medication matches"
            hidePickedOptions
            limit={20}
            maxDropdownHeight={320}
          />
          <Text size="xs" c="dimmed">
            International non-proprietary names, one entry per distinct drug. Formulation, brand,
            dose, and &ldquo;as required&rdquo; (PRN) status are not distinguished - the primary
            model treats any use as binary. A medication not among these 88 is not scored, not an
            error.
          </Text>
          {selected.includes("isosorbide") && (
            <Text size="xs" c="dimmed">
              &ldquo;Isosorbide&rdquo; covers both the mononitrate and dinitrate esters - the
              primary source does not specify which.
            </Text>
          )}
        </>
      }
      result={(r) => {
        const count = contributions(r.working).length;
        return (
          <>
            <ScoreTile
              value={score(r.result).toFixed(1)}
              outOf={100}
              badge={`${count} medication${count === 1 ? "" : "s"}`}
            />
            <Progress value={Math.min(score(r.result), 100)} color="teal" size="sm" />
          </>
        );
      }}
      details={(r) => {
        const breakdown = contributions(r.working);
        return (
          <Stack gap="sm">
            <Text size="xs" c="dimmed">
              There are no published risk bands for this scale - it ranks cumulative burden
              relative to other patients, it is not a diagnosis.
            </Text>
            {breakdown.length > 0 && (
              <Stack gap={4}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  Contributing medications
                </Text>
                <Group gap="xs" wrap="wrap">
                  {breakdown.map((m) => (
                    <Badge
                      key={m.name}
                      variant="outline"
                      color="gray"
                      style={{ textTransform: "none" }}
                    >
                      {m.name} ({m.contribution.toFixed(1)})
                    </Badge>
                  ))}
                </Group>
              </Stack>
            )}
          </Stack>
        );
      }}
      summary={(r) => {
        const breakdown = contributions(r.working);
        return summaryText({
          heading: `ACMI ${score(r.result).toFixed(1)} / 100`,
          interpretation: r.interpretation,
          findingsTitle: "Contributing medications",
          findings: breakdown.map((m) => `${m.name} (${m.contribution.toFixed(1)})`),
          extra: [
            breakdown.length === 0 && "No scored anticholinergic medications currently entered.",
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "acmi", Component: AcmiCalculator };
