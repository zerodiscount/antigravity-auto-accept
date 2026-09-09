# Configuration Guide

All settings are optional. Auto Accept works out of the box with sensible defaults.

## VS Code Settings

Open **Settings** (Cmd+, / Ctrl+,) and search for `autoAcceptAgent`.

### `autoCloseAcceptedEditors`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Automatically close editor tabs that were opened by AI agents once changes are accepted and saved.

Keeps your editor tab bar clean during long coding runs. Files you opened yourself or pinned are strictly preserved.

### `autoCloseDelayMs`
- **Type:** `integer`
- **Default:** `600`
- **Min:** `200`
- **Max:** `5000`
- **Description:** Delay in milliseconds before closing an accepted tab to ensure background saves settle.

### `enableCommandPolling`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Enable automatic polling of accept/approve commands.

Turn this off to disable the main auto-accept mechanism while keeping other features.

### `pollIntervalMs`
- **Type:** `number`
- **Default:** `800`
- **Min:** `200`
- **Max:** `10000`
- **Description:** Interval in milliseconds between polling cycles.

Lower values = faster approvals but more CPU. Recommended range: 400-1200ms.

**Examples:**
- 200ms — Very aggressive (highest CPU impact)
- 400ms — Fast response (low CPU)
- 800ms — Balanced (default, recommended)
- 1500ms — Relaxed polling

### `autoConfigureSettings`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Auto-configure VS Code settings to skip approval prompts.

When enabled, these settings are modified and restored on toggle:
- `chat.tools.autoApprove`
- `chat.agent.autoApprove`
- `chat.tools.terminal.enableAutoApprove`
- `security.workspace.trust.enabled`

### `interceptNotifications`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Auto-click approval buttons in notifications.

When enabled, Auto Accept will click "Allow", "Run", "Yes", etc. buttons automatically.

### `enableCDP`
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Enable Chrome DevTools Protocol fallback.

This scans webviews for approval buttons and clicks them directly. Requires Chrome with `--remote-debugging-port=9222`.

**When to enable:**
- Command polling isn't reaching approval buttons
- Using custom webview-based agents
- Want maximum compatibility

**Warning:** Enabling CDP adds network overhead. Keep disabled unless needed.

### `blockedCommands`
- **Type:** `string[]`
- **Default:**
  ```json
  [
    "rm -rf /",
    "format",
    "mkfs",
    "del",
    "del *",
    "rmdir",
    "rd",
    "erase"
  ]
  ```
- **Description:** List of command patterns to prevent auto-accept.

When Auto Accept detects a blocked command pattern near a "Run" or "Accept" button, it skips approval.

**How it works:**
1. When you hover "Run" button, Auto Accept checks nearby text
2. If any blocked command is found (case-insensitive), approval is blocked
3. You must approve manually

**Custom blocks:**
Add your own dangerous patterns:
```json
{
  "autoAcceptAgent.blockedCommands": [
    "rm -rf /",
    "format",
    "mkfs",
    "DROP TABLE",
    "DELETE FROM users",
    "git push --force"
  ]
}
```

### `customButtonTexts`
- **Type:** `string[]`
- **Default:** `[]`
- **Description:** Additional button labels to auto-click.

Useful for localized UIs or custom agent buttons.

**Example:**
```json
{
  "autoAcceptAgent.customButtonTexts": [
    "Ejecutar",
    "Aceptar",
    "Démarrer"
  ]
}
```

Auto Accept will click buttons with these labels in addition to the default ones.

## Settings.json Example

Full minimal config:
```json
{
  "autoAcceptAgent.enableCommandPolling": true,
  "autoAcceptAgent.pollIntervalMs": 800,
  "autoAcceptAgent.autoConfigureSettings": true,
  "autoAcceptAgent.interceptNotifications": true,
  "autoAcceptAgent.enableCDP": false,
  "autoAcceptAgent.blockedCommands": [
    "rm -rf /",
    "format",
    "mkfs"
  ],
  "autoAcceptAgent.customButtonTexts": []
}
```

## Presets

See [examples/](../examples/) for common configuration presets:
- `basic.json` — Default, safe config
- `aggressive.json` — Fast polling (400ms)
- `relaxed.json` — Slow polling (1500ms)
- `security-hardened.json` — Extra blocked commands
- `terminal-focused.json` — Terminal-specific config

## Troubleshooting

### Approvals are too slow
Lower `pollIntervalMs` to 400-600ms.

### VS Code is slow
Increase `pollIntervalMs` to 1000-1500ms, or disable `enableCDP`.

### Specific commands not being approved
Check if they're in `blockedCommands`, or add their text to `customButtonTexts`.

### CDP port conflicts
Change port in settings (default 9222) or disable CDP entirely.

## Restoring Defaults

Clear all Auto Accept settings to restore defaults:
```bash
# Remove all autoAcceptAgent settings
# Reopen VS Code to load defaults
```

Or reset individual settings:
1. Open Settings (Cmd+, / Ctrl+,)
2. Search for `autoAcceptAgent`
3. Click the gear icon → "Reset Setting"

## Environment Variables

No environment variables needed. All config is in VS Code settings.

---

**Questions?** See [FAQ](faq.md) or file an issue on [GitHub](https://github.com/kaushiksaravanan/Antigravity-AutoAccecpt/issues).
