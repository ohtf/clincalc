// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconCheck, IconCopy, IconRefresh } from "@tabler/icons-react";

import type { CalculationResponse } from "../api/calc";
import type { Calculation } from "./useCalculation";

export interface CalculatorPageProps {
  icon: ComponentType<{ size?: number | string }>;
  title: string;
  /** Short clinical context, e.g. "Acute sore throat". */
  badge?: string;
  /** One or two sentences: what it estimates, for whom, and the source. */
  description: ReactNode;
  onReset: () => void;
  /** Heading above the form, e.g. "Tick each criterion that applies". */
  formTitle?: string;
  form: ReactNode;
  calc: Calculation;
  /** Shown instead of a result while `calc.input` is null. */
  incomplete?: string;
  /** The headline: usually a ScoreTile plus a band badge. */
  result: (response: CalculationResponse) => ReactNode;
  /** Optional detail under the interpretation, e.g. Facts. */
  details?: (response: CalculationResponse) => ReactNode;
  /** The paste-ready text; see `summaryText`. */
  summary: (response: CalculationResponse) => string;
  maw?: number;
}

/**
 * The page every hand-crafted calculator shares: header, form card, live
 * result card, and the editable paste-ready summary (the "soft
 * interoperability" headline). Calculators supply only what is specific to
 * them - their fields, their headline, and their summary wording.
 */
export function CalculatorPage({
  icon: Icon,
  title,
  badge,
  description,
  onReset,
  formTitle,
  form,
  calc,
  incomplete = "Complete the form to calculate.",
  result,
  details,
  summary,
  maw = 960,
}: CalculatorPageProps) {
  const { response, error, pending, input } = calc;
  const [clipboardText, setClipboardText] = useState("");

  useEffect(() => {
    setClipboardText(response ? summary(response) : "");
    // Keyed on `response` alone: `summary` closes over the form state that
    // produced it, and a new response always follows any input change.
  }, [response]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(clipboardText);
      notifications.show({
        title: "Copied",
        message: `${title} result on the clipboard - paste anywhere.`,
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
    <Stack gap="xl" maw={maw}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Box>
          <Group gap="sm" mb={4}>
            <ThemeIcon size="lg" variant="light" color="teal" radius="md">
              <Icon size={22} />
            </ThemeIcon>
            <Title order={2}>{title}</Title>
            {badge && (
              <Badge color="teal" variant="light">
                {badge}
              </Badge>
            )}
          </Group>
          <Text c="dimmed" size="sm">
            {description}
          </Text>
        </Box>
        <Tooltip label="Reset the form">
          <ActionIcon variant="subtle" color="gray" onClick={onReset} size="lg" aria-label="Reset the form">
            <IconRefresh size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Group className="calc-columns" align="stretch" gap="lg" wrap="nowrap">
        <Card withBorder padding="lg" radius="lg" style={{ flex: 1 }}>
          <Stack gap="md">
            {formTitle && (
              <>
                <Text fw={600}>{formTitle}</Text>
                <Divider />
              </>
            )}
            {form}
          </Stack>
        </Card>

        <Card
          withBorder
          padding="lg"
          radius="lg"
          style={{ flex: 1 }}
          bg="var(--mantine-color-default-hover)"
          data-result-state={
            input === null ? "incomplete" : error ? "error" : response ? "ready" : "pending"
          }
        >
          <Stack gap="md">
            <Text fw={600} c="dimmed" size="sm" tt="uppercase">
              Result
            </Text>
            {input === null && (
              <Text c="dimmed" size="sm">
                {incomplete}
              </Text>
            )}
            {input !== null && pending && !response && !error && (
              <Group gap="xs">
                <Loader size="xs" />
                <Text c="dimmed">Computing…</Text>
              </Group>
            )}
            {input !== null && error && (
              <Alert color="red" variant="light" title="The engine could not score this input">
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                  {error}
                </Text>
              </Alert>
            )}
            {input !== null && response && !error && (
              <>
                {result(response)}
                <Text size="sm" style={{ lineHeight: 1.55 }}>
                  {response.interpretation}
                </Text>
                {details && (
                  <>
                    <Divider my={4} />
                    {details(response)}
                  </>
                )}
              </>
            )}
          </Stack>
        </Card>
      </Group>

      {input !== null && response && !error && (
        <Paper
          withBorder
          radius="lg"
          p="lg"
          className="clipboard-preview"
          style={{ borderColor: "var(--mantine-color-teal-4)", borderWidth: 2 }}
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
              <Button leftSection={<IconCopy size={16} />} color="teal" onClick={copy}>
                Copy result
              </Button>
            </Group>
            <Textarea
              aria-label="Paste-ready summary"
              autosize
              minRows={6}
              maxRows={14}
              value={clipboardText}
              onChange={(e) => setClipboardText(e.currentTarget.value)}
              styles={{ input: { background: "var(--mantine-color-body)" } }}
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
