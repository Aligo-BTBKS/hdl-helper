import {
    NormalizedProjectConfig,
    ProjectConfigStatus,
    TargetKind
} from './types';

export type ConfigIssueSeverity = 'error' | 'warning' | 'info';

export interface ConfigIssueEntry {
    severity: ConfigIssueSeverity;
    message: string;
}

export interface BuildConfigIssuesInput {
    configEnabled: boolean;
    status: ProjectConfigStatus;
    config?: NormalizedProjectConfig;
    errors?: string[];
    warnings?: string[];
}

export function buildConfigIssues(input: BuildConfigIssuesInput): ConfigIssueEntry[] {
    if (!input.configEnabled) {
        return [];
    }

    const issues: ConfigIssueEntry[] = [];
    const pushUnique = (severity: ConfigIssueSeverity, message: string) => {
        if (!issues.some(issue => issue.severity === severity && issue.message === message)) {
            issues.push({ severity, message });
        }
    };

    if (input.status === ProjectConfigStatus.Missing) {
        pushUnique('warning', '.hdl-helper/project.json is missing; fallback to heuristic compatibility mode.');
    }

    for (const message of input.errors || []) {
        pushUnique('error', message);
    }

    for (const message of input.warnings || []) {
        pushUnique('warning', message);
    }

    const config = input.config;
    if (config) {
        for (const [targetId, target] of Object.entries(config.targets)) {
            const hasResolvedTop = target.top || (
                target.kind === TargetKind.Simulation
                    ? config.tops.simulation
                    : config.tops.design
            );

            if (!hasResolvedTop) {
                pushUnique('warning', `Target '${targetId}' has no resolved top.`);
            }
        }
    }

    if (issues.length === 0 && input.status === ProjectConfigStatus.Valid) {
        pushUnique('info', 'project.json is valid.');
    }

    return issues;
}