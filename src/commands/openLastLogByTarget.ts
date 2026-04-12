import * as fs from 'fs';
import * as vscode from 'vscode';
import { StateService } from '../project/stateService';
import { RunRecord } from '../project/types';
import { resolveActiveRunRecord } from '../simulation/runsService';

export function getLogPathFromRunRecord(record: RunRecord | undefined): string | undefined {
    return record?.logPath;
}

export async function openLastLogByTarget(stateService: StateService): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showWarningMessage('No workspace folder open.');
        return;
    }

    const { records, record } = await resolveActiveRunRecord(stateService, workspaceFolder);
    if (Object.keys(records).length === 0) {
        vscode.window.showWarningMessage('No recent run records found for current workspace.');
        return;
    }
    const logPath = getLogPathFromRunRecord(record);

    if (!logPath || !fs.existsSync(logPath)) {
        vscode.window.showWarningMessage('No log path found in last run record for active target.');
        return;
    }

    await vscode.window.showTextDocument(vscode.Uri.file(logPath), { preview: false });
}