# Antigravity AutoAccept 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Antigravity IDE](https://img.shields.io/badge/Antigravity%20IDE-v2.x-orange.svg)](https://antigravity.google)
[![100% Free & Open Source](https://img.shields.io/badge/Paywalls-Zero-green.svg)](https://github.com/zerodiscount/antigravity-auto-accept)
[![Platform](https://img.shields.io/badge/Platform-Desktop%20%7C%20Remote--SSH%20%7C%20Containers-purple.svg)](https://github.com/zerodiscount/antigravity-auto-accept)
[![Release](https://img.shields.io/github/v/release/zerodiscount/antigravity-auto-accept?color=success)](https://github.com/zerodiscount/antigravity-auto-accept/releases/latest)

**Antigravity AutoAccept** is a lightning-fast, zero-paywall extension for **Google Antigravity IDE** that automatically approves routine AI agent file diffs, terminal execution prompts, and tool actions—while **strictly protecting human-in-the-loop Plan reviews**.

Designed specifically for real developer workflows: works seamlessly on **local desktop**, **Remote-SSH**, **DevContainers**, **Docker**, and **headless server environments**.

---

## 🛡️ Safety Philosophy: What is Auto-Approved vs. What Stays Manual

Our core philosophy is **zero friction for routine work, zero compromises on architectural safety**. You should never have to click "Accept" 50 times to apply minor code refactors, but an AI agent should **never** be allowed to approve its own architectural plan without your deliberate consent.

| Category / Action | Default State | Behavior & Rationale |
| :--- | :---: | :--- |
| **Cascade Code Diffs ("Accept Changes")** | 🟢 **ON** | Routine file edits, code completions, and refactors across all open/visible editor tabs are accepted automatically without manual clicking. |
| **Terminal Commands ("Run Command")** | 🟢 **ON** | Routine shell operations (`npm test`, `pytest`, `git status`, build scripts, compilation commands) run automatically without repeated permission prompts. |
| **Tool Calls & Confirmations** | 🟢 **ON** | Standard tool executions, read/write permissions, and non-destructive notification popups ("Allow", "Yes", "Run") are approved automatically. |
| **Architectural Plan Reviews ("Proceed", "Approve Plan")** | 🔴 **ALWAYS MANUAL** | **NEVER auto-clicked.** When an AI agent generates an architectural implementation plan, work breakdown, or phase strategy, the action button is strictly protected. You must review the plan and manually click **Proceed**. |
| **User Review & Feedback Prompts** | 🔴 **ALWAYS MANUAL** | Interactive interview prompts, user decision dialogs, and feedback submission buttons (`"Review"`, `"Submit Feedback"`, `"Reject"`) are never bypassed. |
| **Destructive Command Safety Blacklist** | 🔴 **BLOCKED** | Dangerous shell commands matching the configurable safety blacklist (e.g. `rm -rf /`, `mkfs`, `format`) are blocked from auto-approval. |
| **Active Typing / Cursor Focus** | ⏸️ **PAUSED** | While you are typing or moving your cursor in any editor, automated accept loops are paused with a **1.5s grace window** so your focus is never stolen. |

---

## Why Antigravity AutoAccept?

Pair-programming with an autonomous AI agent is incredible—until you find yourself manually clicking **"Accept Changes"** and **"Run Command"** 50 to 100 times an hour. 

Existing community extensions attempt to address this, but suffer from critical flaws:

1. **Artificial Paywalls**: Upstream extensions embed **RevenueCat** subscription paywalls, locking users out after ~50 free auto-actions and begging for recurring subscriptions.
2. **Broken on Remote-SSH & Containers**: They rely on Chrome DevTools Protocol (CDP) connecting to `localhost:9222`. When working over Remote-SSH, WSL, or DevContainers, the Electron UI runs on your local machine while code runs remotely. CDP fails completely, rendering the extension useless.
3. **Phantom Command IDs**: Upstream extensions dispatch non-existent commands like `antigravity.agent.acceptAgentStep`, causing "Accept Changes" to silently fail or freeze.
4. **No Safety Guardrails**: They either click blindly (potentially approving dangerous actions) or fail to distinguish routine file edits from architectural Plan reviews.

### Comparison: Antigravity AutoAccept vs. Alternatives

| Feature | Existing Paid / Clone Extensions | **Antigravity AutoAccept** |
| :--- | :--- | :--- |
| **Pricing** | Paid subscription (RevenueCat paywall) | **100% Free & Open Source (MIT)** |
| **Remote-SSH & Containers** | ❌ Broken (relies on local CDP port 9222) | ✅ **Native Extension Host integration** |
| **Cascade Diff Acceptance** | ❌ Dispatches non-existent command IDs | ✅ **Targets true internal commands & sweeps visible editors** |
| **Plan Review Safety** | ❌ Blind auto-clicking or unresponsive | ✅ **Hard-coded Plan review protection** |
| **Focus Stealing** | ❌ Hijacks cursor while typing | ✅ **Smart typing debounce (1.5s grace window)** |
| **Telemetry / Data Collection**| ⚠️ Third-party tracking & paywall SDKs | ✅ **Zero telemetry, zero tracking, zero external network calls** |

---

## Key Features

- ⚡ **True Native Command Integration**: Directly interfaces with Antigravity's internal command registry (`antigravity.prioritized.agentAcceptAllInFile`, `antigravity.closeAllDiffZones`, `antigravity.prioritized.agentAcceptFocusedHunk`, `antigravity.prioritized.submitCodeAcknowledgement`, `inlineChat.acceptChanges`, `chat.action.acceptTool`).
- 🌐 **Remote-SSH & Container Native**: Operates via VS Code's Extension Host API. Works identically whether you are on your local laptop, an SSH remote server, or an LXC/Docker container.
- 🛡️ **Plan Review Safety Gate**: Human-in-the-loop decisions should remain human. Buttons like `"Proceed"`, `"Approve Plan"`, `"Review"`, `"Submit Feedback"`, and `"Reject"` are strictly excluded from auto-approval.
- ⌨️ **Smart Typing Debounce**: Monitors editor keystrokes and selection changes. Pauses automated loops for 1,500ms whenever you type or navigate, ensuring your cursor is never stolen.
- 🧹 **Automatic Diff Cleanup**: Cleans up floating Monaco diff widgets once accepted so they don't linger across editor tabs.
- 🔘 **One-Click Manual Sweep (`Ctrl+Shift+Y` / `Cmd+Shift+Y`)**: Instantly sweep and accept all visible file diffs across all open split panes with a single hotkey.

---

## Installation

### Method 1: Install from VSIX (Quickest)

1. Download [`antigravity-auto-accept.vsix`](https://github.com/zerodiscount/antigravity-auto-accept/releases/download/v1.2.0/antigravity-auto-accept.vsix) from [GitHub Releases](https://github.com/zerodiscount/antigravity-auto-accept/releases/latest).
2. In Antigravity IDE, press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS).
3. Type **`Extensions: Install from VSIX...`** and select the downloaded file.
4. Reload the IDE window when prompted (`Developer: Reload Window`).

### Method 2: Build and Install from Source

```bash
git clone https://github.com/zerodiscount/antigravity-auto-accept.git
cd antigravity-auto-accept
npm install
npm run package
```
Then install the generated `antigravity-auto-accept.vsix` into your IDE.

---

## Usage & Controls

- **Status Bar Toggle**: Look at the bottom-right status bar. Click **`$(check) Auto Accept: ON`** to toggle auto-acceptance on or pause it.
- **Manual Sweep Hotkey**: Press **`Ctrl+Shift+Y`** (macOS: **`Cmd+Shift+Y`**) at any time to immediately accept all pending diffs across visible editors.
- **Diagnostics**: Run **`Hygient AutoAccept: Run Diagnostics`** from the Command Palette to inspect active command hooks, settings, and health status.

---

## Configuration

Customize behavior in your `settings.json` or through the IDE Settings UI:

```jsonc
{
  // Enable routine command polling (default: true)
  "autoAcceptAgent.enableCommandPolling": true,

  // Interval in ms between polling sweeps (default: 800)
  "autoAcceptAgent.pollIntervalMs": 800,

  // Automatically configure VS Code settings to skip approval prompts (default: true)
  "autoAcceptAgent.autoConfigureSettings": true,

  // Automatically accept confirmation notifications (default: true)
  "autoAcceptAgent.interceptNotifications": true,

  // Commands that will NEVER be auto-accepted (safety blacklist)
  "autoAcceptAgent.blockedCommands": [
    "rm -rf /",
    "format",
    "mkfs",
    "del /f /s /q c:\\",
    "rmdir /s /q c:\\"
  ]
}
```

---

## FAQ

#### Does this send my code or tokens to any external server?
**No.** The extension has zero network communication outside your local IDE instance. Unlike upstream forks, all RevenueCat SDKs, monetization code, and telemetry tracking have been completely stripped.

#### Why was "Accept Changes" not working in my Remote-SSH instance with other extensions?
Other extensions rely on Chrome DevTools Protocol connecting to `localhost:9222`. On Remote-SSH or containers, the Electron browser window runs on your client machine, not on the remote server host, breaking CDP completely. Antigravity AutoAccept works entirely through internal VS Code commands inside the Extension Host, making it 100% remote-native.

#### Does it automatically accept architectural Plans?
**No.** We believe architectural changes require explicit developer review. Plan review actions ("Proceed", "Review", "Submit Feedback") are strictly protected and require your intentional click.

---

## Contributing

Contributions, bug reports, and feature requests are welcome!
Feel free to open an issue or submit a pull request on [GitHub](https://github.com/zerodiscount/antigravity-auto-accept).

---

## License

This project is licensed under the [MIT License](LICENSE).
