import * as fs from 'fs';
import * as vscode from 'vscode';
import { StateService } from '../project/stateService';
import { RunRecord } from '../project/types';
import { resolveActiveRunRecord } from '../simulation/runsService';

type ArtifactAction = 'Open Waveform' | 'Open Log';

export function getAvailableArtifactActions(
    record: RunRecord | undefined,
    existsSync: (filePath: string) => boolean = fs.existsSync
): ArtifactAction[] {
    if (!record) {
        return [];
    }

    const actions: ArtifactAction[] = [];
    if (record.waveformPath && existsSync(record.waveformPath)) {
        actions.push('Open Waveform');
    }
    if (record.logPath && existsSync(record.logPath)) {
        actions.push('Open Log');
    }

    return actions;
}

export function getMissingArtifactReasons(
    record: RunRecord | undefined,
    existsSync: (filePath: string) => boolean = fs.existsSync
): string[] {
    if (!record) {
        return ['No run record matched the current active target context.'];
    }

    const reasons: string[] = [];
    if (!record.waveformPath) {
        reasons.push('Waveform path is missing in run record.');
    } else if (!existsSync(record.waveformPath)) {
        reasons.push(`Waveform file not found: ${record.waveformPath}`);
    }

    if (!record.logPath) {
        reasons.push('Log path is missing in run record.');
    } else if (!existsSync(record.logPath)) {
        reasons.push(`Log file not found: ${record.logPath}`);
    }

    return reasons;
}

export async function openLastRunArtifactsByTarget(stateService: StateService): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showWarningMessage('No workspace folder open.');
        return;
    }

    const { records, targetId, record } = await resolveActiveRunRecord(stateService, workspaceFolder);
    if (Object.keys(records).length === 0) {
        vscode.window.showWarningMessage('No recent run records found for current workspace.');
        return;
    }

    const actions = getAvailableArtifactActions(record);
    if (actions.length === 0) {
        const reasons = getMissingArtifactReasons(record);
        vscode.window.showWarningMessage(reasons.join(' '));
        return;
    }

    let pickedAction: ArtifactAction | undefined;
    if (actions.length === 1) {
        pickedAction = actions[0];
    } else {
        pickedAction = await vscode.window.showQuickPick(actions, {
            placeHolder: `Select artifact to open (${targetId || 'active target'})`
        }) as ArtifactAction | undefined;
    }

    if (!pickedAction) {
        return;
    }

    if (pickedAction === 'Open Waveform' && record?.waveformPath) {
        await vscode.commands.executeCommand('hdl-helper.viewWaveform', record.waveformPath);
        return;
    }

    if (pickedAction === 'Open Log' && record?.logPath) {
        await vscode.window.showTextDocument(vscode.Uri.file(record.logPath), { preview: false });
    }
}