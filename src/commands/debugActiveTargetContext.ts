import * as vscode from 'vscode';
import { ProjectConfigService } from '../project/projectConfigService';
import { StateService } from '../project/stateService';
import { TargetContextService } from '../project/targetContextService';
import {
    NormalizedProjectConfig,
    ProjectConfigStatus,
    TargetContext,
    TargetKind
} from '../project/types';

export interface TargetContextDebugSnapshotInput {
    workspaceName: string;
    workspaceRoot: string;
    configEnabled: boolean;
    configStatus: ProjectConfigStatus;
    projectConfig?: NormalizedProjectConfig;
    designTop?: string;
    simulationTop?: string;
}

export interface TargetContextDebugSnapshot {
    workspaceName: string;
    workspaceRoot: string;
    configEnabled: boolean;
    configStatus: ProjectConfigStatus;
    activeTarget?: string;
    fallbackTarget?: string;
    context?: TargetContext;
    issues: string[];
}

export function buildTargetContextDebugSnapshot(
    input: TargetContextDebugSnapshotInput
): TargetContextDebugSnapshot {
    const issues: string[] = [];

    if (!input.configEnabled) {
        issues.push('projectConfig.enabled is false; running in heuristic compatibility mode.');
    } else if (input.configStatus === ProjectConfigStatus.Missing) {
        issues.push('.hdl-helper/project.json is missing; fallback to heuristic compatibility mode.');
    } else if (input.configStatus === ProjectConfigStatus.Invalid) {
        issues.push('.hdl-helper/project.json is invalid; fallback to heuristic compatibility mode.');
    }

    const config = input.projectConfig;
    const activeTarget = config?.activeTarget;
    const targetIds = config ? Object.keys(config.targets) : [];
    const fallbackTarget = targetIds.length > 0 ? targetIds[0] : undefined;

    if (config && activeTarget && !config.targets[activeTarget]) {
        issues.push(`activeTarget '${activeTarget}' is invalid; fallback target is '${fallbackTarget || 'heuristic'}'.`);
    }

    if (config) {
        for (const [targetId, target] of Object.entries(config.targets)) {
            const resolvedTop = resolveTopForTarget(
                target.kind,
                target.top,
                config.tops.design,
                config.tops.simulation,
                input.designTop,
                input.simulationTop
            );

            if (!resolvedTop) {
                issues.push(`Target '${targetId}' has no resolved top.`);
            }
        }
    }

    const targetContextService = new TargetContextService(input.workspaceRoot, {
        projectConfig: config,
        designTop: input.designTop,
        simulationTop: input.simulationTop
    });
    const context = targetContextService.getActiveTargetContext();

    if (!context) {
        issues.push('Unable to resolve active target context.');
    } else if (!context.top) {
        issues.push(`Resolved target context '${context.targetId}' has no top module.`);
    }

    return {
        workspaceName: input.workspaceName,
        workspaceRoot: input.workspaceRoot,
        configEnabled: input.configEnabled,
        configStatus: input.configStatus,
        activeTarget,
        fallbackTarget,
        context,
        issues
    };
}

export async function debugActiveTargetContext(
    outputChannel: vscode.OutputChannel,
    stateService: StateService
): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showWarningMessage('No workspace folder open');
        return;
    }

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine('='.repeat(80));
    outputChannel.appendLine('HDL Helper - Active Target Context Debug');
    outputChannel.appendLine('='.repeat(80));
    outputChannel.appendLine('');

    for (const folder of workspaceFolders) {
        const configEnabled = vscode.workspace
            .getConfiguration('hdl-helper', folder.uri)
            .get<boolean>('projectConfig.enabled', false);

        let configStatus = ProjectConfigStatus.NotEnabled;
        let projectConfig: NormalizedProjectConfig | undefined;

        if (configEnabled) {
            const configService = new ProjectConfigService(folder.uri.fsPath);
            projectConfig = await configService.loadConfig();
            configStatus = configService.getStatus();
            configService.dispose();
        }

        const snapshot = buildTargetContextDebugSnapshot({
            workspaceName: folder.name,
            workspaceRoot: folder.uri.fsPath,
            configEnabled,
            configStatus,
            projectConfig,
            designTop: stateService.getDesignTop(),
            simulationTop: stateService.getSimulationTop()
        });

        outputChannel.appendLine(`Workspace: ${snapshot.workspaceName}`);
        outputChannel.appendLine(`Root: ${snapshot.workspaceRoot}`);
        outputChannel.appendLine(`Config Enabled: ${snapshot.configEnabled}`);
        outputChannel.appendLine(`Config Status: ${snapshot.configStatus}`);
        outputChannel.appendLine(`Active Target (config): ${snapshot.activeTarget || 'none'}`);
        outputChannel.appendLine(`Fallback Target: ${snapshot.fallbackTarget || 'none'}`);

        if (snapshot.context) {
            outputChannel.appendLine('Resolved Target Context:');
            outputChannel.appendLine(JSON.stringify(snapshot.context, null, 2));
        } else {
            outputChannel.appendLine('Resolved Target Context: none');
        }

        if (snapshot.issues.length > 0) {
            outputChannel.appendLine('Issues:');
            snapshot.issues.forEach(issue => outputChannel.appendLine(`  - ${issue}`));
        } else {
            outputChannel.appendLine('Issues: none');
        }

        outputChannel.appendLine('-'.repeat(80));
    }

    outputChannel.appendLine('');
    outputChannel.appendLine('='.repeat(80));
    outputChannel.appendLine('Active target context debug complete');
    outputChannel.appendLine('='.repeat(80));
}

function resolveTopForTarget(
    kind: TargetKind,
    targetTop: string | undefined,
    configDesignTop: string | undefined,
    configSimulationTop: string | undefined,
    stateDesignTop: string | undefined,
    stateSimulationTop: string | undefined
): string | undefined {
    if (targetTop) {
        return targetTop;
    }

    if (kind === TargetKind.Simulation) {
        return configSimulationTop || stateSimulationTop;
    }

    return configDesignTop || stateDesignTop;
}