// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useState, type ReactElement } from "react";
import {
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Burger,
  Center,
  Group,
  Loader,
  NavLink,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconBook,
  IconBrandGithub,
  IconLanguage,
  IconMoon,
  IconSearch,
  IconSun,
} from "@tabler/icons-react";

import logoUrl from "/logo.svg";
import {
  calculate,
  compiledLocales,
  listCalculators,
  runtime,
  type CalculationResponse,
  type CalcSummary,
} from "./api/calc";
import { EnginePanel } from "./EnginePanel";
import { localeLabel, setLocale, textDirectionFor, useLocale } from "./locale";
import { AcmiCalculator } from "./calculators/Acmi";
import { Cha2ds2VascCalculator } from "./calculators/Cha2ds2Vasc";
import { Curb65Calculator } from "./calculators/Curb65";
import { FeverPainCalculator } from "./calculators/FeverPain";
import { GcsCalculator } from "./calculators/Gcs";
import { News2Calculator } from "./calculators/News2";
import { Phq9Calculator } from "./calculators/Phq9";
import { QdiabetesCalculator } from "./calculators/Qdiabetes";
import { Qrisk3Calculator } from "./calculators/Qrisk3";
import { RockallCalculator } from "./calculators/Rockall";
import { WellsPeCalculator } from "./calculators/WellsPe";

/**
 * Which calculators have a hand-crafted UI today. As we build more, we add
 * an entry here mapping the machine name to its React component. Anything
 * not in this set shows the "coming soon" placeholder when selected,
 * rather than a broken page.
 */
const IMPLEMENTED: Record<string, () => ReactElement> = {
  feverpain: FeverPainCalculator,
  cha2ds2vasc: Cha2ds2VascCalculator,
  acmi: AcmiCalculator,
  qrisk3: Qrisk3Calculator,
  gcs: GcsCalculator,
  curb65: Curb65Calculator,
  news2: News2Calculator,
  wells_pe: WellsPeCalculator,
  qdiabetes: QdiabetesCalculator,
  rockall: RockallCalculator,
  phq9: Phq9Calculator,
};

/**
 * The shortlist that sits at the top of the sidebar. Ordering reflects
 * the user's stated priorities for the first GUI cut: FeverPAIN as the
 * MVP, then CHA2DS2-VASc and QRISK3 (both politically high-impact - QRISK3
 * is still not implemented in EMIS or SystmOne).
 */
const FEATURED = ["feverpain", "cha2ds2vasc", "qrisk3"];

const DEFAULT_CALCULATOR = "feverpain";

const DOCS_URL = "https://ohtf.github.io/clincalc/";

function calculatorFromHash(): string {
  return decodeURIComponent(window.location.hash.slice(1)) || DEFAULT_CALCULATOR;
}

function ComingSoon({ calc }: { calc: CalcSummary }) {
  return (
    <Stack gap="md" maw={620}>
      <Title order={2}>{calc.title}</Title>
      <Text c="dimmed">{calc.description}</Text>
      <Box
        p="lg"
        style={{
          border: "1px dashed var(--mantine-color-default-border)",
          borderRadius: "var(--mantine-radius-md)",
        }}
      >
        <Text fw={600} mb={4}>
          Form coming soon
        </Text>
        <Text size="sm" c="dimmed">
          The scoring logic for this calculator already ships in the engine -
          the forms are being built calculator by calculator, each one
          hand-crafted so it fits the clinical question. Until then you can run
          it below by filling in its input template, exactly as{" "}
          <code>{`clincalc calc ${calc.name}`}</code> does on the command line.
        </Text>
      </Box>
    </Stack>
  );
}

/**
 * Shown on every page of the hosted browser build. Deliberately not
 * dismissable: see regulatory/position-published-source-not-a-device.md
 * section 6 - the web playground is demarcated as an evaluation tool.
 */
function PlaygroundNotice() {
  return (
    <Group
      gap="xs"
      px="lg"
      h={36}
      wrap="nowrap"
      bg="var(--mantine-color-yellow-light)"
      role="note"
      aria-label="Evaluation playground notice"
    >
      <IconAlertTriangle size={16} style={{ flexShrink: 0 }} />
      <Text size="xs" fw={600} truncate>
        Evaluation playground - not for clinical decisions about real patients.
        <Text span size="xs" fw={400} visibleFrom="sm" inherit>
          {" "}
          Everything runs in your browser; nothing you enter leaves this page.
        </Text>
      </Text>
    </Group>
  );
}

