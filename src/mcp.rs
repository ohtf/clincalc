// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

//! Feature-gated Model Context Protocol server surface.
//!
//! This module exposes every calculator in [`crate::all`] as an MCP tool. It is
//! compiled only with the optional `mcp` feature so the default-features-off
//! engine remains a serde-only leaf.

use std::borrow::Cow;
use std::sync::Arc;

use rmcp::model::{
    CallToolRequestParams, CallToolResponse, CallToolResult, ContentBlock, ErrorCode,
    Implementation, JsonObject, ListToolsResult, PaginatedRequestParams, RequestMetaObject,
    ServerCapabilities, ServerConfig, Tool, ToolAnnotations,
};
use rmcp::service::RequestContext;
use rmcp::transport::stdio;
use rmcp::{ErrorData as McpError, RoleServer, ServerHandler, ServiceExt};
use serde_json::Value;

use crate::{Calculator, SupportedLocale};

const TOOL_PREFIX: &str = "clincalc_";

/// `_meta` key for an explicit per-call locale override, read from
/// [`CallToolRequestParams::meta`] / [`PaginatedRequestParams::meta`].
///
/// Namespaced per the MCP spec's `_meta` key convention (reverse-DNS prefix;
/// a second label of `modelcontextprotocol` or `mcp` is reserved for the spec
/// itself, so this uses OHTF's own domain instead).
const LOCALE_META_KEY: &str = "org.openhealthtechnology.clincalc/locale";

/// Resolve the locale for one call: an explicit [`LOCALE_META_KEY`] override
/// in `_meta`, or the session default. `available_locales` bounds what an
/// explicit override may resolve to - every compiled locale for a tool
/// listing, or one calculator's own advertised bundles for a call - mirroring
/// the REST surface's "an explicit locale must be one the calculator
/// advertises" rule (`src/api.rs`). An override that resolves to nothing in
/// `available_locales` fails clearly rather than silently falling back,
/// exactly like an unsupported explicit `?locale=` on the REST surface.
/// Absent entirely, this falls back to the session default without error:
/// each calculator's own `*_for` method already falls back to English when
/// the session locale is not one it advertises.
fn negotiate_call_locale(
    meta: Option<&RequestMetaObject>,
    session_locale: SupportedLocale,
    available_locales: &[SupportedLocale],
) -> Result<SupportedLocale, McpError> {
    let Some(tag) = meta
        .and_then(|meta| meta.get(LOCALE_META_KEY))
        .and_then(Value::as_str)
    else {
        return Ok(session_locale);
    };

    crate::lookup_locale(tag, available_locales).ok_or_else(|| {
        McpError::invalid_params(
            format!(
                "unsupported locale `{tag}` for `_meta` key `{LOCALE_META_KEY}`; available locales: {}",
                available_locales
                    .iter()
                    .map(ToString::to_string)
                    .collect::<Vec<_>>()
                    .join(", "),
            ),
            None,
        )
    })
}

/// Start the local stdio MCP server and wait until the host closes it.
pub async fn serve_stdio() -> anyhow::Result<()> {
    serve_stdio_with_locale(SupportedLocale::En).await
}

/// Start the local stdio MCP server with a configured session locale.
///
/// The locale is fixed for the life of the session: tool titles, descriptions,
/// input schemas, and calculation responses are served in it. A calculator that
/// does not advertise the locale is served in English as a whole, never mixed.
pub async fn serve_stdio_with_locale(locale: SupportedLocale) -> anyhow::Result<()> {
    let service = CalcMcpServer::with_locale(locale).serve(stdio()).await?;
    service.waiting().await?;
    Ok(())
}

/// Registry-backed MCP server for all calculators.
#[derive(Debug, Clone, Copy, Default)]
pub struct CalcMcpServer {
    locale: SupportedLocale,
}

impl CalcMcpServer {
    /// Create a server whose session locale is `locale`.
    pub fn with_locale(locale: SupportedLocale) -> Self {
        Self { locale }
    }

    fn tools(&self) -> Vec<Tool> {
        self.tools_for(self.locale)
    }

    fn tools_for(&self, locale: SupportedLocale) -> Vec<Tool> {
        crate::all()
            .into_iter()
            .map(|calc| tool_for_calculator(calc.as_ref(), locale))
            .collect()
    }

    fn calculator_for_tool(&self, tool_name: &str) -> Option<Box<dyn Calculator>> {
        crate::all()
            .into_iter()
            .find(|calc| tool_name_for_calculator(calc.name()) == tool_name)
    }
}

impl ServerHandler for CalcMcpServer {
    fn get_info(&self) -> ServerConfig {
        ServerConfig::new(ServerCapabilities::builder().enable_tools().build())
            .with_server_info(
                Implementation::new("clincalc", env!("CARGO_PKG_VERSION"))
                    .with_title("clincalc MCP server")
                    .with_description("Open, auditable clinical calculators exposed as MCP tools"),
            )
            .with_instructions(
                "Each tool is a clinical calculator from the clincalc registry. Provide the required JSON inputs exactly as described by the tool schema; missing or invalid clinical inputs return a validation error.",
            )
    }

