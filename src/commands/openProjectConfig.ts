import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface OpenProjectConfigOptions {
    workspaceRoot?: string;
    existsSync?: (filePath: string) => boolean;
    openConfig: (filePath: string) => Promise<void>;
    runCreate: () => Promise<void>;
    showWarning: (message: string) => void;
}

export function getProjectConfigPath(workspaceRoot: string | undefined): string | undefined {
    if (!workspaceRoot) {
        return undefined;
    }

    return path.join(workspaceRoot, '.hdl-helper', 'project.json');
}

export async function openProjectConfig(options: OpenProjectConfigOptions): Promise<'opened' | 'created' | 'unavailable'> {
    const configPath = getProjectConfigPath(options.workspaceRoot);
    if (!configPath) {
        options.showWarning('No workspace folder open.');
        return 'unavailable';
    }

    const exists = (options.existsSync || fs.existsSync)(configPath);
    if (exists) {
        await options.openConfig(configPath);
        return 'opened';
    }

    options.showWarning('.hdl-helper/project.json is missing. Creating a template.');
    await options.runCreate();
    return 'created';
}

export async function openProjectConfigFromWorkspace(runCreate: () => Promise<void>): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    await openProjectConfig({
        workspaceRoot,
        openConfig: async (filePath: string) => {
            await vscode.window.showTextDocument(vscode.Uri.file(filePath), { preview: false });
        },
        runCreate,
        showWarning: (message: string) => {
            vscode.window.showWarningMessage(message);
        }
    });
}