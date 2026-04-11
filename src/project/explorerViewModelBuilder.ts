/**
 * Explorer view model builder for HDL Helper workbench.
 * 
 * Responsible for:
 * - Building ExplorerViewModel from classification results
 * - Grouping files by role for Sources section
 * - Preparing data for TreeProvider rendering
 * 
 * TreeProvider consumes this ViewModel without doing classification or resolution.
 * 
 * @module project/explorerViewModelBuilder
 */

import * as vscode from 'vscode';
import {
    ExplorerViewModel,
    SourcesSection,
    FileClassificationResult,
    Role,
    ProjectConfigStatus,
    ToolchainStatus
} from './types';

/**
 * Builder context containing all necessary data.
 */
export interface BuilderContext {
    workspaceRoot: string;
    projectName?: string;
    projectConfigStatus: ProjectConfigStatus;
    activeTarget?: string;
    classificationResults: FileClassificationResult[];
    toolchainStatus?: ToolchainStatus[];
}

/**
 * Explorer view model builder.
 * Builds the complete view model for HDL Explorer tree.
 */
export class ExplorerViewModelBuilder {
    private context: BuilderContext;

    constructor(context: BuilderContext) {
        this.context = context;
    }

    /**
     * Build complete explorer view model.
     */
    public build(): ExplorerViewModel {
        return {
            project: this.buildProjectSection(),
            sources: this.buildSourcesSection(),
            hierarchy: {
                // Hierarchy will be built separately (not in Iteration 1)
                designHierarchy: undefined,
                simulationHierarchy: undefined
            }
        };
    }

    /**
     * Build project section (optional, for future use).
     */
    private buildProjectSection() {
        if (this.context.projectConfigStatus === ProjectConfigStatus.NotEnabled ||
            this.context.projectConfigStatus === ProjectConfigStatus.Missing) {
            return undefined;
        }

        return {
            name: this.context.projectName || 'Unknown Project',
            status: this.context.projectConfigStatus,
            activeTarget: this.context.activeTarget,
            toolchainStatus: this.context.toolchainStatus || []
        };
    }

    /**
     * Build sources section with role-based grouping.
     */
    private buildSourcesSection(): SourcesSection {
        const results = this.context.classificationResults;

        // Group files by primary role
        const designSources: FileClassificationResult[] = [];
        const simulationSources: FileClassificationResult[] = [];
        const verificationSources: FileClassificationResult[] = [];
        const constraints: FileClassificationResult[] = [];
        const scripts: FileClassificationResult[] = [];
        const ipGenerated: FileClassificationResult[] = [];
        const unassigned: FileClassificationResult[] = [];

        for (const result of results) {
            switch (result.rolePrimary) {
                case Role.Design:
                    designSources.push(result);
                    break;
                case Role.Simulation:
                    simulationSources.push(result);
                    break;
                case Role.Verification:
                    verificationSources.push(result);
                    break;
                case Role.Constraints:
                    constraints.push(result);
                    break;
                case Role.Scripts:
                    scripts.push(result);
                    break;
                case Role.IpGenerated:
                    ipGenerated.push(result);
                    break;
                case Role.Unassigned:
                default:
                    unassigned.push(result);
                    break;
            }
        }

        // Sort files within each group by path
        const sortByPath = (a: FileClassificationResult, b: FileClassificationResult) => {
            return a.uri.localeCompare(b.uri);
        };

        return {
            designSources: designSources.sort(sortByPath),
            simulationSources: simulationSources.sort(sortByPath),
            verificationSources: verificationSources.sort(sortByPath),
            constraints: constraints.sort(sortByPath),
            scripts: scripts.sort(sortByPath),
            ipGenerated: ipGenerated.sort(sortByPath),
            unassigned: unassigned.sort(sortByPath)
        };
    }

    /**
     * Update builder context (e.g., when classification changes).
     */
    public updateContext(context: Partial<BuilderContext>): void {
        this.context = { ...this.context, ...context };
    }

    /**
     * Get current context (for debugging).
     */
    public getContext(): Readonly<BuilderContext> {
        return { ...this.context };
    }
}
