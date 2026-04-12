import * as fs from 'fs';
import * as vscode from 'vscode';
import { StateService } from '../project/stateService';
import { RunRecord } from '../project/types';
import { resolveActiveRunRecord } from '../simulation/runsService';

export function pickRunRecordForTarget(
    records: Record<string, RunRecord>,
    targetId: string | undefined
): RunRecord | undefined {
    if (!targetId) {
        return undefined;
    }

    return records[targetId];
}

export async function openLastWaveformByTarget(stateService: StateService): Promise<void> {
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

    if (!record) {
        vscode.window.showWarningMessage('No run record matched the current active target context.');
        return;
    }

    if (!record.waveformPath || !fs.existsSync(record.waveformPath)) {
        vscode.window.showWarningMessage('No waveform path found in last run record for active target.');
        return;
    }

    await vscode.commands.executeCommand('hdl-helper.viewWaveform', record.waveformPath);
}