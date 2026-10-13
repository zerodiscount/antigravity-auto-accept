# Changelog

All notable changes to Auto Accept Antigravity are documented here.

## [1.2.20] - 2026-10-13

### Fix Review Changes Tab Flashing Loop
- **Removed `openReviewChanges` From Acceptance Pipeline**: Purged `antigravity.openReviewChanges` from routine acceptance commands. Executing an open command in a polling loop repeatedly forced the Review Changes tab open against user actions.
- **Protected Review & Diff Tabs**: Completely removed the aggressive review/diff tab sweeping step in `fastPoll()`. Review Changes tabs, diff editors, and custom review views are strictly protected and never closed by background polling or auto-close routines.
- **Accurate Event-Driven AutoClose**: Cleaned up `fastPoll` to only accept pending edits without scheduling tab closures. Editor auto-close is now triggered cleanly upon `workspace.onDidSaveTextDocument` strictly for agent-opened documents, preventing unprompted tab closures.

## [1.2.19] - 2026-10-13

### Status Bar Clutter Elimination
- **Fixed Width Status Bar**: Fixed status bar text to `$(check) AutoAccept` without continuous count increments.

## [1.2.18] - 2026-10-13

### Auto-Close All Diff & Review Tabs
- **Diff Tabs Always Closed Upon Acceptance**: Modified `executeAutoClose` to always close `TabInputTextDiff` and `Review Changes` tabs once diffs are accepted, even if the user clicked or focused on the tab during review.
- **Protected Regular Text Editors**: User whitelisting (`userOpenedUris`) continues to strictly protect standard file text editors, ensuring open files and pinned tabs are preserved while temporary review/diff panels are closed.

## [1.2.17] - 2026-10-13

### Clean Status Bar & Filtered Metrics
- **Clean Status Bar Item**: The status bar label is now strictly `$(check) AutoAccept` without numbers taking up horizontal workspace space.
- **Hover-Only Detailed Breakdown**: Saved clicks and breakdown metrics are displayed exclusively in the rich hover tooltip.
- **Interactive Typing Filter**: Ignored interactive user typing events from triggering fastPoll or incrementing the auto-accepted file counter.

## [1.2.16] - 2026-10-13

### Review Changes & Diff Zone Auto-Close
- **Antigravity Review Changes Tab Auto-Close**: Extended tab auto-close to recognize custom `Review changes` and `antigravityReviewChangesEditor` tabs opened during agent turns, automatically closing them once file edits are accepted and unpinned.
- **Diff Zones Cleanup**: Integrated `antigravity.closeAllDiffZones` into the post-acceptance and `acceptNow` sequences to automatically collapse and dismiss inline diff widgets across the workspace.

## [1.2.15] - 2026-10-13

### Clicks Saved Metrics & Batch Acceptance
- **Real-Time Clicks Saved Tracker**: Added session and lifetime metrics tracking for auto-approved terminal commands, auto-accepted file edits/diffs, and auto-closed agent tabs.
- **Rich Hover Tooltip Breakdown**: The status bar hover tooltip now displays an interactive GitHub-flavored Markdown table breaking down clicks saved by category (`Terminal Commands`, `File Edits & Diffs`, `Agent Tabs Auto-Closed`) with one-click shortcut links to accept all pending changes immediately (`Ctrl+Shift+Y`).
- **Instant Event-Driven Batch Acceptance**: Attached a fast 400ms debounced acceptance sweep on `workspace.onDidChangeTextDocument`, instantly executing `chatEditor.action.acceptAllEdits` and `chatEditing.acceptAllFiles` as soon as agent edits stream in without waiting for periodic polling intervals.
- **Status Bar Click Counter**: Added `autoAcceptAgent.showClicksInStatusBar` (default `true`) to show live session savings directly in the status bar (e.g. `$(check) AutoAccept (14)`).

## [1.2.14] - 2026-10-13

### Legal & Governance
- **Disclaimer & User Responsibility Notice**: Added an explicit legal disclaimer and user responsibility notice to `README.md` and package documentation, clarifying that automated tool execution is at the user's sole risk and discretion, with explicit recommendations on maintaining and tailoring `blockedCommands`.

## [1.2.13] - 2026-10-13

