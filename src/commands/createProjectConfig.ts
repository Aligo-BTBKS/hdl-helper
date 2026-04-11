import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { HdlModule } from '../project/hdlSymbol';
import { ProjectManager } from '../project/projectManager';
import { HierarchyService } from '../project/hierarchyService';

interface ProjectConfigTemplate {
    version: string;
    name: string;
    root: string;
    sourceSets: Record<string, { role: string; includes: string[] }>;
    tops: { design?: string; simulation?: string };
    targets: Record<string, { kind: string; top?: string; sourceSets: string[] }>;
    activeTarget: string;
}

export function inferDefaultTops(
    modules: HdlModule[],
    hierarchyService = new HierarchyService()
): { design?: string; simulation?: string } {
    const design = hierarchyService.inferDesignTop(modules);
    const simulation = hierarchyService.inferSimulationTop(modules);
    return { design, simulation };
}

export function buildProjectConfigTemplate(
    workspaceRoot: string,
    modules: HdlModule[],
    workspaceName?: string
): ProjectConfigTemplate {
    const tops = inferDefaultTops(modules);

    return {
        version: '1.0',
        name: workspaceName || path.basename(workspaceRoot),
        root: workspaceRoot,
        sourceSets: {
            design: {
                role: 'design',
                includes: ['rtl/**/*.sv', 'src/**/*.sv', 'design/**/*.sv', '**/*.v', '**/*.sv']
            },
            simulation: {
                role: 'simulation',
                includes: ['tb/**/*.sv', 'sim/**/*.sv', 'testbench/**/*.sv', '**/*tb*.sv']
            },
            verification: {
                role: 'verification',
                includes: ['sva/**/*.sv', '**/*checker*.sv', '**/*bind*.sv']
            },
            constraints: {
                role: 'constraints',
                includes: ['constraints/**/*.xdc', 'constraints/**/*.sdc', '**/*.xdc', '**/*.sdc']
            },
            scripts: {
                role: 'scripts',
                includes: ['scripts/**/*.tcl', '**/*.tcl']
            }
        },
        tops,
        targets: {
            design_default: {
                kind: 'design',
                top: tops.design,
                sourceSets: ['design', 'constraints', 'scripts']
            },
            sim_default: {
                kind: 'simulation',
                top: tops.simulation || tops.design,
                sourceSets: ['design', 'simulation', 'verification', 'constraints', 'scripts']
            }
        },
        activeTarget: tops.simulation ? 'sim_default' : 'design_default'
    };
}

export async function createProjectConfig(projectManager: ProjectManager): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showWarningMessage('No workspace folder open.');
        return;
    }

    const workspaceRoot = workspaceFolder.uri.fsPath;
    const configDir = path.join(workspaceRoot, '.hdl-helper');
    const configPath = path.join(configDir, 'project.json');

    if (fs.existsSync(configPath)) {
        const overwrite = await vscode.window.showWarningMessage(
            '.hdl-helper/project.json already exists. Overwrite?',
            { modal: true },
            'Overwrite'
        );
        if (overwrite !== 'Overwrite') {
            return;
        }
    }

    const modules = projectManager.getAllModules();
    const template = buildProjectConfigTemplate(workspaceRoot, modules, workspaceFolder.name);

    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(configPath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');

    await vscode.window.showTextDocument(vscode.Uri.file(configPath), { preview: false });
    vscode.window.showInformationMessage('Created .hdl-helper/project.json template.');
}