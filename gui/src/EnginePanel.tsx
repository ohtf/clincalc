// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Accordion,
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Code,
  CopyButton,
  Group,
  ScrollArea,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import {
  IconCheck,
  IconCopy,
  IconLink,
  IconPlayerPlay,
  IconTerminal2,
} from "@tabler/icons-react";

import {
  calculate,
  engineVersion,
  getLastCalculation,
  inputTemplate,
  runtime,
  subscribeLastCalculation,
  type CalcSummary,
  type CalculationResponse,
} from "./api/calc";
import { useLocale } from "./locale";

const DOCS = "https://ohtf.github.io/clincalc";

interface Outcome {
  response: CalculationResponse | null;
  error: string | null;
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function shellQuote(text: string): string {
  return `'${text.replaceAll("'", `'\\''`)}'`;
}

function snippets(name: string, compactInput: string) {
  return {
    cli: `clincalc calc ${name} --input ${shellQuote(compactInput)}`,
    rest: [
      "clincalc api   # local REST API on 127.0.0.1:8080",
      `curl -s -X POST http://127.0.0.1:8080/calculators/${name} \\`,
      "  -H 'Content-Type: application/json' \\",
      `  -d ${shellQuote(compactInput)}`,
    ].join("\n"),
    python: [
      "import json, clincalc",
      `clincalc.calculate(${JSON.stringify(name)}, json.loads(${JSON.stringify(compactInput)}))`,
    ].join("\n"),
  };
}