function Unavailable({ calc }: { calc: CalcSummary }) {
  const [response, setResponse] = useState<CalculationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setResponse(null);
    setError(null);
    calculate(calc.name, {})
      .then((result) => {
        if (active) setResponse(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(String(reason));
      });
    return () => {
      active = false;
    };
  }, [calc.name]);

  return (
    <Stack gap="md" maw={720}>
      <Group gap="sm">
        <Title order={2}>{calc.title}</Title>
        <Badge color={calc.proprietary ? "red" : "orange"} variant="light">
          unavailable
        </Badge>
      </Group>
      <Text c="dimmed">{calc.description}</Text>
      <Box
        p="lg"
        style={{
          border: "1px solid var(--mantine-color-default-border)",
          borderRadius: "var(--mantine-radius-md)",
        }}
      >
        {!response && !error && <Loader size="sm" />}
        {error && (
          <Stack gap="xs">
            <Text fw={600} c="red">
              Could not load unavailability details
            </Text>
            <Text size="sm" c="dimmed">
              {error}
            </Text>
          </Stack>
        )}
        {response && (
          <Stack gap="sm">
            <Text fw={600}>{response.result}</Text>
            <Text size="sm">{response.interpretation}</Text>
            <Text
              component="a"
              href={response.reference}
              target="_blank"
              rel="noreferrer"
              size="sm"
            >
              Review source
            </Text>
          </Stack>
        )}
      </Box>
    </Stack>
  );
}

function Brand() {
  return (
    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
      <img
        src={logoUrl}
        alt=""
        aria-hidden
        width={28}
        height={28}
        style={{ flexShrink: 0 }}
      />
      <Box style={{ minWidth: 0 }}>
        <Text className="brand-wordmark" fz="xl" c="teal">
          clincalc
        </Text>
        <Text size="xs" c="dimmed" lh={1}>
          open clinical calculators
        </Text>
      </Box>
    </Group>
  );
}

function ColorSchemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      onClick={() => toggleColorScheme()}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  );
}

/**
 * The locale picker. Options come from `compiled_locales` rather than a
 * hard-coded list, so the GUI never drifts from what the engine actually
 * ships. No calculator advertises a non-English bundle yet, so picking
 * `es`/`ca` today only changes CLI/REST/MCP-visible metadata that already
 * falls back to English everywhere here too - this is the plumbing ready
 * for when a calculator's first reviewed translation lands.
 */
function LocalePicker() {
  const locale = useLocale();
  const [options, setOptions] = useState<string[]>(["en"]);

  useEffect(() => {
    compiledLocales()
      .then(setOptions)
      .catch(() => {
        // Keep the English-only default; the catalogue load error (if any)
        // is already surfaced elsewhere.
      });
  }, []);

  if (options.length <= 1) return null;

  return (
    <Select
      aria-label="Locale"
      leftSection={<IconLanguage size={16} />}
      data={options.map((tag) => ({ value: tag, label: localeLabel(tag) }))}
      value={locale}
      onChange={(value) => value && setLocale(value)}
      size="xs"
      w={120}
      allowDeselect={false}
      comboboxProps={{ withinPortal: true }}
    />
  );
}

