/**
 * Debug command for project classification.
 * 
 * Outputs classification results for all HDL files in workspace.
 * Useful for debugging classification rules and source of truth.
 * 
 * @module commands/debugProjectClassification
 */

import * as vscode from 'vscode';
import { ClassificationService } from '../project/classificationService';
import { ProjectConfigService } from '../project/projectConfigService';
import {
    ClassificationDebugSection,
    ClassificationDebugSectionFilterPreset,
    ClassificationDebugReportInput,
    ClassificationDebugSectionRenderOptions,
    ClassificationDebugSectionType,
    ClassificationObservabilityStats,
    FileClassificationResult
} from '../project/types';

const sectionPriority: Record<ClassificationDebugSectionType, number> = {
    workspace: 10,
    config: 20,
    discovery: 30,
    summary: 40,
    'source-set-coverage': 50,
    details: 60
};

export function buildClassificationObservabilityStats(
    results: FileClassificationResult[]
): ClassificationObservabilityStats {
    const sourceSetCoverage: Record<string, number> = {};

    for (const result of results) {
        for (const sourceSetName of new Set(result.referencedBySourceSets || [])) {
            sourceSetCoverage[sourceSetName] = (sourceSetCoverage[sourceSetName] || 0) + 1;
        }
    }

    return {
        totalFiles: results.length,
        sharedFiles: results.filter(result => result.roleSecondary.length > 0).length,
        activeTargetFiles: results.filter(result => result.inActiveTarget).length,
        sourceSetCoverage
    };
}

export function buildClassificationRenderOptionsByPreset(
    preset: ClassificationDebugSectionFilterPreset = 'all'
): ClassificationDebugSectionRenderOptions {
    return { preset };
}

export function resolveClassificationDebugPresetArg(
    arg: unknown
): ClassificationDebugSectionFilterPreset | undefined {
    const pickPreset = (value: unknown): ClassificationDebugSectionFilterPreset | undefined => {
        if (typeof value !== 'string') {
            return undefined;
        }

        const normalized = value.trim().toLowerCase();
        if (normalized === 'all' || normalized === 'overview' || normalized === 'details') {
            return normalized;
        }

        return undefined;
    };

    const direct = pickPreset(arg);
    if (direct) {
        return direct;
    }

    if (!arg || typeof arg !== 'object') {
        return undefined;
    }

    const candidate = arg as { preset?: unknown; view?: unknown; mode?: unknown };
    return pickPreset(candidate.preset) || pickPreset(candidate.view) || pickPreset(candidate.mode);
}

export function formatClassificationDebugReport(
    input: ClassificationDebugReportInput,
    options: ClassificationDebugSectionRenderOptions = {}
): string[] {
    const sections = buildClassificationDebugSections(input);
    return renderClassificationDebugSections(sections, options);
}

