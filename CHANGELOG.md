# Changelog

All notable changes to Auto Accept Antigravity are documented here.

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
