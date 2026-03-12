import * as vscode from 'vscode';
import * as path from 'path';
import { MultiStepWizard } from '../../ui/wizard';
import { RegisterGenConfig } from './registerTypes';

export class RegisterWizard {
    public static async runWizard(): Promise<RegisterGenConfig | undefined> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const defaultPath = workspaceFolders && workspaceFolders.length > 0
            ? workspaceFolders[0].uri.fsPath
            : '';

        const title = 'Register Map Generator';

        const config = await MultiStepWizard.run<RegisterGenConfig>([
            // 1. Input File
            async (state) => {
                const uri = await vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: false,
                    filters: { 'Register Maps': ['json', 'csv'] },
                    title: 'Select Register Map Definition (JSON/CSV)'
                });
                if (!uri || uri.length === 0) {
                    return 'cancel';
                }
                state.inputFile = uri[0].fsPath;
                state.moduleName = path.basename(state.inputFile, path.extname(state.inputFile));
            },
            // 2. Bus Type
            async (state) => {
                const pick = await MultiStepWizard.showQuickPick({
                    title,
                    step: 2,
                    totalSteps: 4,
                    placeholder: 'Select Bus Type',
                    items: [
                        { label: 'AXI-Lite', description: 'Standard AXI4-Lite Register Interface', detail: 'axi-lite' }
                    ]
                });
                state.busType = pick.detail as any;
            },
            // 3. Generate Checkboxes (Skip UI complex logic, assume ALL)
            async (state) => {
                state.generateSv = true;
                state.generateCHeader = true;
                state.generateMarkdown = true;
            },
            // 4. Output Directory
            async (state) => {
                state.outputDir = await MultiStepWizard.showInputBox({
                    title,
                    step: 4,
                    totalSteps: 4,
                    value: state.outputDir || defaultPath,
                    prompt: 'Output Directory',
                    validate: async (text) => text.length > 0 ? undefined : 'Path cannot be empty'
                });
            }
        ], {});

        return config;
    }
}
