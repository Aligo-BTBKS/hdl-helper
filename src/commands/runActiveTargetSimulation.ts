import * as vscode from 'vscode';
import { ProjectConfigService } from '../project/projectConfigService';
import { ProjectManager } from '../project/projectManager';
import { StateService } from '../project/stateService';
import { TargetContextService } from '../project/targetContextService';
import { TargetContext } from '../project/types';
import { writeRunRecordForTarget } from '../simulation/runsService';
import { HdlSimTask, SimManager } from '../simulation/simManager';

export function resolveFallbackSimulationTop(designTop?: string, simulationTop?: string): string | undefined {
    return simulationTop || designTop;
}

export function buildConfigFallbackWarning(activeTargetId?: string): string {
    if (activeTargetId) {
        return `Active target '${activeTargetId}' has no resolved top. Falling back to heuristic top.`;
    }

    return 'Unable to resolve active target context from project config. Falling back to heuristic top.';
}

export function buildContextDrivenSimTask(activeContext: TargetContext | undefined): HdlSimTask | undefined {
    if (!activeContext) {
        return undefined;
    }

    return SimManager.buildTaskFromTargetContext(activeContext);
}

export function resolveRunTargetId(activeTargetId: string | undefined, fallbackTop: string | undefined): string | undefined {
    if (activeTargetId && activeTargetId !== 'heuristic-fallback') {
        return activeTargetId;
    }

    if (fallbackTop) {
        return `heuristic:${fallbackTop}`;
    }

    return activeTargetId;
}

export async function runActiveTargetSimulation(
    stateService: StateService,
    projectManager: ProjectManager
): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showWarningMessage('No workspace folder open.');
        return;
    }

    let activeContext: TargetContext | undefined;
    let resolvedTop: string | undefined;
    let fallbackWarning: string | undefined;

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

        activeContext = targetContextService.getActiveTargetContext();
        resolvedTop = activeContext?.top;
        if (!resolvedTop) {
            fallbackWarning = buildConfigFallbackWarning(activeContext?.targetId);
        }

        configService.dispose();
    }

    if (!resolvedTop) {
        resolvedTop = resolveFallbackSimulationTop(
            stateService.getDesignTop(),
            stateService.getSimulationTop()
        );

        if (resolvedTop && fallbackWarning) {
            vscode.window.showWarningMessage(fallbackWarning);
        }
    }

    if (!resolvedTop) {
        vscode.window.showWarningMessage('Cannot resolve top for active target simulation. Set Simulation Top or configure active target top in project.json.');
        return;
    }

    if (configEnabled && activeContext?.top) {
        const contextTask = buildContextDrivenSimTask(activeContext);
        if (!contextTask) {
            vscode.window.showWarningMessage('Unable to build simulation task from active target context.');
            return;
        }

        const runResult = await SimManager.runTargetContext(activeContext, projectManager, workspaceFolder.uri);
        const targetDrivenRunsEnabled = vscode.workspace
            .getConfiguration('hdl-helper', workspaceFolder.uri)
            .get<boolean>('targetDrivenRuns.enabled', false);

        if (targetDrivenRunsEnabled) {
            const targetId = resolveRunTargetId(activeContext.targetId, resolvedTop);
            if (targetId) {
                await writeRunRecordForTarget(stateService, targetId, {
                    top: contextTask.top,
                    taskName: contextTask.name,
                    success: runResult.success,
                    failureType: runResult.failureType,
                    waveformPath: runResult.waveformPath,
                    buildDir: runResult.buildDir,
                    logPath: runResult.logPath
                });
            }
        }

        return;
    }

    await vscode.commands.executeCommand('hdl-helper.runSimulation', resolvedTop);
}