export function buildClassificationDebugSections(
    input: ClassificationDebugReportInput
): ClassificationDebugSection[] {
    const workspaceLines: string[] = [
        `Workspace: ${input.workspaceName}`,
        `Root: ${input.workspaceRoot}`
    ];

    const configLines: string[] = [`Project Config Status: ${input.configStatus}`];
    if (input.config) {
        configLines.push(`  Name: ${input.config.name}`);
        configLines.push(`  Version: ${input.config.version}`);
        configLines.push(`  Source Sets: ${input.config.sourceSetCount}`);
        configLines.push(`  Targets: ${input.config.targetCount}`);
        configLines.push(`  Active Target: ${input.config.activeTarget || 'none'}`);
    }

    const discoveryLines: string[] = [`Found ${input.hdlFileCount} HDL files`];

    const summaryLines: string[] = ['-'.repeat(80)];
    const roles = Object.keys(input.roleCounts).sort((a, b) => a.localeCompare(b));
    for (const role of roles) {
        summaryLines.push(`  ${role}: ${input.roleCounts[role]} files`);
    }
    summaryLines.push(`  shared files: ${input.stats.sharedFiles}`);
    summaryLines.push(`  active target files: ${input.stats.activeTargetFiles}`);

    const sourceSetCoverageLines: string[] = [];
    const sourceSetNames = Object.keys(input.stats.sourceSetCoverage).sort((a, b) => a.localeCompare(b));
    if (sourceSetNames.length === 0) {
        sourceSetCoverageLines.push('  (none)');
    } else {
        for (const sourceSetName of sourceSetNames) {
            sourceSetCoverageLines.push(`  ${sourceSetName}: ${input.stats.sourceSetCoverage[sourceSetName]} files`);
        }
    }

    const detailLines: string[] = ['-'.repeat(80)];
    for (const result of input.results) {
        detailLines.push('');
        detailLines.push(`File: ${result.uri}`);
        detailLines.push(`  Physical Type: ${result.physicalType}`);
        detailLines.push(`  Role (Primary): ${result.rolePrimary}`);
        if (result.roleSecondary.length > 0) {
            detailLines.push(`  Role (Secondary): ${result.roleSecondary.join(', ')}`);
        }
        detailLines.push(`  Source of Truth: ${result.sourceOfTruth}`);
        detailLines.push(`  In Active Target: ${result.inActiveTarget}`);
        if (result.referencedBySourceSets && result.referencedBySourceSets.length > 0) {
            detailLines.push(`  Referenced by Source Sets: ${result.referencedBySourceSets.join(', ')}`);
        }
        if (result.referencedByTargets && result.referencedByTargets.length > 0) {
            detailLines.push(`  Referenced by Targets: ${result.referencedByTargets.join(', ')}`);
        }
    }

    return [
        { id: 'workspace', type: 'workspace', title: '', lines: workspaceLines },
        { id: 'config', type: 'config', title: '', lines: configLines },
        { id: 'discovery', type: 'discovery', title: '', lines: discoveryLines },
        { id: 'summary', type: 'summary', title: 'Classification Summary:', lines: summaryLines },
        {
            id: 'source-set-coverage',
            type: 'source-set-coverage',
            title: 'SourceSet Coverage:',
            lines: sourceSetCoverageLines
        },
        { id: 'details', type: 'details', title: 'Detailed Classification Results:', lines: detailLines }
    ];
}

export function renderClassificationDebugSections(
    sections: ClassificationDebugSection[],
    options: ClassificationDebugSectionRenderOptions = {}
): string[] {
    const lines: string[] = [];
    const filteredSections = filterClassificationDebugSections(sections, options);

    for (const section of filteredSections) {
        if (section.title) {
            lines.push(section.title);
        }
        lines.push(...section.lines);
        lines.push('');
    }

    lines.push('-'.repeat(80));
    return lines;
}

export function getClassificationDebugSectionPriority(type: ClassificationDebugSectionType): number {
    return sectionPriority[type] ?? Number.MAX_SAFE_INTEGER;
}

export function getClassificationDebugSectionTypesByPreset(
    preset: ClassificationDebugSectionFilterPreset = 'all'
): Set<ClassificationDebugSectionType> {
    switch (preset) {
        case 'overview':
            return new Set<ClassificationDebugSectionType>([
                'workspace',
                'config',
                'discovery',
                'summary',
                'source-set-coverage'
            ]);
        case 'details':
            return new Set<ClassificationDebugSectionType>(['details']);
        case 'all':
        default:
            return new Set<ClassificationDebugSectionType>([
                'workspace',
                'config',
                'discovery',
                'summary',
                'source-set-coverage',
                'details'
            ]);
    }
}

export function filterClassificationDebugSections(
    sections: ClassificationDebugSection[],
    options: ClassificationDebugSectionRenderOptions = {}
): ClassificationDebugSection[] {
    const presetTypes = getClassificationDebugSectionTypesByPreset(options.preset || 'all');
    const includeTypes = options.includeTypes ? new Set(options.includeTypes) : undefined;
    const excludeTypes = options.excludeTypes ? new Set(options.excludeTypes) : undefined;

    return [...sections]
        .filter(section => presetTypes.has(section.type))
        .filter(section => !includeTypes || includeTypes.has(section.type))
        .filter(section => !excludeTypes || !excludeTypes.has(section.type))
        .sort((a, b) => {
            const priorityDiff = getClassificationDebugSectionPriority(a.type) - getClassificationDebugSectionPriority(b.type);
            if (priorityDiff !== 0) {
                return priorityDiff;
            }
            return a.id.localeCompare(b.id);
        });
}

