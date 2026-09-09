/**
 * Antigravity AutoAccept
 * Originally based on Antigravity-AutoAccecpt by Kaushik Saravanan (https://github.com/kaushiksaravanan/Antigravity-AutoAccecpt)
 * Re-architected and maintained by ZeroDiscount Contributors (MIT License)
 */
import * as vscode from 'vscode';
import * as http from 'http';
import WebSocket = require('ws');

/**
 * Antigravity AutoAccept for Antigravity
 *
 * Strategy 1: Settings Injection — Configures VS Code & Antigravity settings
 *             to auto-approve routine tools/commands without asking.
 * Strategy 2: Command Polling — Fires routine accept/approve commands.
 * Strategy 3: Notification Interception — Auto-dismisses standard confirmation dialogs.
 * Strategy 4: Event-Driven Reactions — Reacts to terminal starts and editor diff views.
 * Strategy 5: Optional CDP Fallback — Safely clicks "Run", "Accept", "Allow" in DOM
 *             while STRICTLY PROTECTING plan review buttons ("Proceed", "Review", "Submit").
 */
export class AutoAcceptor implements vscode.Disposable {
    private isRunning = false;
    private isDisposed = false;
    private statusBarItem: vscode.StatusBarItem;
    private pollInterval: ReturnType<typeof setInterval> | null = null;
    private fastPollInterval: ReturnType<typeof setInterval> | null = null;

    private outputChannel: vscode.OutputChannel;
    private isPollInProgress = false;
    private trackingDisposables: vscode.Disposable[] = [];

    // CDP Fallback State
    private cdpIntervalId: ReturnType<typeof setInterval> | null = null;
    private isCdpBusy = false;
    private activeCdpPort: number | null = null;
    private lastExpandTimes: Record<string, number> = {};
    private cdpCycleCount = 0;
    private readonly CDP_PORTS = [9222, 9229, ...Array.from({ length: 15 }, (_, i) => 9000 + i)];

    // Stats & Settings state
    private executedCount = 0;
    private settingsApplied = false;
    private lastActivity = '';
    private lastUserInteractionTime = 0;
    private readonly USER_INTERACTION_GRACE_MS = 1500;
    private readonly originalGlobalSettings = new Map<string, {
        section: string;
        key: string;
        hadValue: boolean;
        value: unknown;
    }>();

    // AutoClose Tracking State
    private readonly userOpenedUris = new Set<string>();
    private readonly agentOpenedUris = new Set<string>();
    private readonly pendingCloseTimers = new Map<string, ReturnType<typeof setTimeout>>();

    private isUserInteracting(): boolean {
        return (Date.now() - this.lastUserInteractionTime) < this.USER_INTERACTION_GRACE_MS;
    }

    /**
     * Routine accept/approve/run commands across Antigravity.
     * EXCLUDES any plan review / submission commands.
     */
    private readonly criticalAcceptCommands: string[] = [
        // Antigravity Native Diff & File Acceptance ("Accept Changes" / "Accept All" in Cascade)
        'antigravity.prioritized.agentAcceptAllInFile',
        'antigravity.prioritized.agentAcceptFocusedHunk',
        'antigravity.prioritized.submitCodeAcknowledgement',

        // Antigravity Terminal & Command Confirmation
        'antigravity.command.accept',
        'antigravity.terminalCommand.accept',
        'antigravity.terminalCommand.run',

        // VS Code Inline Chat & Tools
        'inlineChat.acceptChanges',
        'chat.action.acceptTool',
        'workbench.action.chat.accept',

        // Notification acceptance (catches "Allow", "Run", "Yes" popups)
    ];

    private readonly secondaryAcceptCommands: string[] = [
        // VS Code built-in chat / editing
        'inlineChat.keep',

        // Terminal suggestions
        'workbench.action.terminal.chat.runCommand',
    ];

    /**
     * Settings to auto-configure so routine actions don't prompt for permission.
     */
    private readonly autoApproveSettings: Array<[string, string, unknown]> = [
        ['chat.tools.global', 'autoApprove', true],
        ['chat.tools.terminal', 'enableAutoApprove', true],
        ['chat.tools.urls', 'autoApprove', true],
        ['chat.tools.run_command', 'autoApprove', true],
        ['chat.tools.default_api:run_command', 'autoApprove', true],
        ['chat.tools.write_to_file', 'autoApprove', true],
        ['chat.tools.replace_file_content', 'autoApprove', true],
        ['chat.tools.multi_replace_file_content', 'autoApprove', true],
        ['chat.agent', 'autoApprove', true],
        ['chat.agent', 'maxRequests', 999],

    ];

