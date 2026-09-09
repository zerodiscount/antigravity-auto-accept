# Changelog

All notable changes to Auto Accept Antigravity are documented here.

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
- **Cluster Integration**: Updated Forgejo server URL defaults to cluster canonical endpoint `http://10.2.100.120:3000`.
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