/**
 * Debug project classification command.
 * Shows classification results in output channel.
 */
export async function debugProjectClassification(
    outputChannel: vscode.OutputChannel,
    renderOptions: ClassificationDebugSectionRenderOptions = {}
): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showWarningMessage('No workspace folder open');
        return;
    }

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine('='.repeat(80));
    outputChannel.appendLine('HDL Helper - Project Classification Debug');
    outputChannel.appendLine('='.repeat(80));
    outputChannel.appendLine('');

    for (const folder of workspaceFolders) {
        await debugWorkspaceFolder(folder, outputChannel, renderOptions);
    }

    outputChannel.appendLine('');
    outputChannel.appendLine('='.repeat(80));
    outputChannel.appendLine('Classification debug complete');
    outputChannel.appendLine('='.repeat(80));
}

async function debugWorkspaceFolder(
    folder: vscode.WorkspaceFolder,
    outputChannel: vscode.OutputChannel,
    renderOptions: ClassificationDebugSectionRenderOptions
): Promise<void> {
    const workspaceRoot = folder.uri.fsPath;

    // Load project config if exists
    const configService = new ProjectConfigService(workspaceRoot);
    const config = await configService.loadConfig();
    const configStatus = configService.getStatus();

    // Find all HDL files
    const hdlFiles = await findHdlFiles(folder);

    // Classify files
    const classificationService = new ClassificationService({
        workspaceRoot,
        projectConfig: config,
        activeTarget: config?.activeTarget
    });

    const results = await classificationService.classifyWorkspace(hdlFiles);

    // Group by role
    const byRole = groupByRole(results);
    const stats = buildClassificationObservabilityStats(results);
    const roleCounts: Record<string, number> = {};
    for (const [role, files] of Object.entries(byRole)) {
        roleCounts[role] = files.length;
    }

    const lines = formatClassificationDebugReport({
        workspaceName: folder.name,
        workspaceRoot,
        configStatus,
        config: config
            ? {
                name: config.name,
                version: config.version,
                sourceSetCount: Object.keys(config.sourceSets).length,
                targetCount: Object.keys(config.targets).length,
                activeTarget: config.activeTarget
            }
            : undefined,
        hdlFileCount: hdlFiles.length,
        roleCounts,
        stats,
        results
    }, renderOptions);

    for (const line of lines) {
        outputChannel.appendLine(line);
    }
}

async function findHdlFiles(folder: vscode.WorkspaceFolder): Promise<vscode.Uri[]> {
    // Find all HDL files in workspace
    const patterns = [
        '**/*.v',
        '**/*.vh',
        '**/*.sv',
        '**/*.svh',
        '**/*.sva',
        '**/*.vhd',
        '**/*.vhdl',
        '**/*.xdc',
        '**/*.sdc',
        '**/*.tcl',
        '**/*.xci'
    ];

    const excludePatterns = [
        '**/node_modules/**',
        '**/.git/**',
        '**/.srcs/**',
        '**/.sim/**',
        '**/build/**',
        '**/out/**'
    ];

    const files: vscode.Uri[] = [];
    
    for (const pattern of patterns) {
        const found = await vscode.workspace.findFiles(
            new vscode.RelativePattern(folder, pattern),
            `{${excludePatterns.join(',')}}`
        );
        files.push(...found);
    }

    // Deduplicate
    const uniqueFiles = Array.from(new Set(files.map(f => f.fsPath)))
        .map(p => vscode.Uri.file(p));

    return uniqueFiles;
}

function groupByRole(results: FileClassificationResult[]): Record<string, FileClassificationResult[]> {
    const grouped: Record<string, FileClassificationResult[]> = {};

    for (const result of results) {
        const role = result.rolePrimary;
        if (!grouped[role]) {
            grouped[role] = [];
        }
        grouped[role].push(result);
    }

    return grouped;
}
