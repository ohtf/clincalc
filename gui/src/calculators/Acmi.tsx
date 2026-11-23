// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  MultiSelect,
  Paper,
  Progress,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconCopy,
  IconPill,
  IconRefresh,
} from "@tabler/icons-react";

import { calculate, type CalculationResponse } from "../api/calc";
import type { CalculatorModule } from "../kit";

/**
 * ACMI (Anticholinergic Medication Index): cumulative anticholinergic
 * burden (0-100) from a patient's current prescriptions (Best et al, BMJ
 * Medicine 2026). The only input is which of 88 medications the patient
 * currently takes, so the form is a single searchable multi-select rather
 * than 88 checkboxes - the natural shape of medication reconciliation.
 *
 * `MEDICATIONS` must stay in sync with `MEDICATION_SLUGS`/`display_name()`
 * in `src/calculators/acmi.rs`; there is no runtime schema fetch here,
 * matching every other hand-crafted calculator in this GUI.
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

interface MedicationBreakdown {
  name: string;
  acmi_contribution: number;
}

function asNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function medicationsFromWorking(
  working: Record<string, unknown>,
): MedicationBreakdown[] {
  const raw = working.medications;
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const e = entry as Record<string, unknown>;
    return {
      name: String(e.name ?? ""),
      acmi_contribution: asNumber(e.acmi_contribution),
    };
  });
}

function buildClipboardSummary(r: CalculationResponse): string {
  const breakdown = medicationsFromWorking(r.working ?? {})
    .slice()
    .sort((a, b) => b.acmi_contribution - a.acmi_contribution);

  const lines = breakdown.map(
    (m) => `- ${m.name} (${m.acmi_contribution.toFixed(1)})`,
  );

  return [
    `ACMI ${asNumber(r.result).toFixed(1)} / 100`,
    "",
    r.interpretation ?? "",
    "",
    lines.length > 0
      ? "Contributing medications:\n" + lines.join("\n")
      : "No scored anticholinergic medications currently entered.",
  ].join("\n");
}

export function AcmiCalculator() {
  const [selected, setSelected] = useState<string[]>([]);
  const [response, setResponse] = useState<CalculationResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clipboardText, setClipboardText] = useState("");

  useEffect(() => {
    let cancelled = false;
    setPending(true);
    setError(null);
    calculate("acmi", { medications: selected })
      .then((r) => {
        if (cancelled) return;
        setResponse(r);
        setClipboardText(buildClipboardSummary(r));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(String(e));
        setResponse(null);
      })
      .finally(() => !cancelled && setPending(false));
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const score = asNumber(response?.result ?? 0);
  const breakdown = medicationsFromWorking(response?.working ?? {})
    .slice()
    .sort((a, b) => b.acmi_contribution - a.acmi_contribution);

  const reset = () => setSelected([]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(clipboardText);
      notifications.show({
        title: "Copied",
        message: "Result on the clipboard - paste anywhere.",
        color: "teal",
        icon: <IconCheck size={18} />,
        autoClose: 2000,
      });
    } catch {
      notifications.show({
        title: "Copy failed",
        message: "Select the text above and copy manually.",
        color: "red",
        icon: <IconAlertCircle size={18} />,
      });
    }
  };

  return (
    <Stack gap="xl" maw={920}>
      <Group justify="space-between" align="flex-start">
        <Box>
          <Group gap="sm" mb={4}>
            <ThemeIcon size="lg" variant="light" color="teal" radius="md">
              <IconPill size={22} />
            </ThemeIcon>
            <Title order={2}>ACMI</Title>
            <Badge color="teal" variant="light">
              Anticholinergic burden
            </Badge>
          </Group>
          <Text c="dimmed" size="sm">
            Cumulative anticholinergic burden (0-100) from current
            prescriptions, weighted by a clinical prediction model for falls
            and delirium in adults aged over 65 (Best et al, BMJ Medicine
            2026).
          </Text>
        </Box>
        <Tooltip label="Clear all medications">
          <ActionIcon variant="subtle" color="gray" onClick={reset} size="lg">
            <IconRefresh size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Group className="calc-columns" align="stretch" gap="lg" wrap="nowrap">
        <Card withBorder padding="lg" radius="lg" style={{ flex: 1 }}>
          <Stack gap="md">
            <Text fw={600}>Current anticholinergic medications</Text>
            <Divider />
            <MultiSelect
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
              International non-proprietary names, one entry per distinct
              drug. Formulation, brand, dose, and &ldquo;as required&rdquo;
              (PRN) status are not distinguished - the primary model treats
              any use as binary. A medication not among these 88 is not
              scored, not an error.
            </Text>
            {selected.includes("isosorbide") && (
              <Text size="xs" c="dimmed">
                &ldquo;Isosorbide&rdquo; covers both the mononitrate and
                dinitrate esters - the primary source does not specify which.
              </Text>
            )}
          </Stack>
        </Card>

        <Card
          withBorder
          padding="lg"
          radius="lg"
          style={{ flex: 1 }}
          bg="var(--mantine-color-default-hover)"
        >
          <Stack gap="md" h="100%">
            <Text fw={600} c="dimmed" size="sm" tt="uppercase">
              Result
            </Text>

            {pending && !response && (
              <Group gap="xs">
                <Loader size="xs" />
                <Text c="dimmed">Computing…</Text>
              </Group>
            )}
            {error && (
              <Text c="red" size="sm">
                {error}
              </Text>
            )}

            {response && (
              <>
                <Group align="baseline" gap="xs">
                  <Title order={1} c="teal" fz={64} lh={1}>
                    {score.toFixed(1)}
                  </Title>
                  <Text c="dimmed" fz="lg">
                    / 100
                  </Text>
                  <Badge ml="auto" color="teal" variant="light" size="lg">
                    {breakdown.length} medication
                    {breakdown.length === 1 ? "" : "s"}
                  </Badge>
                </Group>
                <Progress value={Math.min(score, 100)} color="teal" size="sm" />

                <Text size="sm" style={{ lineHeight: 1.55 }}>
                  0 means no scored anticholinergic medications currently
                  prescribed; 100 is the hypothetical ceiling for a patient
                  prescribed all 88 scored medications. There are no
                  published risk bands for this scale - it ranks cumulative
                  burden relative to other patients, it is not a diagnosis.
                </Text>

                {breakdown.length > 0 && (
                  <>
                    <Divider my={4} />
                    <Stack gap={4}>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                        Contributing medications
                      </Text>
                      <Group gap="xs" wrap="wrap">
                        {breakdown.map((m) => (
                          <Badge key={m.name} variant="outline" color="gray">
                            {m.name} ({m.acmi_contribution.toFixed(1)})
                          </Badge>
                        ))}
                      </Group>
                    </Stack>
                  </>
                )}
              </>
            )}
          </Stack>
        </Card>
      </Group>

      {response && (
        <Paper
          withBorder
          radius="lg"
          p="lg"
          className="clipboard-preview"
          style={{
            borderColor: "var(--mantine-color-teal-4)",
            borderWidth: 2,
          }}
        >
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <Box>
                <Text fw={700} size="md">
                  Paste-ready summary
                </Text>
                <Text size="xs" c="dimmed">
                  Edit freely before copying - your edits are preserved.
                </Text>
              </Box>
              <Button
                leftSection={<IconCopy size={16} />}
                color="teal"
                onClick={copy}
              >
                Copy result
              </Button>
            </Group>
            <Textarea
              autosize
              minRows={8}
              maxRows={12}
              value={clipboardText}
              onChange={(e) => setClipboardText(e.currentTarget.value)}
              styles={{
                input: {
                  background: "var(--mantine-color-body)",
                },
              }}
            />
            <Text size="xs" c="dimmed">
              Reference: {response.reference}
            </Text>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

export const calculator: CalculatorModule = { name: "acmi", Component: AcmiCalculator };
