import * as vscode from 'vscode';
import { AutoAcceptor } from './autoAcceptor';
import { runDiagnostics } from './diagnostics';

let acceptor: AutoAcceptor | undefined;

export function activate(context: vscode.ExtensionContext): void {
    try {
        const output = vscode.window.createOutputChannel('Antigravity AutoAccept');
        output.appendLine('Antigravity AutoAccept activated');

        const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
        statusBar.command = 'autoAcceptAgent.toggle';

        acceptor = new AutoAcceptor(statusBar, output, context);

        const cmd = (id: string, fn: () => Promise<void>) =>
            vscode.commands.registerCommand(id, async () => {
                try {
                    await fn();
                } catch (e) {
                    const msg = e instanceof Error ? e.message : String(e);
                    vscode.window.showErrorMessage(`Antigravity AutoAccept: ${msg}`);
                }
            });

        context.subscriptions.push(
            cmd('autoAcceptAgent.toggle', () => acceptor!.toggle()),
            cmd('autoAcceptAgent.start', () => acceptor!.start()),
            cmd('autoAcceptAgent.stop', () => acceptor!.stop()),
            cmd('autoAcceptAgent.diagnostics', () => runDiagnostics(output)),
            cmd('autoAcceptAgent.acceptNow', async () => {
                const multiFileCmds = [
                    'chatEditing.acceptAllFiles',
                    'antigravity.prioritized.agentAcceptAll',
                    'workbench.action.chat.acceptAll',
                    'antigravity.agentAcceptAll',
                    'antigravity.chat.acceptAll',
                    'antigravity.acceptAll',
                ];
                for (const mc of multiFileCmds) {
                    try { await vscode.commands.executeCommand(mc); } catch { }
                }

                try {
                    for (const group of vscode.window.tabGroups.all) {
                        for (const tab of group.tabs) {
                            const inputAny = tab?.input as { uri?: vscode.Uri; modified?: vscode.Uri };
                            const uri = inputAny?.uri || inputAny?.modified;
                            if (uri) {
                                try {
                                    await vscode.commands.executeCommand('chatEditing.acceptFile', uri);
                                    await vscode.commands.executeCommand('antigravity.prioritized.agentAcceptAllInFile', uri);
                                } catch { }
                            }
                        }
                    }
                } catch { }

                for (const editor of vscode.window.visibleTextEditors) {
                    try {
                        await vscode.commands.executeCommand('chatEditing.acceptFile', editor.document.uri);
                        await vscode.commands.executeCommand('antigravity.prioritized.agentAcceptAllInFile', editor.document.uri);
                        await vscode.commands.executeCommand('antigravity.prioritized.agentAcceptFocusedHunk');
                    } catch { }
                }
                const cmds = [
                    'chatEditing.acceptAllFiles',
                    'workbench.action.chat.acceptAll',
                    'antigravity.prioritized.agentAcceptAll',
                    'antigravity.prioritized.agentAcceptAllInFile',
                    'antigravity.prioritized.agentAcceptFocusedHunk',
                    'antigravity.prioritized.submitCodeAcknowledgement',
                    'antigravity.command.accept',
                    'antigravity.terminalCommand.accept',
                    'antigravity.terminalCommand.run',
                    'inlineChat.acceptChanges',
                    'chat.action.acceptTool',
                    'workbench.action.chat.accept',
                    'workbench.action.terminal.chat.runCommand',
                ];
                for (const c of cmds) {
                    try { await vscode.commands.executeCommand(c); } catch { }
                }
            }),
            acceptor
        );

        acceptor.start().catch(() => { });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Antigravity AutoAccept activation failed: ${msg}`);
    }
}

export async function deactivate(): Promise<void> {
    acceptor = undefined;
}
