// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { ReactNode } from "react";
import { Badge, Group, Stack, Text, Title } from "@mantine/core";

/**
 * The headline number. `colour` should come from the source's own bands;
 * where the source publishes none, leave it teal rather than inventing one.
 */
export function ScoreTile({
  value,
  outOf,
  unit,
  colour = "teal",
  badge,
}: {
  value: ReactNode;
  outOf?: number | string;
  unit?: string;
  colour?: string;
  badge?: ReactNode;
}) {
  return (
    <Group align="baseline" gap="xs" wrap="wrap">
      <Title order={1} c={colour} fz={56} lh={1}>
        {value}
      </Title>
      {outOf !== undefined && (
        <Text c="dimmed" fz="lg">
          / {outOf}
        </Text>
      )}
      {unit && (
        <Text c="dimmed" fz="lg">
          {unit}
        </Text>
      )}
      {badge !== undefined && badge !== null && badge !== "" && (
        <Badge ml="auto" color={colour} variant="light" size="lg">
          {badge}
        </Badge>
      )}
    </Group>
  );
}

/** Labelled values from `working`, e.g. sub-scores or intermediate results. */
export function Facts({
  title = "Working",
  items,
}: {
  title?: string;
  items: Array<[label: string, value: ReactNode] | false | null | undefined>;
}) {
  const shown = items.filter(Boolean) as Array<[string, ReactNode]>;
  if (shown.length === 0) return null;
  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {title}
      </Text>
      <Group gap="xs" wrap="wrap">
        {shown.map(([label, value]) => (
          <Badge key={label} variant="outline" color="gray" style={{ textTransform: "none" }}>
            {label}: {value}
          </Badge>
        ))}
      </Group>
    </Stack>
  );
}