function Snippet({ code }: { code: string }) {
  return (
    <Group align="flex-start" wrap="nowrap" gap="xs">
      <Code block style={{ flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
        {code}
      </Code>
      <CopyButton value={code} timeout={1500}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? "Copied" : "Copy"}>
            <ActionIcon variant="subtle" color={copied ? "teal" : "gray"} onClick={copy}>
              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </Group>
  );
}

function useFormCalculation(name: string) {
  const last = useSyncExternalStore(subscribeLastCalculation, getLastCalculation);
  return last?.name === name ? last : null;
}

/**
 * The engine contract under every calculator: the exact JSON the engine
 * received and returned, editable and re-runnable, plus the same call from
 * the CLI, REST API, and Python. For calculators with a hand-crafted form it
 * follows the form until the request is edited; for the rest it starts from
 * the input template `clincalc calc <name>` prints.
 */
export function EnginePanel({ calc, crafted }: { calc: CalcSummary; crafted: boolean }) {
  const locale = useLocale();
  const fromForm = useFormCalculation(calc.name);
  const [version, setVersion] = useState("");
  const [requestText, setRequestText] = useState("");
  const [edited, setEdited] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    engineVersion().then(setVersion).catch(() => setVersion(""));
  }, []);

  useEffect(() => {
    setEdited(false);
    setOutcome(null);
    if (crafted) return;
    let active = true;
    inputTemplate(calc.name)
      .then((template) => active && setRequestText(pretty(template)))
      .catch((e: unknown) => active && setRequestText(`// ${String(e)}`));
    return () => {
      active = false;
    };
  }, [calc.name, crafted, locale]);

  const following = crafted && !edited;
  const shownRequest = following && fromForm ? pretty(fromForm.input) : requestText;
  const shownOutcome: Outcome | null = following
    ? fromForm && { response: fromForm.response, error: fromForm.error }
    : outcome;

  let compactInput = "{}";
  try {
    compactInput = JSON.stringify(JSON.parse(shownRequest));
  } catch {
    compactInput = shownRequest.replace(/\s+/g, " ").trim();
  }
  const code = snippets(calc.name, compactInput);

  const run = async () => {
    let input: unknown;
    try {
      input = JSON.parse(shownRequest);
    } catch (e) {
      setOutcome({ response: null, error: `Request is not valid JSON: ${String(e)}` });
      setEdited(true);
      return;
    }
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      setOutcome({ response: null, error: "Request must be a JSON object." });
      setEdited(true);
      return;
    }
    setRunning(true);
    try {
      const response = await calculate(calc.name, input as Record<string, unknown>, {
        record: false,
      });
      setOutcome({ response, error: null });
    } catch (e) {
      setOutcome({ response: null, error: String(e) });
    } finally {
      setEdited(true);
      setRunning(false);
    }
  };

  const engineLine =
    runtime === "web"
      ? `clincalc ${version} compiled to WebAssembly, running in this page`
      : `clincalc ${version}, running natively`;

  return (
    <Accordion
      variant="separated"
      radius="lg"
      defaultValue={runtime === "web" ? "engine" : null}
      maw={920}
    >
      <Accordion.Item value="engine">
        <Accordion.Control icon={<IconTerminal2 size={20} />}>
          <Group gap="sm">
            <Text fw={700}>Under the hood: the engine contract</Text>
            {version && (
              <Badge variant="light" color="gray">
                {engineLine}
              </Badge>
            )}
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              clincalc is not just a web page: every calculator is one Rust engine that also
              ships as a command-line tool, a local REST API, an MCP server, a Python package,
              and an embeddable library. This is the exact JSON the engine received and returned
              - the same contract an EPR uses to embed it.
              {crafted
                ? " It follows the form above until you edit the request."
                : " Replace each placeholder with a value, then run it."}
            </Text>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              <Stack gap={6}>
                <Group justify="space-between">
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed">
                    Request
                  </Text>
                  <Group gap="xs">
                    {crafted && edited && (
                      <Button
                        size="compact-xs"
                        variant="subtle"
                        leftSection={<IconLink size={14} />}
                        onClick={() => setEdited(false)}
                      >
                        Follow the form
                      </Button>
                    )}
                    <Button
                      size="compact-sm"
                      leftSection={<IconPlayerPlay size={14} />}
                      onClick={run}
                      loading={running}
                    >
                      Run
                    </Button>
                  </Group>
                </Group>
                <Textarea
                  aria-label="Request JSON"
                  autosize
                  minRows={6}
                  maxRows={18}
                  spellCheck={false}
                  value={shownRequest}
                  onChange={(e) => {
                    setRequestText(e.currentTarget.value);
                    setEdited(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      void run();
                    }
                  }}
                  styles={{ input: { fontFamily: "var(--mantine-font-family-monospace)" } }}
                />
                <Text size="xs" c="dimmed">
                  Ctrl+Enter to run.
                </Text>
              </Stack>

              <Stack gap={6}>
                <Text size="xs" tt="uppercase" fw={600} c="dimmed">
                  Response
                </Text>
                {shownOutcome?.error && (
                  <Alert color="red" variant="light" title="The engine rejected this input">
                    <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                      {shownOutcome.error}
                    </Text>
                  </Alert>
                )}
                {shownOutcome?.response && (
                  <ScrollArea.Autosize mah={420}>
                    <Code block style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {pretty(shownOutcome.response)}
                    </Code>
                  </ScrollArea.Autosize>
                )}
                {!shownOutcome && (
                  <Text size="sm" c="dimmed">
                    Run the request to see the engine's response.
                  </Text>
                )}
              </Stack>
            </SimpleGrid>

            <Tabs defaultValue="cli" variant="outline">
              <Tabs.List>
                <Tabs.Tab value="cli">Command line</Tabs.Tab>
                <Tabs.Tab value="rest">REST API</Tabs.Tab>
                <Tabs.Tab value="python">Python</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="cli" pt="sm">
                <Snippet code={code.cli} />
              </Tabs.Panel>
              <Tabs.Panel value="rest" pt="sm">
                <Snippet code={code.rest} />
              </Tabs.Panel>
              <Tabs.Panel value="python" pt="sm">
                <Snippet code={code.python} />
              </Tabs.Panel>
            </Tabs>

            <Text size="xs" c="dimmed">
              <Anchor href={`${DOCS}/install/`} target="_blank" rel="noreferrer">
                Install clincalc
              </Anchor>
              {" · "}
              <Anchor href={`${DOCS}/cli-reference/`} target="_blank" rel="noreferrer">
                CLI reference
              </Anchor>
              {" · "}
              <Anchor href={`${DOCS}/mcp/`} target="_blank" rel="noreferrer">
                MCP server
              </Anchor>
              {" · "}
              <Anchor href={`${DOCS}/python/`} target="_blank" rel="noreferrer">
                Python package
              </Anchor>
            </Text>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