### Remote-SSH & Performance Optimization
- **Remote Workspace Extension Kind Alignment**: Updated `"extensionKind": ["workspace", "ui"]` so the extension executes seamlessly in the Remote Extension Host alongside workspace extensions (AGQ, KG Sync) during Remote-SSH sessions, preventing the status bar item from being hidden/clobbered during remote workspace initialization.
- **CPU & Thermal Optimization**: Increased default `pollIntervalMs` from 800ms to 10,000ms (every 10s) and set `enableCDP: false` by default, eliminating high CPU utilization, continuous port scanning, and fan noise on developer workstations.
- **Status Bar Name Registration**: Explicitly assigned `statusBar.name = 'Antigravity AutoAccept'` and registered to extension subscriptions for reliable status bar context menu visibility and persistence.

## [1.2.12] - 2026-10-13

### UI & UX Polish
- **Status Bar Tooltip Version Indicator**: Added real-time extension version display (`Antigravity AutoAccept v1.2.12 (ACTIVE)`) in the status bar hover tooltip, allowing instantaneous visual confirmation of the active installed version.

## [1.2.11] - 2026-10-13

### Fixed & Enhanced
- **Native Chat Editing Auto-Accept Engine**: Injected `chat.editing.autoAcceptDelay: 1` into automated settings configuration, enabling VS Code's native countdown engine to auto-accept multi-file AI chat edits seamlessly.
- **Direct Per-File Chat Acceptance**: Added explicit `chatEditing.acceptFile` calls passing target document URIs during tab and visible editor polling loops.
- **Unblocked Programmatic Edit Detection**: Removed user interaction grace timer triggers from `workspace.onDidChangeTextDocument` so AI agent streaming edits do not pause background acceptance loops.
- **UI Extension Kind Prioritization**: Configured `"extensionKind": ["ui", "workspace"]` to ensure the extension executes on the desktop UI client when connected via Remote-SSH.

## [1.2.10] - 2026-10-13

### Fixed & Enhanced
- **Multi-File Chat Auto-Acceptance**: Integrated `chatEditing.acceptAllFiles`, `workbench.action.chat.acceptAll`, and `antigravity.prioritized.agentAcceptAll` into the core polling cycle to automatically accept batch file edits proposed within the agent conversation chat.
- **Tab Group Sweeping**: Extended diff acceptance across all tab groups (`vscode.window.tabGroups.all`), ensuring pending modifications in background, inactive, or unpinned tabs are accepted without requiring active focus.
- **CDP Webview Fallback Enabled**: Enabled `autoAcceptAgent.enableCDP` by default (`true`) to click remaining approval buttons directly within agent webview interfaces.
- **Enhanced Manual Shortcut (`Ctrl+Shift+Y`)**: Updated `autoAcceptAgent.acceptNow` to execute the full multi-file chat acceptance sequence.

## [1.2.9] - 2026-09-09

### Privacy & Packaging Cleanliness
- **Package Exclusion Hardening**: Enhanced `.vscodeignore` to strictly exclude all local Python helper scripts, shell tools, and internal automation utilities from packaged VSIX artifacts.
- **Generic Deployment Logic**: Replaced all legacy internal strings in helper scripts with clean, dynamic patterns.
- **Repository Hygiene**: Purged obsolete binary artifacts from version control.

## [1.2.8] - 2026-09-09

### Removed & Privacy Hardened
- **Removed Custom Updater**: Completely removed custom update polling and updater module (`updater.ts`). Updates are now handled exclusively and natively through the official marketplace (Open VSX Registry).
- **Zero Privacy Leaks**: Purged all internal server endpoints, private IP addresses, and custom updater configuration settings (`updateServerUrl`, `checkForUpdates`, `autoUpdate`) from the extension manifest.

## [1.2.7] - 2026-09-09

### Added & Enhanced
- **Smart AutoClose (`autoAcceptAgent.autoCloseAcceptedEditors`)**: Enabled by default (`true`). Automatically sweeps and closes editor tabs that were opened by AI agents after changes are accepted and saved.
- **Whitelist Protection (`userOpenedUris`)**: Files opened or interacted with by the user (mouse clicks, typing, navigation) are whitelisted and NEVER auto-closed.
- **Zero Data Loss Guarantee**: Tabs with unsaved changes (`tab.isDirty === true`) or pinned status (`tab.isPinned === true`) are strictly preserved.
- **Configurable Debounce Delay (`autoAcceptAgent.autoCloseDelayMs`)**: Default `600ms` debounce allows Monaco diff widgets to unmount and auto-save flushes to complete before closing tabs.
- **Branding Update**: Display name updated to **Antigravity AutoAcceptClose** to reflect automated diff acceptance and intelligent tab hygiene.