    async fn list_tools(
        &self,
        request: Option<PaginatedRequestParams>,
        _context: RequestContext<RoleServer>,
    ) -> Result<ListToolsResult, McpError> {
        let meta = request.as_ref().and_then(|request| request.meta.as_ref());
        let locale = negotiate_call_locale(meta, self.locale, crate::COMPILED_LOCALES)?;
        Ok(ListToolsResult::with_all_items(self.tools_for(locale)))
    }

    fn get_tool(&self, name: &str) -> Option<Tool> {
        self.tools().into_iter().find(|tool| tool.name == name)
    }

    async fn call_tool(
        &self,
        request: CallToolRequestParams,
        _context: RequestContext<RoleServer>,
    ) -> Result<CallToolResponse, McpError> {
        self.call_calculator_tool(&request.name, request.arguments, request.meta.as_ref())
            .map(CallToolResponse::from)
    }
}

impl CalcMcpServer {
    fn call_calculator_tool(
        &self,
        tool_name: &str,
        arguments: Option<JsonObject>,
        meta: Option<&RequestMetaObject>,
    ) -> Result<CallToolResult, McpError> {
        let calc = self.calculator_for_tool(tool_name).ok_or_else(|| {
            McpError::new(
                ErrorCode::METHOD_NOT_FOUND,
                format!("unknown calculator tool: {tool_name}"),
                None,
            )
        })?;
        let locale = negotiate_call_locale(meta, self.locale, calc.supported_locales())?;

        let input = Value::Object(arguments.unwrap_or_default());
        let response = match calc.calculate_for(&input, locale) {
            Ok(response) => response,
            Err(err) => {
                return Ok(CallToolResult::error(vec![ContentBlock::text(format!(
                    "{} input was invalid: {err}",
                    calc.name()
                ))]));
            }
        };

        let structured = serde_json::to_value(response).map_err(|err| {
            McpError::internal_error(
                format!("failed to serialise {} response: {err}", calc.name()),
                None,
            )
        })?;

        Ok(CallToolResult::structured(structured))
    }
}

fn tool_for_calculator(calc: &dyn Calculator, locale: SupportedLocale) -> Tool {
    let lic = calc.license();
    let schema = schema_object(calc.input_schema_for(locale));
    let description = format!(
        "{} Reference: {} Licence: {} ({})",
        calc.description_for(locale),
        calc.reference(),
        lic.license,
        lic.source_url
    );

    Tool::new(
        Cow::Owned(tool_name_for_calculator(calc.name())),
        Cow::Owned(description),
        Arc::new(schema),
    )
    .with_title(calc.title_for(locale))
    .with_annotations(
        ToolAnnotations::with_title(calc.title_for(locale))
            .read_only(true)
            .destructive(false)
            .idempotent(true)
            .open_world(false),
    )
}

fn schema_object(schema: Value) -> JsonObject {
    match schema {
        Value::Object(object) => object,
        _ => JsonObject::new(),
    }
}

