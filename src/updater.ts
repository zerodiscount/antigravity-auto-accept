import * as vscode from 'vscode';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';

export class UpdateManager implements vscode.Disposable {
    private timer?: NodeJS.Timeout;
    private isChecking = false;
    private readonly output: vscode.OutputChannel;
    private readonly context: vscode.ExtensionContext;
    private updateStatusBarItem?: vscode.StatusBarItem;

    constructor(context: vscode.ExtensionContext, output: vscode.OutputChannel) {
        this.context = context;
        this.output = output;
    }

    public start(): void {
        // Automatic update checking is completely disabled to prevent boot loops and unexpected popups.
        this.output.appendLine('[Updater] Automatic update polling is disabled.');
        return;
    }

    public stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
        if (this.updateStatusBarItem) {
            this.updateStatusBarItem.dispose();
            this.updateStatusBarItem = undefined;
        }
    }

    public dispose(): void {
        this.stop();
    }

    private getServerUrl(): string {
        const config = vscode.workspace.getConfiguration('autoAcceptAgent');
        return config.get<string>('updateServerUrl', 'http://10.2.100.120:3000').replace(/\/+$/, '');
    }

    public async checkForUpdates(silent: boolean = false): Promise<void> {
        if (this.isChecking) { return; }
        this.isChecking = true;

        try {
            let currentVersion = this.context.extension?.packageJSON?.version;
            if (!currentVersion) {
                try {
                    const localPkgPath = path.join(this.context.extensionPath, 'package.json');
                    if (fs.existsSync(localPkgPath)) {
                        const parsed = JSON.parse(fs.readFileSync(localPkgPath, 'utf-8'));
                        currentVersion = parsed.version;
                    }
                } catch { }
            }
            currentVersion = currentVersion || '1.2.2';
            const serverUrl = this.getServerUrl();
            const packageJsonUrl = `${serverUrl}/api/v1/repos/AuraMetrics/hygient-antigravity-autoaccept/raw/master/package.json`;

            this.output.appendLine(`[Updater] Checking for updates from ${packageJsonUrl} (current: v${currentVersion})...`);

            const remoteJsonStr = await this.httpGet(packageJsonUrl, 6000);
            const remotePkg = JSON.parse(remoteJsonStr);
            const remoteVersion = remotePkg.version;

            if (!remoteVersion) {
                if (!silent) {
                    vscode.window.showWarningMessage('Antigravity AutoAccept: Could not read remote version from Forgejo.');
                }
                return;
            }

            this.output.appendLine(`[Updater] Current: v${currentVersion}, Remote: v${remoteVersion}`);

            if (this.isNewer(remoteVersion, currentVersion)) {
                this.output.appendLine(`[Updater] Newer version available: v${remoteVersion}`);
                this.showUpdateAvailable(remoteVersion, silent);
            } else {
                this.output.appendLine('[Updater] Extension is up to date.');
                if (this.updateStatusBarItem) {
                    this.updateStatusBarItem.hide();
                }
                if (!silent) {
                    vscode.window.showInformationMessage(`Antigravity AutoAccept is up to date (v${currentVersion}).`);
                }
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.output.appendLine(`[Updater] Update check failed: ${msg}`);
            if (!silent) {
                vscode.window.showWarningMessage(`Antigravity AutoAccept update check failed: ${msg}`);
            }
        } finally {
            this.isChecking = false;
        }
    }

    private isNewer(remote: string, current: string): boolean {
        const parse = (v: string) => v.split('.').map(x => parseInt(x, 10) || 0);
        const [rMajor, rMinor, rPatch] = parse(remote);
        const [cMajor, cMinor, cPatch] = parse(current);

        if (rMajor !== cMajor) { return rMajor > cMajor; }
        if (rMinor !== cMinor) { return rMinor > cMinor; }
        return rPatch > cPatch;
    }

    private showUpdateAvailable(newVersion: string, silent: boolean): void {
        if (!this.updateStatusBarItem) {
            this.updateStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
            this.updateStatusBarItem.command = 'autoAcceptAgent.checkForUpdates';
        }
        this.updateStatusBarItem.text = `$(cloud-download) AutoAccept: v${newVersion}`;
        this.updateStatusBarItem.tooltip = `Antigravity AutoAccept v${newVersion} is available. Click to update.`;
        this.updateStatusBarItem.show();

        // Manual prompt only - never auto-download without user confirmation
        vscode.window.showInformationMessage(
            `Antigravity AutoAccept update available: v${newVersion}`,
            'Update Now',
            'Later'
        ).then((selection) => {
            if (selection === 'Update Now') {
                void this.downloadAndInstall(newVersion);
            }
        });
    }

    public async downloadAndInstall(newVersion: string): Promise<void> {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Antigravity AutoAccept: Updating to v${newVersion}...`,
            cancellable: false
        }, async (progress) => {
            try {
                const serverUrl = this.getServerUrl();
                const vsixUrl = `${serverUrl}/api/v1/repos/AuraMetrics/hygient-antigravity-autoaccept/raw/master/hygient-antigravity-autoaccept.vsix`;
                const tempVsixPath = path.join(os.tmpdir(), `hygient-autoaccept-${newVersion}.vsix`);

                progress.report({ message: 'Downloading package from Forgejo...' });
                this.output.appendLine(`[Updater] Downloading VSIX from ${vsixUrl} to ${tempVsixPath}...`);

                await this.httpDownload(vsixUrl, tempVsixPath);

                progress.report({ message: 'Extracting and installing...' });
                const currentExtPath = this.context.extensionPath;
                const extensionsDir = path.dirname(currentExtPath);
                const targetDir = path.join(extensionsDir, `hygient.hygient-antigravity-autoaccept-${newVersion}-universal`);
                const extensionsJsonPath = path.join(extensionsDir, 'extensions.json');

                this.output.appendLine(`[Updater] Target install dir: ${targetDir}`);

                await this.extractVsix(tempVsixPath, targetDir, extensionsJsonPath, newVersion);

                try { fs.unlinkSync(tempVsixPath); } catch { }

                this.output.appendLine(`[Updater] Successfully installed v${newVersion}!`);
                if (this.updateStatusBarItem) {
                    this.updateStatusBarItem.hide();
                }

                const reloadAction = await vscode.window.showInformationMessage(
                    `Antigravity AutoAccept has been updated to v${newVersion}! Reload window to apply.`,
                    'Reload Window',
                    'Later'
                );
                if (reloadAction === 'Reload Window') {
                    await vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                this.output.appendLine(`[Updater] Install failed: ${msg}`);
                vscode.window.showErrorMessage(`Antigravity AutoAccept update failed: ${msg}`);
            }
        });
    }

    private extractVsix(vsixPath: string, targetDir: string, extensionsJsonPath: string, version: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const pythonScript = `
import zipfile, os, json, shutil, time

vsix = ${JSON.stringify(vsixPath)}
dest = ${JSON.stringify(targetDir)}
ext_json = ${JSON.stringify(extensionsJsonPath)}
ver = ${JSON.stringify(version)}

if os.path.exists(dest):
    shutil.rmtree(dest)
os.makedirs(dest, exist_ok=True)

with zipfile.ZipFile(vsix, 'r') as z:
    for m in z.infolist():
        if m.filename.startswith('extension/'):
            rel = m.filename[len('extension/'):]
            if not rel: continue
            target = os.path.join(dest, rel)
            if m.is_dir():
                os.makedirs(target, exist_ok=True)
            else:
                os.makedirs(os.path.dirname(target), exist_ok=True)
                with open(target, 'wb') as f:
                    f.write(z.read(m))
        elif m.filename == 'extension.vsixmanifest':
            with open(os.path.join(dest, '.vsixmanifest'), 'wb') as f:
                f.write(z.read(m))

ext_entry = {
    "identifier": { "id": "hygient.hygient-antigravity-autoaccept" },
    "version": ver,
    "location": { "$mid": 1, "path": dest, "scheme": "file" },
    "relativeLocation": os.path.basename(dest),
    "metadata": {
        "installedTimestamp": int(time.time() * 1000),
        "pinned": False,
        "source": "custom",
        "publisherId": "hygient-internal",
        "publisherDisplayName": "Hygient",
        "targetPlatform": "universal",
        "updated": False,
        "private": True,
        "isPreReleaseVersion": False,
        "hasPreReleaseVersion": False
    }
}

if os.path.exists(ext_json):
    try:
        with open(ext_json, 'r') as f:
            exts = json.load(f)
    except Exception:
        exts = []
    exts = [e for e in exts if e.get("identifier", {}).get("id") != "hygient.hygient-antigravity-autoaccept"]
    exts.append(ext_entry)
    with open(ext_json, 'w') as f:
        json.dump(exts, f, indent=2)
`;
            execFile('python3', ['-c', pythonScript], (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(stderr || stdout || error.message));
                } else {
                    resolve();
                }
            });
        });
    }

    private httpGet(urlStr: string, timeoutMs: number): Promise<string> {
        return new Promise((resolve, reject) => {
            const parsed = new URL(urlStr);
            const req = http.get({
                hostname: parsed.hostname,
                port: parsed.port || 80,
                path: parsed.pathname + parsed.search,
                timeout: timeoutMs,
            }, (res) => {
                if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                    reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    res.resume();
                    return;
                }
                let data = '';
                res.setEncoding('utf8');
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`Request timed out after ${timeoutMs}ms`));
            });
            req.on('error', reject);
        });
    }

    private httpDownload(urlStr: string, destFilePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const parsed = new URL(urlStr);
            const fileStream = fs.createWriteStream(destFilePath);
            const req = http.get({
                hostname: parsed.hostname,
                port: parsed.port || 80,
                path: parsed.pathname + parsed.search,
                timeout: 30000,
            }, (res) => {
                if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                    fileStream.close();
                    fs.unlinkSync(destFilePath);
                    reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    return;
                }
                res.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve();
                });
                fileStream.on('error', (err) => {
                    fileStream.close();
                    try { fs.unlinkSync(destFilePath); } catch { }
                    reject(err);
                });
            });

            req.on('timeout', () => {
                req.destroy();
                fileStream.close();
                try { fs.unlinkSync(destFilePath); } catch { }
                reject(new Error('Download timed out'));
            });
            req.on('error', (err) => {
                fileStream.close();
                try { fs.unlinkSync(destFilePath); } catch { }
                reject(err);
            });
        });
    }
}
