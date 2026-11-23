// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { ReactNode } from "react";
import {
  Checkbox,
  Group,
  NumberInput,
  Radio,
  SegmentedControl,
  Stack,
  Text,
} from "@mantine/core";

/** A yes/no criterion. Unticked means "absent", so only use it where the
 * source treats absence as the default. */
export function YesNoField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Checkbox
      size="md"
      label={label}
      description={hint}
      checked={checked}
      // Read `.checked` synchronously: React may run a functional state
      // updater after the synthetic event's currentTarget is cleared.
      onChange={(e) => onChange(e.currentTarget.checked)}
    />
  );
}

export interface Choice<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/**
 * One of a fixed set of options. `radio` (default) stacks options with long
 * labels, points, or hints; `inline` lays two to four short options (units,
 * Yes/No, Positive/Negative) in a row; `segmented` is a compact toggle.
 */
export function ChoiceField<T extends string>({
  label,
  hint,
  value,
  onChange,
  options,
  layout = "radio",
}: {
  label: ReactNode;
  hint?: ReactNode;
  value: T | null;
  onChange: (value: T) => void;
  options: Choice<T>[];
  layout?: "radio" | "inline" | "segmented";
}) {
  if (layout === "inline") {
    return (
      <Radio.Group label={label} description={hint} value={value} onChange={(v) => onChange(v as T)}>
        <Group gap="lg" mt={8}>
          {options.map((o) => (
            <Radio key={o.value} value={o.value} label={o.label} />
          ))}
        </Group>
      </Radio.Group>
    );
  }
  if (layout === "segmented") {
    return (
      <Stack gap={4}>
        <Text size="sm" fw={500}>
          {label}
        </Text>
        {hint && (
          <Text size="xs" c="dimmed">
            {hint}
          </Text>
        )}
        <SegmentedControl
          fullWidth
          value={value ?? ""}
          onChange={(v) => onChange(v as T)}
          data={options.map((o) => ({ value: o.value, label: o.label }))}
        />
      </Stack>
    );
  }
  return (
    <Radio.Group label={label} description={hint} value={value} onChange={(v) => onChange(v as T)}>
      <Stack gap={8} mt={8}>
        {options.map((o) => (
          <Radio key={o.value} value={o.value} label={o.label} description={o.hint} />
        ))}
      </Stack>
    </Radio.Group>
  );
}

/** True when `value` is a finite number within [min, max] (bounds optional). */
export function inRange(value: number | null, min?: number, max?: number): value is number {
  return (
    value !== null &&
    Number.isFinite(value) &&
    (min === undefined || value >= min) &&
    (max === undefined || value <= max)
  );
}

/**
 * A measured number with its unit. Empty means "not entered" (null), never
 * zero, and an out-of-range value is flagged rather than silently clamped -
 * the form should treat either as incomplete (see `inRange`).
 */
export function NumberField({
  label,
  hint,
  unit,
  value,
  onChange,
  min,
  max,
  step,
  decimals,
}: {
  label: ReactNode;
  hint?: ReactNode;
  unit?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
}) {
  const outOfRange = value !== null && !inRange(value, min, max);
  const range =
    min !== undefined && max !== undefined
      ? `${min}–${max}`
      : min !== undefined
        ? `at least ${min}`
        : `at most ${max}`;
  return (
    <NumberInput
      label={label}
      description={hint}
      value={value ?? ""}
      onChange={(v) => {
        if (v === "" || v === "-") return onChange(null);
        const n = typeof v === "number" ? v : Number(v);
        onChange(Number.isFinite(n) ? n : null);
      }}
      min={min}
      max={max}
      step={step}
      decimalScale={decimals}
      allowDecimal={decimals !== 0}
      allowNegative={min === undefined || min < 0}
      clampBehavior="none"
      hideControls
      rightSection={
        unit ? (
          <Text size="xs" c="dimmed" pr={8} style={{ whiteSpace: "nowrap" }}>
            {unit}
          </Text>
        ) : undefined
      }
      rightSectionWidth={unit ? "auto" : undefined}
      error={outOfRange ? `Expected ${range}${unit ? ` ${unit}` : ""}` : undefined}
      data-min={min}
      data-max={max}
    />
  );
}