/// Convert a calculator machine name into a valid MCP tool name.
pub fn tool_name_for_calculator(name: &str) -> String {
    let mut out = String::from(TOOL_PREFIX);
    for ch in name.chars() {
        if ch.is_ascii_alphanumeric() || ch == '_' {
            out.push(ch);
        } else {
            out.push('_');
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use std::collections::{HashMap, HashSet};

    use super::*;

    #[test]
    fn every_calculator_has_one_tool() {
        let server = CalcMcpServer::default();
        assert_eq!(server.tools().len(), crate::all().len());
    }

    #[test]
    fn tool_schemas_match_calculator_schemas() {
        let by_name: HashMap<_, _> = CalcMcpServer::default()
            .tools()
            .into_iter()
            .map(|tool| (tool.name.to_string(), tool))
            .collect();

        for calc in crate::all() {
            let tool_name = tool_name_for_calculator(calc.name());
            let tool = by_name
                .get(&tool_name)
                .unwrap_or_else(|| panic!("missing tool for {}", calc.name()));
            assert_eq!(
                Value::Object((*tool.input_schema).clone()),
                calc.input_schema()
            );
        }
    }

    #[test]
    fn tool_names_are_collision_free() {
        let mut seen = HashSet::new();
        for calc in crate::all() {
            let tool_name = tool_name_for_calculator(calc.name());
            assert!(
                seen.insert(tool_name.clone()),
                "duplicate MCP tool name: {tool_name}"
            );
        }
    }

    #[test]
    fn mcp_dispatch_matches_direct_calculation() {
        let server = CalcMcpServer::default();
        let input = serde_json::json!({
            "fever": true,
            "purulence": true,
            "attend_rapidly": true,
            "inflamed_tonsils": false,
            "absence_of_cough": false
        });

        let direct = crate::get("feverpain")
            .expect("feverpain calculator exists")
            .calculate_for(&input, SupportedLocale::En)
            .expect("direct feverpain calculation succeeds");
        let arguments = input.as_object().expect("input is an object").clone();
        let via_mcp = server
            .call_calculator_tool("clincalc_feverpain", Some(arguments), None)
            .expect("mcp feverpain calculation succeeds");

        assert_eq!(
            via_mcp.structured_content,
            Some(serde_json::to_value(direct).unwrap())
        );
        assert_eq!(via_mcp.is_error, Some(false));
    }

    #[test]
    fn proprietary_stubs_are_exposed_and_callable() {
        let server = CalcMcpServer::default();
        let proprietary = crate::all()
            .into_iter()
            .find(|calc| calc.tags().contains(&"proprietary"))
            .expect("at least one proprietary stub is registered");
        let tool_name = tool_name_for_calculator(proprietary.name());

        assert!(server.get_tool(&tool_name).is_some());
        let result = server
            .call_calculator_tool(&tool_name, Some(JsonObject::new()), None)
            .expect("proprietary stub call succeeds");
        assert_eq!(result.is_error, Some(false));
        assert!(result.structured_content.is_some());
    }

    #[test]
    fn session_locale_localises_tools_and_falls_back_whole() {
        let es = CalcMcpServer::with_locale(SupportedLocale::Es);

        for calc in crate::all() {
            let tool = es
                .get_tool(&tool_name_for_calculator(calc.name()))
                .unwrap_or_else(|| panic!("missing tool for {}", calc.name()));
            // `*_for` falls back to English as a whole for unadvertised locales.
            assert_eq!(
                tool.title.as_deref(),
                Some(calc.title_for(SupportedLocale::Es))
            );
            assert_eq!(
                Value::Object((*tool.input_schema).clone()),
                calc.input_schema_for(SupportedLocale::Es)
            );
        }
    }

    #[test]
    fn session_locale_is_applied_to_calls() {
        let es = CalcMcpServer::with_locale(SupportedLocale::Es);
        let result = es
            .call_calculator_tool("clincalc_feverpain", Some(JsonObject::new()), None)
            .expect("call succeeds");
        let direct = crate::get("feverpain")
            .expect("feverpain exists")
            .calculate_for(&serde_json::json!({}), SupportedLocale::Es);
        assert_eq!(result.is_error == Some(true), direct.is_err());
    }

    fn meta_with_locale(tag: &str) -> RequestMetaObject {
        let mut raw = JsonObject::new();
        raw.insert(LOCALE_META_KEY.to_string(), Value::String(tag.into()));
        RequestMetaObject(rmcp::model::MetaObject(raw))
    }

    #[test]
    fn negotiate_call_locale_falls_back_to_session_default_when_absent() {
        let resolved =
            negotiate_call_locale(None, SupportedLocale::Es, crate::COMPILED_LOCALES).unwrap();
        assert_eq!(resolved, SupportedLocale::Es);
    }

    #[test]
    fn negotiate_call_locale_prefers_an_explicit_meta_override() {
        let meta = meta_with_locale("ca");
        let resolved =
            negotiate_call_locale(Some(&meta), SupportedLocale::En, crate::COMPILED_LOCALES)
                .expect("ca is compiled");
        assert_eq!(resolved, SupportedLocale::Ca);
    }

    #[test]
    fn negotiate_call_locale_rejects_an_override_outside_available_locales() {
        let meta = meta_with_locale("es");
        let err = negotiate_call_locale(Some(&meta), SupportedLocale::En, crate::ENGLISH_ONLY)
            .expect_err("es is not in the available set");
        assert_eq!(err.code, ErrorCode::INVALID_PARAMS);
    }

    #[test]
    fn call_tool_rejects_a_meta_locale_the_calculator_does_not_advertise() {
        let server = CalcMcpServer::default();
        let meta = meta_with_locale("es");
        let err = server
            .call_calculator_tool("clincalc_feverpain", Some(JsonObject::new()), Some(&meta))
            .expect_err("feverpain does not advertise es");
        assert_eq!(err.code, ErrorCode::INVALID_PARAMS);
    }

    #[test]
    fn call_tool_meta_locale_overrides_the_session_default() {
        // Session locale is Spanish, but the per-call override requests
        // English explicitly - the override wins, and English is always
        // every calculator's own advertised fallback.
        let server = CalcMcpServer::with_locale(SupportedLocale::Es);
        let meta = meta_with_locale("en");
        let arguments = serde_json::json!({
            "fever": true,
            "purulence": true,
            "attend_rapidly": true,
            "inflamed_tonsils": false,
            "absence_of_cough": false
        })
        .as_object()
        .unwrap()
        .clone();
        let result = server
            .call_calculator_tool("clincalc_feverpain", Some(arguments), Some(&meta))
            .expect("en is always advertised");
        assert_eq!(result.is_error, Some(false));
    }
}
