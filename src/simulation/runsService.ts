import * as vscode from 'vscode';
import { ProjectConfigService } from '../project/projectConfigService';
import { StateService } from '../project/stateService';
import { TargetContextService } from '../project/targetContextService';
import { RunFailureType, RunRecord } from '../project/types';

export interface ActiveRunResolution {
    records: Record<string, RunRecord>;
    targetId?: string;
    record?: RunRecord;
}

export interface RunRecordWriteInput {
    top?: string;
    taskName?: string;
    success: boolean;
    failureType?: RunFailureType;
    waveformPath?: string;
    buildDir?: string;
    logPath?: string;
    timestamp?: number;
}

export function resolveHeuristicRunTargetId(
    records: Record<string, RunRecord>,
    designTop: string | undefined,
    simulationTop: string | undefined
): string | undefined {
    if (simulationTop && records[`heuristic:${simulationTop}`]) {
        return `heuristic:${simulationTop}`;
    }

    if (designTop && records[`heuristic:${designTop}`]) {
        return `heuristic:${designTop}`;
    }

    return undefined;
}

export async function resolveActiveTargetIdFromRuns(
    stateService: StateService,
    records: Record<string, RunRecord>,
    workspaceFolder: vscode.WorkspaceFolder | undefined
): Promise<string | undefined> {
    if (!workspaceFolder) {
        return undefined;
    }

    const configEnabled = vscode.workspace
        .getConfiguration('hdl-helper', workspaceFolder.uri)
        .get<boolean>('projectConfig.enabled', false);

    if (configEnabled) {
        const configService = new ProjectConfigService(workspaceFolder.uri.fsPath);
        const projectConfig = await configService.loadConfig();
        const targetContextService = new TargetContextService(workspaceFolder.uri.fsPath, {
            projectConfig,
            designTop: stateService.getDesignTop(),
            simulationTop: stateService.getSimulationTop()
        });
        const targetId = targetContextService.getActiveTargetContext()?.targetId;
        configService.dispose();

        if (targetId) {
            return targetId;
        }
    }

    return resolveHeuristicRunTargetId(
        records,
        stateService.getDesignTop(),
        stateService.getSimulationTop()
    );
}

export async function resolveActiveRunRecord(
    stateService: StateService,
    workspaceFolder: vscode.WorkspaceFolder | undefined
): Promise<ActiveRunResolution> {
    const records = stateService.getAllRunRecords();
    const targetId = await resolveActiveTargetIdFromRuns(stateService, records, workspaceFolder);
    return {
        records,
        targetId,
        record: targetId ? records[targetId] : undefined
    };
}

export async function writeRunRecordForTarget(
    stateService: StateService,
    targetId: string,
    input: RunRecordWriteInput
): Promise<void> {
    await stateService.setLastRunForTarget(targetId, {
        targetId,
        top: input.top,
        taskName: input.taskName,
        timestamp: input.timestamp ?? Date.now(),
        success: input.success,
        failureType: input.failureType,
        waveformPath: input.waveformPath,
        buildDir: input.buildDir,
        logPath: input.logPath
    });
}