    private context: vscode.ExtensionContext;

    constructor(statusBarItem: vscode.StatusBarItem, outputChannel: vscode.OutputChannel, context: vscode.ExtensionContext) {
        if (!statusBarItem || !outputChannel || !context) {
            throw new Error('AutoAcceptor requires StatusBarItem, OutputChannel, and ExtensionContext.');
        }

        this.statusBarItem = statusBarItem;
        this.outputChannel = outputChannel;
        this.context = context;
        this.updateStatusBar('off');
    }

    // ── Public API ─────────────────────────────────────────

    public async toggle(): Promise<void> {
        if (this.isDisposed) return;
        try {
            this.isRunning ? await this.stop() : await this.start();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.log(`toggle error: ${msg}`);
        }
    }

    public async start(): Promise<void> {
        if (this.isDisposed || this.isRunning) return;

        const config = vscode.workspace.getConfiguration('autoAcceptAgent');
        if (!config.get<boolean>('enableCommandPolling', true)) {
            this.log('polling disabled');
            return;
        }

        this.isRunning = true;

        if (config.get<boolean>('autoConfigureSettings', true)) {
            try {
                await this.applyAutoApproveSettings();
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                this.isRunning = false;
                this.updateStatusBar('off');
                this.log(`settings failed: ${msg}`);
                vscode.window.showErrorMessage(`Antigravity AutoAccept start failed: ${msg}`);
                return;
            }
        }

        this.seedOpenTabs();
        this.startCommandPolling();
        this.setupEventTracking();
        this.startCDPPolling();

        this.updateStatusBar('on');
        this.log('Antigravity AutoAccept started.');
    }

    public async stop(notifyUser = true): Promise<void> {
        if (this.isDisposed) return;

        try {
            this.log('stopping');
            this.isRunning = false;
            this.clearPendingCloses();
            this.stopAllPolling();
            this.disposeTracking();
            await this.restoreOriginalSettings();
            this.updateStatusBar('off');
            // Silent stop
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.log(`stop error: ${msg}`);
            this.isRunning = false;
            this.updateStatusBar('off');
        }
    }

    public dispose(): void {
        if (this.isDisposed) return;
        this.isDisposed = true;
        this.isRunning = false;

        try { this.clearPendingCloses(); } catch { }
        try { this.stopAllPolling(); } catch { }
        try { this.disposeTracking(); } catch { }

        void this.restoreOriginalSettings()
            .catch((err: unknown) => {
                const msg = err instanceof Error ? err.message : String(err);
                try { console.error(`[AutoAccept] settings restore failed: ${msg}`); } catch { }
            })
            .finally(() => {
                try { this.statusBarItem?.dispose(); } catch { }
                try { this.outputChannel?.dispose(); } catch { }
            });
    }

    // ── Strategy 1: Settings Injection ────────────────────

    private getSettingId(section: string, key: string): string {
        return `${section}.${key}`;
    }

