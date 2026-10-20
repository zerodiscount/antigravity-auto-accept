# Antigravity AutoAcceptClose 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Antigravity IDE](https://img.shields.io/badge/Antigravity%20IDE-v2.x-orange.svg)](https://antigravity.google)
[![100% Free & Open Source](https://img.shields.io/badge/Paywalls-Zero-green.svg)](https://github.com/zerodiscount/antigravity-auto-accept)
[![Platform](https://img.shields.io/badge/Platform-Desktop%20%7C%20Remote--SSH%20%7C%20Containers-purple.svg)](https://github.com/zerodiscount/antigravity-auto-accept)
[![Release](https://img.shields.io/github/v/release/zerodiscount/antigravity-auto-accept?color=success)](https://github.com/zerodiscount/antigravity-auto-accept/releases/latest)
[![Open VSX](https://img.shields.io/open-vsx/v/zerodiscount/antigravity-auto-accept?color=blue)](https://open-vsx.org/extension/zerodiscount/antigravity-auto-accept)

**Antigravity AutoAcceptClose** is a lightning-fast, zero-paywall extension for **Google Antigravity IDE** that automatically approves routine AI agent file diffs, terminal execution prompts, and tool actions, and **intelligently auto-closes agent-opened files after acceptance**—while **strictly protecting human-in-the-loop Plan reviews and user files**.

Designed specifically for real developer workflows: works seamlessly on **local desktop**, **Remote-SSH**, **DevContainers**, **Docker**, and **headless server environments**.

---

## 💡 Origin & Philosophy: The Best of Both Worlds

> *"Personally, I reached a point where Antigravity / Gemini was consistently writing cleaner, more idiomatic code than I could produce manually line-by-line. Reviewing every individual 5-line diff or boilerplate import became redundant and disrupted my development flow.*
>
> *At the same time, I didn't want a detached black-box tool. I love using the IDE—the granular control over workspaces, split editors, file trees, and terminal tabs is irreplaceable.*
>
> *I built this extension to bridge that gap: bringing the autonomous velocity of Antigravity 2.0 directly into the rich IDE environment. Let the AI write and apply routine code changes seamlessly, while you retain executive control over what truly matters: architectural plans, system strategy, and high-level decisions."*

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
| **Agent-Opened File Tabs (AutoClose)** | 🟢 **ON (AutoClose)** | Automatically closes editor tabs opened by the agent once diffs are accepted and saved. Leaves user-opened, active, or pinned files untouched. |
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

- 🚪 **Intelligent AutoClose for Agent Files**: Automatically sweeps and closes file tabs opened or modified during autonomous AI agent coding runs once changes are accepted and saved to disk. User-opened files unedited by agents and pinned tabs remain untouched.
- 🎯 **Click-to-Keep Inspection Window**: Configurable grace window (default 5s) before auto-closing accepted files. If you click anywhere on the tab header or inside the file, auto-close is immediately cancelled and the file stays open permanently for manual inspection.
- ⚓ **Chat Focus Retention & Read-Only Safety**: Anchors your keyboard focus in the Antigravity chat input prompt. Prevents background Cascade loops from stealing focus into editor tabs. Files are temporarily marked read-only during acceptance so accidental keystrokes never overwrite code.
- ⚡ **True Native Command Integration**: Directly interfaces with Antigravity's internal command registry (`antigravity.prioritized.agentAcceptAllInFile`, `antigravity.closeAllDiffZones`, `antigravity.prioritized.agentAcceptFocusedHunk`, `antigravity.prioritized.submitCodeAcknowledgement`, `inlineChat.acceptChanges`, `chat.action.acceptTool`).
- 🌐 **Remote-SSH & Container Native**: Operates via VS Code's Extension Host API. Works identically whether you are on your local laptop, an SSH remote server, or an LXC/Docker container.
- 🛡️ **Plan Review Safety Gate**: Human-in-the-loop decisions should remain human. Buttons like `"Proceed"`, `"Approve Plan"`, `"Review"`, `"Submit Feedback"`, and `"Reject"` are strictly excluded from auto-approval.
- ⌨️ **Smart Typing Debounce**: Monitors editor keystrokes and selection changes. Pauses automated loops for 1,500ms whenever you type or navigate in code.
- 🧹 **Automatic Diff Cleanup**: Cleans up floating Monaco diff widgets and closes the "Review Changes" tab once all edits are applied.
- 🔘 **One-Click Manual Sweep (`Ctrl+Shift+Y` / `Cmd+Shift+Y`)**: Instantly sweep and accept all visible file diffs across all open split panes with a single hotkey.

---

## Installation

### Method 1: Install from Open-VSX Registry (Recommended)

Install directly from within Antigravity IDE, VS Code, or VSCodium via the Extensions Marketplace:
1. Open the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
2. Search for **`Antigravity AutoAccept`** (or `zerodiscount.antigravity-auto-accept`).
3. Click **Install**.

Or install via terminal:
```bash
agy --install-extension zerodiscount.antigravity-auto-accept
# or code / cursor:
code --install-extension zerodiscount.antigravity-auto-accept
```

### Method 2: Install from VSIX Release Asset

1. Download [`antigravity-auto-accept.vsix`](https://github.com/zerodiscount/antigravity-auto-accept/releases/latest) from [GitHub Releases](https://github.com/zerodiscount/antigravity-auto-accept/releases/latest).
2. In Antigravity IDE, press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS).
3. Type **`Extensions: Install from VSIX...`** and select the downloaded file.
4. Reload the IDE window when prompted (`Developer: Reload Window`).

### Method 3: Build and Install from Source

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
- **Diagnostics**: Run **`Antigravity AutoAccept: Run Diagnostics`** from the Command Palette to inspect active command hooks, settings, and health status.

---

## Configuration

Customize behavior in your `settings.json` or through the IDE Settings UI:

```jsonc
{
  // Automatically close agent-opened editor tabs after acceptance (default: true)
  "autoAcceptAgent.autoCloseAcceptedEditors": true,

  // Delay in ms before closing an accepted tab (default: 5000ms = 5s).
  // Clicking the tab or editing during this window cancels auto-close (Click-to-Keep). Set to 0 for instant auto-close.
  "autoAcceptAgent.autoCloseDelayMs": 5000,

  // Automatically close the Review Changes tab once all agent changes are accepted (default: true)
  "autoAcceptAgent.autoCloseReviewChangesTab": true,

  // Keep focus anchored in the chat prompt bar so typing is never misdirected into editor tabs (default: true)
  "autoAcceptAgent.autoRestoreChatFocus": true,

  // Prevent background Cascade diff loops from stealing focus from the prompt bar (default: true)
  "autoAcceptAgent.preventEditorFocusStealing": true,

  // Lock agent-opened tabs Read-Only during the inspection window to protect code from accidental keystrokes (default: true)
  "autoAcceptAgent.lockAgentEditorsReadOnly": true,

  // Enable routine command polling (default: true)
  "autoAcceptAgent.enableCommandPolling": true,

  // Interval in ms between polling sweeps (default: 10000)
  "autoAcceptAgent.pollIntervalMs": 10000,

  // Automatically configure VS Code settings to skip approval prompts (default: true)
  "autoAcceptAgent.autoConfigureSettings": true,

  // Automatically accept confirmation notifications (default: false)
  "autoAcceptAgent.interceptNotifications": false,

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

## 🙏 Acknowledgements & Prior Art

**Antigravity AutoAccept** was inspired by and builds upon the foundational concept created by [Kaushik Saravanan](https://github.com/kaushiksaravanan) in [Antigravity-AutoAccecpt](https://github.com/kaushiksaravanan/Antigravity-AutoAccecpt). We express our sincere appreciation to Kaushik for sharing his original idea with the open-source community.

To serve demanding developer and enterprise multi-container environments, this project was completely refactored from the ground up:
- **Zero Paywalls & Telemetry**: 100% free and open-source under MIT, with all RevenueCat paywalls and third-party tracking eliminated.
- **Remote-SSH & Container Native**: Replaced localhost-only Chrome DevTools Protocol (CDP) hooks with native VS Code / Antigravity internal commands and Monaco diff sweeps, functioning seamlessly across remote SSH tunnels, DevContainers, and server instances.
- **Protected Human-in-the-Loop Plans**: Hardcoded safety protections that strictly prevent AI agents from self-approving architectural plans, work breakdowns, or interview prompts.
- **Typing Debounce & Focus Protection**: Pauses automated loops while you type to guarantee zero cursor disruption.

---

## Contributing

Contributions, bug reports, and feature requests are welcome!
Feel free to open an issue or submit a pull request on [GitHub](https://github.com/zerodiscount/antigravity-auto-accept).

---

## ⚠️ Disclaimer & User Responsibility

**USE AT YOUR OWN RISK.** 

**Antigravity AutoAccept** is an automation utility designed to streamline developer workflows by automatically approving routine tool commands and accepting file diffs generated by AI agents. By installing, configuring, or enabling this extension, you acknowledge and agree that:

1. **Sole User Responsibility:** You maintain full, sole responsibility for all actions, terminal commands, scripts, code modifications, package installations, and system calls executed on your local machine, containers, or remote environments through this extension.
2. **Autonomous Execution Risks:** Automated acceptance permits AI agents to run commands and alter workspace files without interactive per-action confirmation prompts. While the extension provides built-in safety mechanisms (including a customizable blocked commands blacklist, protected architectural plan reviews, and user interaction typing guards), autonomous execution carries inherent risks of unintended file overwrites, data loss, operating system changes, or unexpected subprocess behavior.
3. **Blacklist Customization:** You are strongly urged to review and customize the `autoAcceptAgent.blockedCommands` configuration setting to block any sensitive, destructive, or mission-critical commands relevant to your operating environment (e.g. `rm -rf`, production deployment triggers, database wipe commands).
4. **No Warranty & Limitation of Liability:** This software is provided "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS, CONTRIBUTORS, OR COPYRIGHT HOLDERS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR CONSEQUENTIAL DAMAGES (INCLUDING BUT NOT LIMITED TO LOSS OF DATA, LOSS OF PROFITS, BUSINESS INTERRUPTION, OR SYSTEM DAMAGE), WHETHER IN AN ACTION OF CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## License

This project is licensed under the [MIT License](LICENSE).
- Original work Copyright (c) 2026 Kaushik Saravanan.
- Modifications and enhancements Copyright (c) 2026 ZeroDiscount Contributors.
