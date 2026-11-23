// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconHandFinger } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** DAS28 (ESR or CRP) disease activity in rheumatoid arthritis (Prevoo 1995). */

type Marker = "esr" | "crp";

const MARKERS: Choice<Marker>[] = [
  { value: "esr", label: "ESR (DAS28-ESR)" },
  { value: "crp", label: "CRP (DAS28-CRP)" },
];

const MARKER_UNIT: Record<Marker, string> = { esr: "mm/hr", crp: "mg/L" };

const JOINTS = { min: 0, max: 28 };
const GLOBAL = { min: 0, max: 100 };

const ACTIVITY_LABEL: Record<string, string> = {
  remission: "remission",
  low: "low disease activity",
  moderate: "moderate disease activity",
  high: "high disease activity",
};
const ACTIVITY_COLOUR: Record<string, string> = {
  remission: "teal",
  low: "teal",
  moderate: "yellow",
  high: "red",
};

function Das28Calculator() {
  const [tender, setTender] = useState<number | null>(null);
  const [swollen, setSwollen] = useState<number | null>(null);
  const [marker, setMarker] = useState<Marker | null>(null);
  const [markerValue, setMarkerValue] = useState<number | null>(null);
  const [globalHealth, setGlobalHealth] = useState<number | null>(null);

  const complete =
    inRange(tender, JOINTS.min, JOINTS.max) &&
    Number.isInteger(tender) &&
    inRange(swollen, JOINTS.min, JOINTS.max) &&
    Number.isInteger(swollen) &&
    marker !== null &&
    inRange(markerValue, 0) &&
    markerValue > 0 &&
    inRange(globalHealth, GLOBAL.min, GLOBAL.max);
  const calc = useCalculation(
    "das28",
    complete
      ? {
          tender_joint_count: tender,
          swollen_joint_count: swollen,
          marker,
          marker_value: markerValue,
          global_health: globalHealth,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconHandFinger}
      title="DAS28"
      badge="Rheumatoid arthritis"
      description="Disease Activity Score in 28 joints from tender and swollen joint counts, ESR or CRP, and patient global health (Prevoo 1995). DAS28-ESR and DAS28-CRP are not interchangeable: track a patient with one variant."
      onReset={() => {
        setTender(null);
        setSwollen(null);
        setMarker(null);
        setMarkerValue(null);
        setGlobalHealth(null);
      }}
      calc={calc}
      incomplete="Enter both joint counts, choose the marker and enter its value, and enter patient global health to calculate."
      form={
        <>
          <Text fw={600} size="sm">
            28-joint counts
          </Text>
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Tender joints"
              unit="/ 28"
              value={tender}
              onChange={setTender}
              min={JOINTS.min}
              max={JOINTS.max}
              decimals={0}
            />
            <NumberField
              label="Swollen joints"
              unit="/ 28"
              value={swollen}
              onChange={setSwollen}
              min={JOINTS.min}
              max={JOINTS.max}
              decimals={0}
            />
          </SimpleGrid>
          <Text fw={600} size="sm" mt="xs">
            Inflammatory marker
          </Text>
          <Divider />
          <ChoiceField
            label="Marker used"
            hint="Selects the formula and the unit of the value below."
            value={marker}
            onChange={setMarker}
            options={MARKERS}
          />
          <NumberField
            label={marker === null ? "Marker value" : marker === "esr" ? "ESR" : "CRP"}
            hint={
              marker === null
                ? "Choose ESR or CRP first: ESR in mm/hr, CRP in mg/L."
                : marker === "crp"
                  ? "In mg/L, not mg/dL. Must be greater than 0."
                  : "In mm/hr. Must be greater than 0."
            }
            unit={marker === null ? undefined : MARKER_UNIT[marker]}
            value={markerValue}
            onChange={setMarkerValue}
            min={0}
            decimals={1}
          />
          {markerValue === 0 && (
            <Text size="xs" c="red">
              The marker value must be greater than 0.
            </Text>
          )}
          <Text fw={600} size="sm" mt="xs">
            Patient assessment
          </Text>
          <Divider />
          <NumberField
            label="Patient global health"
            hint="Visual analogue scale, 0 to 100 mm."
            unit="mm"
            value={globalHealth}
            onChange={setGlobalHealth}
            min={GLOBAL.min}
            max={GLOBAL.max}
            decimals={1}
          />
        </>
      }
      result={(r) => {
        const activity = asText(r.working.activity);
        return (
          <ScoreTile
            value={fmt(r.result, 2)}
            colour={ACTIVITY_COLOUR[activity] ?? "teal"}
            badge={ACTIVITY_LABEL[activity] ?? activity}
          />
        );
      }}
      details={(r) => <Facts items={[["Formula", asText(r.working.formula)]]} />}
      summary={(r) => {
        const activity = asText(r.working.activity);
        return summaryText({
          heading: `${asText(r.working.formula)} ${fmt(r.result, 2)} (${ACTIVITY_LABEL[activity] ?? activity})`,
          interpretation: r.interpretation,
          findingsTitle: "Assessment",
          findings: [
            `Tender joint count ${tender} / 28`,
            `Swollen joint count ${swollen} / 28`,
            marker !== null && `${marker.toUpperCase()} ${markerValue} ${MARKER_UNIT[marker]}`,
            `Patient global health ${globalHealth} mm`,
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "das28", Component: Das28Calculator };
