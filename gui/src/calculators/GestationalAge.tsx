// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState, type ReactNode } from "react";
import { Alert, Button, Divider, Group, Radio, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconCalendarHeart } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asText,
  compact,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** Gestational age and due date from the LMP by Naegele's rule (ACOG Committee Opinion 700, 2017). */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY = { min: 1, max: 31 };
const YEAR = { min: 1900, max: 2200 };
const CYCLE = { min: 21, max: 45 };
const MAX_GESTATION_DAYS = 320;

interface DateParts {
  day: number | null;
  month: number | null;
  year: number | null;
}
interface CivilDate {
  year: number;
  month: number;
  day: number;
}

const emptyDate = (): DateParts => ({ day: null, month: null, year: null });

const isInt = (v: number | null, min: number, max: number): v is number =>
  inRange(v, min, max) && Number.isInteger(v);

/** The entered parts as a date, or null if incomplete or not a real calendar date. */
function toCivil(d: DateParts): CivilDate | null {
  if (!isInt(d.day, DAY.min, DAY.max) || !isInt(d.month, 1, 12) || !isInt(d.year, YEAR.min, YEAR.max)) {
    return null;
  }
  const check = new Date(Date.UTC(d.year, d.month - 1, d.day));
  return check.getUTCFullYear() === d.year && check.getUTCMonth() === d.month - 1 && check.getUTCDate() === d.day
    ? { year: d.year, month: d.month, day: d.day }
    : null;
}

const allEntered = (d: DateParts) => d.day !== null && d.month !== null && d.year !== null;

const dayNumber = (d: CivilDate) => Date.UTC(d.year, d.month - 1, d.day) / 86_400_000;

const longDate = (d: CivilDate) => `${d.day} ${MONTHS[d.month - 1]} ${d.year}`;

/** "2026-07-04" from the engine, shown with the month in words to avoid day/month ambiguity. */
function longIso(iso: unknown): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(asText(iso));
  return m ? longDate({ year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }) : asText(iso);
}

function DateFields({
  label,
  hint,
  value,
  onChange,
  action,
}: {
  label: string;
  hint: string;
  value: DateParts;
  onChange: (value: DateParts) => void;
  action?: ReactNode;
}) {
  const invalid = allEntered(value) && toCivil(value) === null && isInt(value.day, DAY.min, DAY.max) && isInt(value.year, YEAR.min, YEAR.max);
  return (
    <Stack gap={6}>
      <Group justify="space-between" align="flex-end">
        <div>
          <Text fw={600}>{label}</Text>
          <Text size="xs" c="dimmed">
            {hint}
          </Text>
        </div>
        {action}
      </Group>
      <Radio.Group
        label="Month"
        value={value.month === null ? null : String(value.month)}
        onChange={(v) => onChange({ ...value, month: Number(v) })}
      >
        <SimpleGrid cols={6} spacing={8} verticalSpacing={8} mt={6}>
          {MONTHS.map((m, i) => (
            <Radio key={m} value={String(i + 1)} label={m.slice(0, 3)} aria-label={m} />
          ))}
        </SimpleGrid>
      </Radio.Group>
      <SimpleGrid cols={2} spacing="sm">
        <NumberField
          label="Day"
          value={value.day}
          onChange={(day) => onChange({ ...value, day })}
          min={DAY.min}
          max={DAY.max}
          decimals={0}
        />
        <NumberField
          label="Year"
          value={value.year}
          onChange={(year) => onChange({ ...value, year })}
          min={YEAR.min}
          max={YEAR.max}
          decimals={0}
        />
      </SimpleGrid>
      {invalid && (
        <Text size="xs" c="red">
          Not a valid calendar date.
        </Text>
      )}
    </Stack>
  );
}

function GestationalAgeCalculator() {
  const [lmp, setLmp] = useState<DateParts>(emptyDate);
  const [reference, setReference] = useState<DateParts>(emptyDate);
  const [cycle, setCycle] = useState<number | null>(null);

  const lmpDate = toCivil(lmp);
  const refDate = toCivil(reference);
  const gap = lmpDate && refDate ? dayNumber(refDate) - dayNumber(lmpDate) : null;
  const gapOk = gap !== null && gap >= 0 && gap <= MAX_GESTATION_DAYS;
  const cycleOk = cycle === null || isInt(cycle, CYCLE.min, CYCLE.max);

  const complete = lmpDate !== null && refDate !== null && gapOk && cycleOk;
  const calc = useCalculation(
    "gestational_age",
    complete
      ? compact({ last_menstrual_period: lmpDate, reference_date: refDate, cycle_length_days: cycle })
      : null,
  );

  const today = () => {
    const now = new Date();
    setReference({ day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() });
  };

  return (
    <CalculatorPage
      icon={IconCalendarHeart}
      title="Gestational age and due date"
      badge="Pregnancy dating"
      description="Gestational age and estimated due date from the first day of the last menstrual period by Naegele's rule, with the ACOG cycle-length adjustment (ACOG Committee Opinion 700, 2017). First-trimester ultrasound dating supersedes this when available."
      onReset={() => {
        setLmp(emptyDate());
        setReference(emptyDate());
        setCycle(null);
      }}
      calc={calc}
      incomplete="Enter the LMP and the date to calculate at."
      form={
        <>
          <DateFields
            label="Last menstrual period"
            hint="First day of the last menstrual period."
            value={lmp}
            onChange={setLmp}
          />
          <Divider />
          <DateFields
            label="Calculate at"
            hint="The date to give the gestational age for, usually today."
            value={reference}
            onChange={setReference}
            action={
              <Button variant="light" size="xs" color="teal" onClick={today}>
                Today
              </Button>
            }
          />
          {gap !== null && !gapOk && (
            <Alert color="orange" variant="light">
              {gap < 0
                ? "The date to calculate at is before the LMP."
                : `The date to calculate at is ${gap} days after the LMP; the calculator accepts up to ${MAX_GESTATION_DAYS} days.`}
            </Alert>
          )}
          <Divider />
          <NumberField
            label="Usual cycle length"
            hint="Optional. Naegele's rule assumes a 28-day cycle; a usual cycle length moves the due date by the difference."
            unit="days"
            value={cycle}
            onChange={setCycle}
            min={CYCLE.min}
            max={CYCLE.max}
            decimals={0}
          />
        </>
      }
      result={(r) => <ScoreTile value={asText(r.result)} badge={`trimester ${fmt(r.working.trimester)}`} />}
      details={(r) => (
        <Facts
          items={[
            ["Estimated due date", longIso(r.working.estimated_due_date)],
            ["Cycle-length adjusted", r.working.cycle_adjusted === true ? "yes" : "no"],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Gestational age ${asText(r.result)} (trimester ${fmt(r.working.trimester)}); EDD ${longIso(r.working.estimated_due_date)}`,
          interpretation: r.interpretation,
          findingsTitle: "Dates",
          findings: [
            lmpDate && `LMP ${longDate(lmpDate)}`,
            refDate && `Calculated at ${longDate(refDate)}`,
            cycle !== null && `Usual cycle length ${cycle} days`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "gestational_age", Component: GestationalAgeCalculator };