export default function App() {
  const locale = useLocale();
  const [calcs, setCalcs] = useState<CalcSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>(calculatorFromHash);
  const [query, setQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    listCalculators()
      .then(setCalcs)
      .catch((e: unknown) => setError(String(e)));
  }, [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = textDirectionFor(locale);
  }, [locale]);

  // `#name` in the URL selects a calculator, so a page can be bookmarked or
  // linked to (the docs catalogue can deep-link to `try/#acmi`).
  useEffect(() => {
    const onHashChange = () => setSelected(calculatorFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (calcs && !calcs.some((c) => c.name === selected)) {
      setSelected(DEFAULT_CALCULATOR);
    }
  }, [calcs, selected]);

  const filtered = (calcs ?? []).filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.name.includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.tags.some((t) => t.includes(q))
    );
  });

  // Featured calcs at the top (in declared order); everything else
  // alphabetically below.
  const featured = filtered.filter((c) => FEATURED.includes(c.name));
  featured.sort((a, b) => FEATURED.indexOf(a.name) - FEATURED.indexOf(b.name));
  const others = filtered
    .filter((c) => !FEATURED.includes(c.name))
    .sort((a, b) => a.title.localeCompare(b.title));

  const current = calcs?.find((c) => c.name === selected) ?? null;
  const Body = current && IMPLEMENTED[current.name];
  const selectCalculator = (name: string) => {
    window.location.hash = encodeURIComponent(name);
    setSelected(name);
    setMobileNavOpen(false);
  };

  useEffect(() => {
    document.title = current ? `${current.title} - clincalc` : "clincalc";
  }, [current]);

  const web = runtime === "web";

  return (
    <AppShell
      header={{ height: web ? 92 : 56 }}
      navbar={{
        width: 280,
        breakpoint: "sm",
        collapsed: { mobile: !mobileNavOpen },
      }}
      padding="lg"
    >
      <AppShell.Header>
        {web && <PlaygroundNotice />}
        <Group h={56} px="lg" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger
              opened={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
              hiddenFrom="sm"
              size="sm"
              aria-label="Toggle calculator navigation"
            />
            <Brand />
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Box visibleFrom="sm">
              <LocalePicker />
            </Box>
            <ColorSchemeToggle />
            <ActionIcon
              variant="subtle"
              color="gray"
              component="a"
              href={DOCS_URL}
              target="_blank"
              rel="noreferrer"
              title="Documentation"
            >
              <IconBook size={18} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              component="a"
              href="https://github.com/ohtf/clincalc"
              target="_blank"
              rel="noreferrer"
              title="View on GitHub"
            >
              <IconBrandGithub size={18} />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <Stack gap="xs" h="100%">
          <TextInput
            placeholder="Filter calculators…"
            leftSection={<IconSearch size={14} />}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            size="sm"
          />

          <Box className="sidebar-scroll">
            <Stack gap={2}>
              {!calcs && !error && (
                <Center py="xl">
                  <Loader size="xs" />
                </Center>
              )}
              {error && (
                <Text size="sm" c="red" p="sm">
                  {error}
                </Text>
              )}

              {featured.length > 0 && (
                <Text size="xs" tt="uppercase" c="dimmed" px="sm" pt={6}>
                  Featured
                </Text>
              )}
              {featured.map((c) => (
                <CalcLink
                  key={c.name}
                  calc={c}
                  active={selected === c.name}
                  implemented={c.name in IMPLEMENTED}
                  onClick={() => selectCalculator(c.name)}
                />
              ))}

              {others.length > 0 && (
                <Text size="xs" tt="uppercase" c="dimmed" px="sm" pt="md">
                  All calculators ({others.length})
                </Text>
              )}
              {others.map((c) => (
                <CalcLink
                  key={c.name}
                  calc={c}
                  active={selected === c.name}
                  implemented={c.name in IMPLEMENTED}
                  onClick={() => selectCalculator(c.name)}
                />
              ))}
            </Stack>
          </Box>

          <Text size="xs" c="dimmed" px="sm">
            {calcs?.length ?? 0} calculators - {Object.keys(IMPLEMENTED).length}{" "}
            hand-crafted UIs so far
          </Text>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main className="app-main">
        {error && (
          <Center h="60vh">
            <Stack gap="xs" maw={560}>
              <Title order={2} c="red">
                Could not load calculators
              </Title>
              <Text c="dimmed">
                The desktop shell opened, but the calculator catalogue could not
                be loaded from the Rust engine.
              </Text>
              <Text
                component="pre"
                size="sm"
                c="red"
                style={{ whiteSpace: "pre-wrap" }}
              >
                {error}
              </Text>
            </Stack>
          </Center>
        )}
        {!error && !current && (
          <Center h="60vh">
            <Loader />
          </Center>
        )}
        {!error && current?.unavailable && <Unavailable calc={current} />}
        {!error && current && !current.unavailable && (
          <Stack gap="xl">
            {Body ? <Body key={current.name} /> : <ComingSoon calc={current} />}
            <EnginePanel calc={current} crafted={!!Body} />
          </Stack>
        )}
      </AppShell.Main>
    </AppShell>
  );
}

function CalcLink({
  calc,
  active,
  implemented,
  onClick,
}: {
  calc: CalcSummary;
  active: boolean;
  implemented: boolean;
  onClick: () => void;
}) {
  return (
    <NavLink
      active={active}
      onClick={onClick}
      label={
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Text size="sm" truncate>
            {calc.title}
          </Text>
          {calc.unavailable && (
            <Badge
              size="xs"
              color={calc.proprietary ? "red" : "orange"}
              variant="light"
            >
              unavailable
            </Badge>
          )}
          {!calc.unavailable && implemented && (
            <Badge size="xs" color="teal" variant="light">
              ready
            </Badge>
          )}
        </Group>
      }
      description={
        <Text size="xs" c="dimmed">
          {calc.name}
        </Text>
      }
    />
  );
}
