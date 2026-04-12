import {
    NormalizedProjectConfig,
    ProjectConfigStatus,
    TargetContext,
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
    targetContexts?: Record<string, TargetContext | undefined>;
    knownToolProfiles?: string[];
    fileExists?: (filePath: string) => boolean;
    resolvePath?: (filePath: string) => string;
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
        const knownToolProfiles = new Set(input.knownToolProfiles || []);

        for (const [targetId, target] of Object.entries(config.targets)) {
            const hasResolvedTop = target.top || (
                target.kind === TargetKind.Simulation
                    ? config.tops.simulation
                    : config.tops.design
            );
            const targetContext = input.targetContexts?.[targetId];

            if (!hasResolvedTop) {
                pushUnique('warning', `Target '${targetId}' has no resolved top.`);
            }

            if (targetContext && targetContext.resolvedFiles.length === 0) {
                pushUnique('warning', `Target '${targetId}' has empty resolved files.`);
            }

            if (targetContext && input.fileExists) {
                const missingResolvedFiles = targetContext.resolvedFiles.filter(filePath => !input.fileExists!(filePath));
                if (missingResolvedFiles.length > 0) {
                    pushUnique(
                        'warning',
                        `Target '${targetId}' has ${missingResolvedFiles.length} missing resolved file(s), e.g. '${missingResolvedFiles[0]}'.`
                    );
                }
            }

            if (target.filelist && input.fileExists) {
                const resolvedFilelist = input.resolvePath ? input.resolvePath(target.filelist) : target.filelist;
                if (!input.fileExists(resolvedFilelist)) {
                    pushUnique('warning', `Target '${targetId}' references missing filelist: ${target.filelist}`);
                }
            }

            if (
                target.toolProfile
                && knownToolProfiles.size > 0
                && !knownToolProfiles.has(target.toolProfile)
            ) {
                pushUnique('warning', `Target '${targetId}' references unknown tool profile: ${target.toolProfile}`);
            }
        }
    }

    if (issues.length === 0 && input.status === ProjectConfigStatus.Valid) {
        pushUnique('info', 'project.json is valid.');
    }

    return issues;
}