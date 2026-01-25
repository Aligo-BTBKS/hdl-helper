import * as vscode from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    StreamInfo
} from 'vscode-languageclient/node';
import * as path from 'path';
import * as cp from 'child_process';

let client: LanguageClient;

export function activateLanguageServer(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('hdl-helper');
    const enabled = config.get<boolean>('languageServer.enabled');
    
    if (!enabled) return;

    let serverPath = config.get<string>('languageServer.path') || 'verible-verilog-ls';

    if (process.platform === 'win32') {
        if (!serverPath.endsWith('.exe')) {
             if (path.isAbsolute(serverPath) && !serverPath.includes('.')) {
                 serverPath += '.exe';
             }
        }
    }

    console.log(`[LSP] Preparing to start Verible LS: "${serverPath}"`);

    const serverOptions: ServerOptions = async (): Promise<StreamInfo> => {
        
        // 1. Get current workspace folder for CWD
        const cwd = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        console.log(`[LSP] Working Directory (CWD): ${cwd}`);

        // 2. Start the process (Renamed variable to 'child' to avoid conflict)
        const child = cp.spawn(serverPath, [], {
            cwd: cwd,
            env: process.env, // Now this refers to the global Node.js process correctly
            shell: false
        });

        console.log(`[LSP] Child Process PID: ${child.pid}`);

        // 3. Error Listeners
        child.on('error', (err) => {
            console.error('[LSP Error] Launch failed:', err);
            vscode.window.showErrorMessage(`Verible LS Launch Failed: ${err.message}`);
        });

        child.stderr?.on('data', (data) => {
            console.log(`[LSP Stderr]: ${data.toString()}`);
        });

        child.on('exit', (code, signal) => {
            console.log(`[LSP] Process exited. Code: ${code}, Signal: ${signal}`);
        });

        // 4. Connect streams
        return Promise.resolve({
            reader: child.stdout!, // The ! tells TypeScript "I promise this exists"
            writer: child.stdin!
        });
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [
            { scheme: 'file', language: 'verilog' },
            { scheme: 'file', language: 'systemverilog' }
        ],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{v,sv,vh,svh}')
        }
    };

    client = new LanguageClient(
        'veribleLS',
        'Verible Language Server',
        serverOptions,
        clientOptions
    );

    client.start().catch(error => {
        client.error(`LSP Client Start Failed: ${error}`, error, 'force');
    });
}

export function deactivateLanguageServer(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}