    private async applyAutoApproveSettings(): Promise<void> {
        if (this.settingsApplied) { return; }

        this.log('Applying auto-approve settings...');
        let applied = 0;
        let skipped = 0;

        for (const [section, key, value] of this.autoApproveSettings) {
            const settingId = this.getSettingId(section, key);
            try {
                const config = vscode.workspace.getConfiguration(section);
                const inspect = config.inspect(key);

                if (!this.originalGlobalSettings.has(settingId)) {
                    const hadValue = inspect?.globalValue !== undefined;
                    this.originalGlobalSettings.set(settingId, {
                        section,
                        key,
                        hadValue,
                        value: inspect?.globalValue,
                    });
                }

                if (inspect) {
                    const currentGlobal = inspect.globalValue;
                    if (currentGlobal !== value) {
                        await config.update(key, value, vscode.ConfigurationTarget.Global);
                        this.log(`  ✅ Set ${section}.${key} = ${JSON.stringify(value)}`);
                        applied++;
                    } else {
                        skipped++;
                    }
                } else {
                    try {
                        await config.update(key, value, vscode.ConfigurationTarget.Global);
                        this.log(`  ✅ Set ${section}.${key} = ${JSON.stringify(value)} (new)`);
                        applied++;
                    } catch {
                        skipped++;
                    }
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                this.log(`  ❌ Failed to set ${section}.${key}: ${msg}`);
            }
        }

        this.settingsApplied = true;
        this.log(`Settings applied: ${applied} updated, ${skipped} skipped.`);
    }

    private async restoreOriginalSettings(): Promise<void> {
        if (!this.settingsApplied) { return; }

        this.log('Restoring original settings...');
        let restored = 0;
        let unchanged = 0;
        let failed = 0;

        for (const [settingId, original] of this.originalGlobalSettings) {
            try {
                const config = vscode.workspace.getConfiguration(original.section);
                const inspect = config.inspect(original.key);

                if (inspect && inspect.globalValue !== original.value) {
                    await config.update(
                        original.key,
                        original.hadValue ? original.value : undefined,
                        vscode.ConfigurationTarget.Global
                    );
                    this.log(`  Restored ${settingId}`);
                    restored++;
                } else {
                    unchanged++;
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                this.log(`  Failed restoring ${settingId}: ${msg}`);
                failed++;
            }
        }

        this.originalGlobalSettings.clear();
        this.settingsApplied = false;
        this.log(`Settings restore complete: ${restored} restored, ${unchanged} unchanged, ${failed} failed.`);
    }

    // ── AutoClose Helpers ─────────────────────────────────

    private getTabUri(tab: vscode.Tab): vscode.Uri | undefined {
        if (!tab || !tab.input) { return undefined; }
        if (tab.input instanceof vscode.TabInputText) {
            return tab.input.uri;
        }
        if (tab.input instanceof vscode.TabInputTextDiff) {
            return tab.input.modified;
        }
        const inputAny = tab.input as { uri?: vscode.Uri; modified?: vscode.Uri };
        return inputAny?.uri || inputAny?.modified;
    }

    private seedOpenTabs(): void {
        this.userOpenedUris.clear();
        try {
            for (const group of vscode.window.tabGroups.all) {
                for (const tab of group.tabs) {
                    const uri = this.getTabUri(tab);
                    if (uri) {
                        this.userOpenedUris.add(uri.toString());
                    }
                }
            }
        } catch { }
    }

    private cancelPendingClose(uriStr: string): void {
        const timer = this.pendingCloseTimers.get(uriStr);
        if (timer) {
            clearTimeout(timer);
            this.pendingCloseTimers.delete(uriStr);
        }
    }

    private clearPendingCloses(): void {
        for (const timer of this.pendingCloseTimers.values()) {
            clearTimeout(timer);
        }
        this.pendingCloseTimers.clear();
        this.userOpenedUris.clear();
        this.agentOpenedUris.clear();
    }

    private scheduleAutoClose(uri: vscode.Uri): void {
        const config = vscode.workspace.getConfiguration('autoAcceptAgent');
        if (!config.get<boolean>('autoCloseAcceptedEditors', true)) {
            return;
        }

        const uriStr = uri.toString();
        if (this.userOpenedUris.has(uriStr)) {
            return;
        }
        if (!this.agentOpenedUris.has(uriStr)) {
            return;
        }

        this.cancelPendingClose(uriStr);

        const delayMs = config.get<number>('autoCloseDelayMs', 600);
        const timer = setTimeout(() => {
            void this.executeAutoClose(uri).catch(() => {});
        }, delayMs);

        this.pendingCloseTimers.set(uriStr, timer);
    }

    private async executeAutoClose(uri: vscode.Uri): Promise<void> {
        const uriStr = uri.toString();
        this.pendingCloseTimers.delete(uriStr);

        if (!this.isRunning || this.isDisposed || this.isUserInteracting()) {
            return;
        }
        if (this.userOpenedUris.has(uriStr)) {
            return;
        }

        try {
            const tabsToClose: vscode.Tab[] = [];
            for (const group of vscode.window.tabGroups.all) {
                for (const tab of group.tabs) {
                    const tabUri = this.getTabUri(tab);
                    if (tabUri && tabUri.toString() === uriStr) {
                        // Safety: NEVER close dirty or pinned tabs
                        if (tab.isDirty || tab.isPinned) {
                            return;
                        }
                        tabsToClose.push(tab);
                    }
                }
            }

            if (tabsToClose.length > 0) {
                await vscode.window.tabGroups.close(tabsToClose, true);
                this.agentOpenedUris.delete(uriStr);
                const fileName = uri.path.split('/').pop() || uri.fsPath;
                this.log(`Auto-closed accepted editor: ${fileName}`);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.log(`Auto-close error for ${uri.path}: ${msg}`);
        }
    }

    // ── Strategy 2: Command Polling ───────────────────────

    private startCommandPolling(): void {
        if (this.isDisposed) { return; }

        const config = vscode.workspace.getConfiguration('autoAcceptAgent');
        const intervalMs = config.get<number>('pollIntervalMs', 800);

        if (this.fastPollInterval) {
            clearInterval(this.fastPollInterval);
            this.fastPollInterval = null;
        }
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }

        // Fast poll for critical commands (accept agent steps, notifications)
        this.fastPollInterval = setInterval(() => {
            void this.fastPoll().catch((err: unknown) => {
                const msg = err instanceof Error ? err.message : String(err);
                this.log(`Fast poll interval error: ${msg}`);
            });
        }, Math.max(200, Math.floor(intervalMs / 2)));

        // Standard poll for all commands
        this.pollInterval = setInterval(() => {
            void this.fullPoll().catch((err: unknown) => {
                const msg = err instanceof Error ? err.message : String(err);
                this.log(`Full poll interval error: ${msg}`);
            });
        }, intervalMs);

        this.log(`Command polling started: fast=${Math.max(200, Math.floor(intervalMs / 2))}ms, full=${intervalMs}ms`);
    }

    private shouldInterceptNotifications(): boolean {
        const config = vscode.workspace.getConfiguration('autoAcceptAgent');
        return config.get<boolean>('interceptNotifications', true);
    }

    private async fastPoll(): Promise<void> {
        if (!this.isRunning || this.isDisposed) { return; }
        if (this.isUserInteracting()) { return; }
        const interceptNotifications = this.shouldInterceptNotifications();

        // Target all visible text editors for Antigravity diff acceptance
        for (const editor of vscode.window.visibleTextEditors) {
            if (this.isDisposed || !this.isRunning || this.isUserInteracting()) { break; }
            const uri = editor.document.uri;
            const uriStr = uri.toString();
            if (!this.userOpenedUris.has(uriStr)) {
                this.agentOpenedUris.add(uriStr);
            }
            try {
                await vscode.commands.executeCommand('antigravity.prioritized.agentAcceptAllInFile', uri);
                if (this.agentOpenedUris.has(uriStr) && !this.userOpenedUris.has(uriStr)) {
                    this.scheduleAutoClose(uri);
                }
            } catch { }
        }

        for (const cmd of this.criticalAcceptCommands) {
            if (this.isDisposed || !this.isRunning || this.isUserInteracting()) { break; }
            if (!interceptNotifications && cmd.toLowerCase().includes('notification')) { continue; }
            try {
                await vscode.commands.executeCommand(cmd);
            } catch {
                // Not active — continue
            }
        }
    }

    private async fullPoll(): Promise<void> {
        if (this.isPollInProgress || !this.isRunning || this.isDisposed) {
            return;
        }
        if (this.isUserInteracting()) { return; }

        this.isPollInProgress = true;

        try {
            for (const cmd of this.secondaryAcceptCommands) {
                if (this.isDisposed || !this.isRunning || this.isUserInteracting()) { break; }
                try {
                    await vscode.commands.executeCommand(cmd);
                } catch {
                    // Not active
                }
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.log(`Poll error: ${msg}`);
        } finally {
            this.isPollInProgress = false;
        }
    }

    // ── Strategy 4: Event-Driven Reactions ─────────────────

    private setupEventTracking(): void {
        if (vscode.window.onDidStartTerminalShellExecution) {
            this.trackingDisposables.push(
                vscode.window.onDidStartTerminalShellExecution(async (e) => {
                    if (!this.isRunning) { return; }

                    const commandLine = (e?.execution?.commandLine?.value || '').trim();
                    if (!commandLine) return;

                    const config = vscode.workspace.getConfiguration('autoAcceptAgent');
                    const blockedCommands = config.get<string[]>('blockedCommands', []);

                    for (const blocked of blockedCommands) {
                        if (!blocked) continue;
                        try {
                            const escapedBlocked = blocked.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            const regex = new RegExp(`(^|\\s|['"])${escapedBlocked}($|\\s|['"])`, 'i');
                            if (regex.test(commandLine)) {
                                this.log(`🚨 BLOCKED dangerous command: "${commandLine}" (matched item in block list: "${blocked}")`);
                                vscode.window.showWarningMessage(`Antigravity AutoAccept: Blocked command "${blocked}"`);
                                return;
                            }
                        } catch (err) {
                            if (commandLine.toLowerCase().includes(blocked.toLowerCase())) {
                                this.log(`🚨 BLOCKED dangerous command (Fallback): "${commandLine}"`);
                                return;
                            }
                        }
                    }

                    this.executedCount++;
                    this.lastActivity = commandLine;
                    this.log(`✅ Terminal command approved: ${commandLine}`);
                    await this.fastPoll();
                })
            );
        }

        // Track user interaction: pause polling while user types or moves cursor
        this.trackingDisposables.push(
            vscode.window.onDidChangeTextEditorSelection((e) => {
                if (e.kind === vscode.TextEditorSelectionChangeKind.Keyboard || e.kind === vscode.TextEditorSelectionChangeKind.Mouse) {
                    this.lastUserInteractionTime = Date.now();
                    const uriStr = e.textEditor.document.uri.toString();
                    this.userOpenedUris.add(uriStr);
                    this.agentOpenedUris.delete(uriStr);
                    this.cancelPendingClose(uriStr);
                }
            })
        );

        this.trackingDisposables.push(
            vscode.workspace.onDidChangeTextDocument((e) => {
                if (this.isRunning && e.contentChanges.length > 0) {
                    this.lastUserInteractionTime = Date.now();
                    this.lastActivity = `Edited ${e.document.fileName.split(/[\\/]/).pop()}`;
                }
            })
        );

        this.trackingDisposables.push(
            vscode.window.onDidChangeActiveTextEditor(async (editor) => {
                if (this.isRunning && !this.isDisposed) {
                    if (editor && this.isUserInteracting()) {
                        const uriStr = editor.document.uri.toString();
                        this.userOpenedUris.add(uriStr);
                        this.agentOpenedUris.delete(uriStr);
                        this.cancelPendingClose(uriStr);
                    }
                    if (this.isUserInteracting()) { return; }
                    setTimeout(() => {
                        void (async () => {
                            if (!this.isRunning || this.isDisposed || this.isUserInteracting()) { return; }
                            const fileAcceptCmds = [
                                'antigravity.prioritized.agentAcceptAllInFile',
                                'antigravity.prioritized.agentAcceptFocusedHunk',
                                                        'inlineChat.acceptChanges',
                            ];
                            for (const cmd of fileAcceptCmds) {
                                try {
                                    await vscode.commands.executeCommand(cmd);
                                } catch { }
                            }
                        })().catch(() => { });
                    }, 250);
                }
            })
        );

        this.trackingDisposables.push(
            vscode.window.onDidChangeVisibleTextEditors(async () => {
                if (this.isRunning && !this.isDisposed) {
                    if (this.isUserInteracting()) { return; }
                    setTimeout(() => {
                        void (async () => {
                            if (!this.isRunning || this.isDisposed || this.isUserInteracting()) { return; }
                            const fileAcceptCmds = [
                                'antigravity.prioritized.agentAcceptAllInFile',
                                'antigravity.prioritized.agentAcceptFocusedHunk',
                                                        'inlineChat.acceptChanges',
                            ];
                            for (const cmd of fileAcceptCmds) {
                                try {
                                    await vscode.commands.executeCommand(cmd);
                                } catch { }
                            }
                            for (const ed of vscode.window.visibleTextEditors) {
                                const uStr = ed.document.uri.toString();
                                if (this.agentOpenedUris.has(uStr) && !this.userOpenedUris.has(uStr)) {
                                    this.scheduleAutoClose(ed.document.uri);
                                }
                            }
                        })().catch(() => { });
                    }, 350);
                }
            })
        );

        this.trackingDisposables.push(
            vscode.window.onDidOpenTerminal(async () => {
                if (this.isRunning && !this.isDisposed) {
                    setTimeout(() => {
                        void (async () => {
                            if (!this.isRunning || this.isDisposed) { return; }
                            const interceptNotifications = this.shouldInterceptNotifications();
                            const cmds = [
                                'antigravity.terminalCommand.accept',
                                'antigravity.terminalCommand.run',
                                'workbench.action.terminal.chat.runCommand',
                            ];
                            for (const cmd of cmds) {
                                if (!interceptNotifications && cmd.toLowerCase().includes('notification')) { continue; }
                                try {
                                    await vscode.commands.executeCommand(cmd);
                                } catch { }
                            }
                        })().catch(() => { });
                    }, 300);
                }
            })
        );

        this.log('Event-driven tracking active.');
    }

    private stopAllPolling(): void {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        if (this.fastPollInterval) {
            clearInterval(this.fastPollInterval);
            this.fastPollInterval = null;
        }
        if (this.cdpIntervalId) {
            clearInterval(this.cdpIntervalId);
            this.cdpIntervalId = null;
        }
    }

    // ── Strategy 5: CDP Fallback ──────────────────────────

    private startCDPPolling(): void {
        if (this.isDisposed) return;
        const config = vscode.workspace.getConfiguration('autoAcceptAgent');
        const enableCDP = config.get<boolean>('enableCDP', false);
        if (!enableCDP) {
            return;
        }

        if (this.cdpIntervalId) {
            clearInterval(this.cdpIntervalId);
            this.cdpIntervalId = null;
        }

        this.cdpIntervalId = setInterval(() => {
            void this.checkPermissionButtons().catch((err: unknown) => {
                const msg = err instanceof Error ? err.message : String(err);
                this.log(`CDP poll error: ${msg}`);
            });
        }, 1500);
    }

    private async checkPermissionButtons(): Promise<void> {
        if (!this.isRunning || this.isDisposed || this.isCdpBusy) return;

        const now = Date.now();
        for (const key of Object.keys(this.lastExpandTimes)) {
            if (now - this.lastExpandTimes[key] > 60000) {
                delete this.lastExpandTimes[key];
            }
        }

        this.isCdpBusy = true;

        const config = vscode.workspace.getConfiguration('autoAcceptAgent');
        const customTexts = config.get<string[]>('customButtonTexts', []);

        const scriptGenerator = (canExpand: boolean) => {
            const blockedCommands = config.get<string[]>('blockedCommands', []);
            return `var CAN_EXPAND = ${canExpand};\nvar BLOCKED_CMDS = ${JSON.stringify(blockedCommands)};\n` + this.buildPermissionScript(customTexts);
        };

        try {
            const portsToScan = this.activeCdpPort ? [this.activeCdpPort, ...this.CDP_PORTS.filter(p => p !== this.activeCdpPort)] : this.CDP_PORTS;

            for (const port of portsToScan) {
                const connected = await this.multiplexCdpWebviews(port, scriptGenerator);
                if (connected) {
                    this.activeCdpPort = port;
                    this.isCdpBusy = false;
                    return;
                } else if (port === this.activeCdpPort) {
                    this.activeCdpPort = null;
                }
            }
        } catch { }
        finally {
            this.isCdpBusy = false;
        }
    }

    private cdpGetBrowserWsUrl(port: number): Promise<string | null> {
        return new Promise((resolve, reject) => {
            let done = false;
            const end = (err: Error | null, val: string | null = null) => {
                if (done) return;
                done = true;
                err ? reject(err) : resolve(val);
            };

            const req = http.get({ hostname: '127.0.0.1', port, path: '/json/version', timeout: 800 }, (res) => {
                if (res.statusCode !== 200) {
                    res.resume();
                    return end(new Error(`HTTP ${res.statusCode}`));
                }
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('error', (e) => end(e));
                res.on('end', () => {
                    try {
                        const info = JSON.parse(data);
                        end(null, info.webSocketDebuggerUrl || null);
                    } catch (e) {
                        end(e instanceof Error ? e : new Error(String(e)));
                    }
                });
            });
            req.on('error', (e) => end(e));
            req.on('timeout', () => { req.destroy(); end(new Error('timeout')); });
        });
    }

    private async multiplexCdpWebviews(port: number, scriptGenerator: (canExpand: boolean) => string): Promise<boolean> {
        try {
            const browserWsUrl = await this.cdpGetBrowserWsUrl(port);
            if (!browserWsUrl) return false;

            return await new Promise<boolean>((resolve) => {
                const ws = new WebSocket(browserWsUrl);
                let done = false;
                const end = (ok: boolean) => { if (!done) { done = true; resolve(ok); } };

                const timeout = setTimeout(() => { ws.close(); end(false); }, 5000);

                let msgId = 1;
                const pending: Record<number, { res: (v: any) => void; rej: (err: any) => void }> = {};

                function send(method: string, params: any = {}, sessionId: string | null = null): Promise<any> {
                    return new Promise((res, rej) => {
                        if (ws.readyState !== WebSocket.OPEN) {
                            return rej(new Error('WebSocket not open'));
                        }
                        const id = msgId++;
                        const timer = setTimeout(() => { delete pending[id]; rej(new Error('timeout')); }, 2000);
                        pending[id] = { res: (v) => { clearTimeout(timer); res(v); }, rej };
                        const payload: any = { id, method, params };
                        if (sessionId) payload.sessionId = sessionId;
                        try {
                            ws.send(JSON.stringify(payload));
                        } catch (err) {
                            clearTimeout(timer);
                            delete pending[id];
                            rej(err);
                        }
                    });
                }

                ws.on('message', (raw) => {
                    try {
                        const msg = JSON.parse(raw.toString());
                        if (msg.id && pending[msg.id]) {
                            pending[msg.id].res(msg);
                            delete pending[msg.id];
                        }
                    } catch { }
                });

                ws.on('error', () => { clearTimeout(timeout); end(false); });

                ws.on('open', async () => {
                    try {
                        await send('Target.setDiscoverTargets', { discover: true });
                        const targetsMsg = await send('Target.getTargets');
                        const allTargets = targetsMsg.result?.targetInfos || [];

                        const webviews = allTargets.filter((t: any) =>
                            t.url && (
                                t.url.includes('vscode-webview://') ||
                                t.url.includes('webview') ||
                                t.type === 'iframe'
                            )
                        );
                        const pageTargets = allTargets.filter((t: any) => t.type === 'page');

                        const allEvalTargets = [
                            ...webviews.map((t: any) => ({ ...t, kind: 'Webview' })),
                            ...pageTargets.map((t: any) => ({ ...t, kind: 'Page' }))
                        ];

                        const evalPromises = allEvalTargets.map(async (target: any) => {
                            try {
                                const targetId = target.targetId;
                                const shortId = targetId.substring(0, 6);
                                const attachMsg = await send('Target.attachToTarget', { targetId, flatten: true });
                                const sessionId = attachMsg.result?.sessionId;
                                if (!sessionId) return;

                                const now = Date.now();
                                const canExpand = !this.lastExpandTimes[targetId] || (now - this.lastExpandTimes[targetId] >= 8000);
                                const dynamicScript = scriptGenerator(canExpand);

                                const evalMsg = await send('Runtime.evaluate', { expression: dynamicScript }, sessionId);
                                const result = evalMsg.result?.result?.value;

                                if (result && typeof result === 'string' && result.startsWith('clicked:')) {
                                    if (result.includes('expand') || result.includes('requires input')) {
                                        this.lastExpandTimes[targetId] = Date.now();
                                    }
                                    this.log(`[CDP] Thread [${shortId}] -> ${result}`);
                                }

                                await send('Target.detachFromTarget', { sessionId }).catch(() => { });
                            } catch { }
                        });

                        await Promise.allSettled(evalPromises);

                        clearTimeout(timeout);
                        ws.close();
                        end(true);
                    } catch {
                        clearTimeout(timeout); ws.close(); end(false);
                    }
                });
            });
        } catch { return false; }
    }

    private buildPermissionScript(customTexts: string[]): string {
        const allowedTexts = [
            'run', 'accept', 'accept changes', 'accept all', 'accept all in file', 'keep', 'keep changes',
            'always allow', 'allow this conversation', 'allow',
            ...customTexts
        ];
        return `
(function() {
    var BUTTON_TEXTS = ${JSON.stringify(allowedTexts)};
    var BLOCKED_COMMANDS = typeof BLOCKED_CMDS !== 'undefined' ? BLOCKED_CMDS : [];
    // STRICT PLAN PROTECTION: Buttons that MUST NEVER be auto-clicked
    var FORBIDDEN_BUTTON_TEXTS = ['proceed', 'review', 'submit', 'approve plan', 'reject', 'submit feedback'];

    if (!document.querySelector('.react-app-container') && 
        !document.querySelector('[class*="agent"]') &&
        !document.querySelector('[data-vscode-context]') &&
        !document.querySelector('.monaco-editor') &&
        !document.querySelector('.diffZoneWidget')) {
        return 'not-agent-panel';
    }
    
    function closestClickable(node) {
        var el = node;
        while (el && el !== document.body) {
            var tag = (el.tagName || '').toLowerCase();
            if (tag === 'button' || tag.includes('button') || tag.includes('btn') ||
                el.getAttribute('role') === 'button' || el.classList.contains('cursor-pointer') ||
                el.onclick || el.getAttribute('tabindex') === '0') {
                return el;
            }
            el = el.parentElement;
        }
        return node;
    }
    
    function findButton(root, text) {
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        var node;
        while ((node = walker.nextNode())) {
            if (node.shadowRoot) {
                var result = findButton(node.shadowRoot, text);
                if (result) return result;
            }
            var nodeText = (node.textContent || '').trim().toLowerCase();
            if (nodeText.length > 50) continue;

            // Check if matches forbidden plan button
            for (var f = 0; f < FORBIDDEN_BUTTON_TEXTS.length; f++) {
                if (nodeText === FORBIDDEN_BUTTON_TEXTS[f] || nodeText.includes(FORBIDDEN_BUTTON_TEXTS[f])) {
                    return null; // NEVER click plan review/proceed buttons
                }
            }

            var isMatch = nodeText === text || 
                (text.length >= 5 && nodeText.startsWith(text) && nodeText.length <= text.length * 3);
            if (isMatch) {
                var clickable = closestClickable(node);
                var tag2 = (clickable.tagName || '').toLowerCase();
                if (tag2 === 'button' || tag2.includes('button') || clickable.getAttribute('role') === 'button' || 
                    tag2.includes('btn') || clickable.classList.contains('cursor-pointer') ||
                    clickable.onclick || clickable.getAttribute('tabindex') === '0') {
                    if (clickable.disabled || clickable.getAttribute('aria-disabled') === 'true' ||
                        clickable.classList.contains('loading') || clickable.querySelector('.codicon-loading')) {
                        return null;
                    }

                    var lastClickTime = parseInt(clickable.getAttribute('data-aa-t') || '0', 10);
                    if (lastClickTime && (Date.now() - lastClickTime < 5000)) {
                        return null;
                    }
                    return clickable;
                }
            }
        }
        return null;
    }
    
    for (var t = 0; t < BUTTON_TEXTS.length; t++) {
        var btn = findButton(document.body, BUTTON_TEXTS[t]);
        if (btn) {
            btn.setAttribute('data-aa-t', '' + Date.now());
            btn.click();
            return 'clicked:' + BUTTON_TEXTS[t];
        }
    }
    return 'no-permission-button';
})()
`;
    }

    // ── Status Bar ─────────────────────────────────────────

    private updateStatusBar(state: 'on' | 'off'): void {
        if (this.isDisposed || !this.statusBarItem) { return; }

        const config = vscode.workspace.getConfiguration('autoAcceptAgent');
        if (!config.get<boolean>('showStatusBarItem', true)) {
            this.statusBarItem.hide();
            return;
        }

        try {
            switch (state) {
                case 'on':
                    this.statusBarItem.text = '$(check) AutoAccept';
                    this.statusBarItem.tooltip =
                        `Antigravity AutoAccept is ACTIVE\n` +
                        `• Auto-accepts routine tool commands & diffs\n` +
                        `• Auto-closes accepted agent files (preserves user & pinned tabs)\n` +
                        `• Plan reviews ("Proceed", "Review") remain MANUAL\n` +
                        `Click to toggle.`;
                    this.statusBarItem.backgroundColor = undefined;
                    break;
                case 'off':
                    this.statusBarItem.text = '$(circle-slash) AutoAccept: OFF';
                    this.statusBarItem.tooltip = 'Antigravity AutoAccept is stopped. Click to start.';
                    this.statusBarItem.backgroundColor = undefined;
                    break;
            }
            this.statusBarItem.show();
        } catch { }
    }

    // ── Cleanup & Logging ──────────────────────────────────

    private disposeTracking(): void {
        for (const d of this.trackingDisposables) {
            try { d.dispose(); } catch { }
        }
        this.trackingDisposables = [];
    }

    private log(message: string): void {
        try {
            const timestamp = new Date().toISOString();
            this.outputChannel?.appendLine(`[${timestamp}] ${message}`);
            console.log(`[Antigravity-AutoAccept] [${timestamp}] ${message}`);
        } catch { }
    }
}
