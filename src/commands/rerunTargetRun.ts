import * as vscode from 'vscode';
import { StateService } from '../project/stateService';
import { RunRecord } from '../project/types';
import { resolveActiveTargetIdFromRuns } from '../simulation/runsService';
import { pickRunRecordByTarget } from './openRunRecordArtifacts';

export function resolveTargetIdFromRerunArg(arg: unknown): string | undefined {
    if (typeof arg === 'string') {
        return arg;
    }

    if (arg && typeof arg === 'object' && 'targetId' in (arg as Record<string, unknown>)) {
        const value = (arg as Record<string, unknown>).targetId;
        if (typeof value === 'string' && value.trim()) {
            return value;
        }
    }

    return undefined;
}

export function resolveRerunTop(record: RunRecord | undefined): string | undefined {
    if (!record) {
        return undefined;
    }

    if (record.top) {
        return record.top;
    }

    if (record.taskName && record.taskName.startsWith('Simulate ')) {
        return record.taskName.slice('Simulate '.length).trim() || undefined;
    }

    return undefined;
}

export async function rerunTargetRun(stateService: StateService, explicitTargetId?: string): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showWarningMessage('No workspace folder open.');
        return;
    }

    const records = stateService.getAllRunRecords();
    if (Object.keys(records).length === 0) {
        vscode.window.showWarningMessage('No recent run records found for current workspace.');
        return;
    }

    let targetId = explicitTargetId;
    if (!targetId) {
        targetId = await resolveActiveTargetIdFromRuns(stateService, records, workspaceFolder);
    }

    if (!targetId) {
        vscode.window.showWarningMessage('Cannot resolve active target to rerun.');
        return;
    }

    const record = pickRunRecordByTarget(records, targetId);
    const top = resolveRerunTop(record);
    if (!top) {
        vscode.window.showWarningMessage(`No top module found in run record for target '${targetId}'.`);
        return;
    }

    await vscode.commands.executeCommand('hdl-helper.runSimulation', top);
}
