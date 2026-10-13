import * as vscode from 'vscode';
import { AutoAcceptor } from './autoAcceptor';
import { runDiagnostics } from './diagnostics';

let acceptor: AutoAcceptor | undefined;

export function activate(context: vscode.ExtensionContext): void {
    try {
        const output = vscode.window.createOutputChannel('Antigravity AutoAccept');
        output.appendLine('Antigravity AutoAccept activated');

        const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
        statusBar.name = 'Antigravity AutoAccept';
        statusBar.command = 'autoAcceptAgent.toggle';
        context.subscriptions.push(statusBar);

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
            cmd('autoAcceptAgent.acceptNow', () => acceptor!.acceptNow()),
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
