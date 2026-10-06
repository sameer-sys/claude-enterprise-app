---
name: composio-workflows
description: Use Composio for dynamic app discovery, connection management, multi-account selection, and real tool execution. Never hardcode individual apps or actions.
---

Use the Composio MCP server as the dynamic connector runtime for the workspace.

For a new workflow, discover the exact tools needed from Composio before execution. Review the complete input schema for every tool before calling it. Use the user's currently authenticated Composio session and its live connection state.

When the user asks which apps are connected, use Composio's live connection metadata rather than treating a tool-search result as the complete app registry.

When an app has multiple connected accounts, select the correct account using the live account information supplied by Composio. Do not guess or fabricate account IDs.

For actions, execute the exact tool returned by Composio and report only the real result. Do not create app-specific handlers, fixed action maps, or hardcoded toolkit allow-lists. New Composio apps and tools must work through runtime discovery without code changes.

Before destructive or externally visible actions, confirm the intended target and scope with the user.