## [1.2.6] - 2026-09-09

### Fixed & Refactored
- **Diff Zone Preservation**: Removed hazardous `'antigravity.closeAllDiffZones'` command from automated acceptance and editor switch listeners, preventing pending diffs and active agent edits from being inadvertently closed or reverted.
- **Deduplication**: Removed duplicate `'workbench.action.chat.accept'` from polling command queues.
- **Packaging & Manifest Cleanliness**: Removed invalid manifest keys and structured command titles with standardized `category: "Antigravity AutoAccept"`.
- **Dynamic Deployment Scripts**: Updated `install_to_ag_infra.py` and `install_to_ag_dev.py` to use dynamic relative paths.

## [1.2.5] - 2026-09-09

### Fixed
- **Completely Silent Activation**: Removed all activation, startup, and stop popup notification toasts.
- **Status Bar Quiet Mode**: Removed prominent warning badge styling (`statusBarItem.prominentBackground` / `errorBackground`), displaying clean standard text `$(check) AutoAccept`.
- **Clean Configuration**: Removed unregistered and intrusive settings (`terminal.integrated.confirmOnKill`, `security.workspace.trust.enabled`, etc.) to prevent workspace security trust warnings in the IDE.
- **Status Bar Toggle Setting**: Added `autoAcceptAgent.showStatusBarItem` configuration setting (default `true`), allowing users to hide the status bar indicator entirely if desired.

## [1.2.3] - 2026-09-09

### Removed
- **Silent Operation**: Completely removed intrusive startup and toggle popup notification toasts (`Antigravity AutoAccept: Running (Plan reviews remain manual)`). State is communicated seamlessly via the persistent status bar item (`$(zap) Antigravity AutoAccept: ON`).

## [1.2.2] - 2026-09-09

### Fixed
- **Prevent Boot Loop**: Disabled background update polling and automatic reload notifications.
- **Notification Safety**: Removed `notification.acceptPrimaryAction` from automated accept commands to prevent auto-accepting window reload notifications or destructive system alerts.
- Defaults for `checkForUpdates`, `autoUpdate`, and `interceptNotifications` now default to `false`.

## [1.2.1] - 2026-09-09

### Fixed
- Fixed typing debounce false-positive: AI agent stream document edits are no longer mistaken for human keyboard typing.
- Expanded automated diff sweeps to all open `workspace.textDocuments`, ensuring background files not in active editor split panes are accepted.

## [1.2.0] - 2026-09-09

### Added
- Initial public release on Open-VSX under the `zerodiscount` namespace.
- Hardcoded Plan review safety gate (protects "Proceed", "Approve Plan", "Review", "Submit Feedback").
- Smart typing debounce (1.5s grace window for keyboard activity).
- Remote-SSH and DevContainer native Extension Host integration.
- Full MIT License attribution to original author Kaushik Saravanan.

## [0.7.7] - 2026-08-26

### Changed
- Refactored core code for readability and maintainability
- Simplified error handling with improved promise resolution patterns
- Streamlined command registration with reusable patterns
- Reduced unnecessary comments and verbose code

### Fixed
- Fixed race condition in WebSocket resolution (`multiplexCdpWebviews`)
- Fixed potential double-resolution in HTTP timeout handling
- Improved async cleanup during extension disposal

### Added
- Comprehensive documentation (configuration, how-it-works, FAQ)
- Configuration examples (basic, aggressive, security-hardened, relaxed)
- Contributing guidelines and code of conduct
- Pricing documentation with monetization details

## [0.7.6] - 2026-08-20

### Added
- Advanced diagnostics command
- Custom button text support for localized UIs
- Security hardening configuration examples

### Changed
- Improved polling efficiency
- Better error logging and diagnostics

### Fixed
- Fixed settings restoration on extension shutdown
- Improved resource cleanup on disposal

## [0.7.2] - 2026-02-23
### Changed
- Reverted `displayName` back to "Antigravity-AutoAccept" for better discoverability.

## [0.7.1] - 2026-02-23
### Changed
- Updated internal package configurations.
- Temporarily experimented with extension display names.

## [0.7.0] - 2026-02-21
### Added
- Removed CDP dependency for a more robust, zero-configuration setup.
- Native VS Code settings integration for managing auto-approval.
