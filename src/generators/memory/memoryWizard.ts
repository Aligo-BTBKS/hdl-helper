import * as vscode from 'vscode';
import { MultiStepWizard } from '../../ui/wizard';
import { MemoryConfig } from './memoryTypes';

export class MemoryWizard {
    public static async runWizard(): Promise<MemoryConfig | undefined> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const defaultPath = workspaceFolders && workspaceFolders.length > 0
            ? workspaceFolders[0].uri.fsPath
            : '';

        const title = 'Memory IP Generator';

        const config = await MultiStepWizard.run<MemoryConfig>([
            // 1. Module Name
            async (state) => {
                state.moduleName = await MultiStepWizard.showInputBox({
                    title,
                    step: 1,
                    totalSteps: 6,
                    value: state.moduleName || 'my_fifo',
                    prompt: 'Enter the base module name (e.g., my_fifo)',
                    validate: async (text) => {
                        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(text) ? undefined : 'Invalid module name';
                    }
                });
            },
            // 2. Memory Type
            async (state) => {
                const pick = await MultiStepWizard.showQuickPick({
                    title,
                    step: 2,
                    totalSteps: 6,
                    placeholder: 'Select Memory Type',
                    items: [
                        { label: 'Sync FIFO', description: 'Synchronous FIFO', detail: 'sync-fifo' },
                        { label: 'Async FIFO', description: 'Asynchronous CDC FIFO', detail: 'async-fifo' },
                        { label: 'Single-Port RAM', description: 'SP RAM', detail: 'sp-ram' },
                        { label: 'Dual-Port RAM', description: 'True DP RAM', detail: 'dp-ram' },
                        { label: 'Simple Dual-Port RAM', description: '1-Read / 1-Write RAM', detail: 'simple-dual-port-ram' }
                    ]
                });
                state.memoryType = pick.detail as any;
            },
            // 3. Data Width
            async (state) => {
                const val = await MultiStepWizard.showInputBox({
                    title,
                    step: 3,
                    totalSteps: 6,
                    value: state.dataWidth ? state.dataWidth.toString() : '32',
                    prompt: 'Enter Data Width (bits)',
                    validate: async (text) => {
                        const num = parseInt(text);
                        return (!isNaN(num) && num > 0) ? undefined : 'Must be a positive integer';
                    }
                });
                state.dataWidth = parseInt(val);
            },
            // 4. Depth
            async (state) => {
                const val = await MultiStepWizard.showInputBox({
                    title,
                    step: 4,
                    totalSteps: 6,
                    value: state.depth ? state.depth.toString() : '1024',
                    prompt: 'Enter Depth (words)',
                    validate: async (text) => {
                        const num = parseInt(text);
                        return (!isNaN(num) && num > 0) ? undefined : 'Must be a positive integer';
                    }
                });
                state.depth = parseInt(val);
            },
            // 5. Generate Testbench
            async (state) => {
                const pick = await MultiStepWizard.showQuickPick({
                    title,
                    step: 5,
                    totalSteps: 6,
                    placeholder: 'Generate Testbench?',
                    items: [
                        { label: 'Yes', detail: 'true' },
                        { label: 'No', detail: 'false' },
                    ]
                });
                state.generateTb = pick.detail === 'true';
            },
            // 6. Output Directory
            async (state) => {
                state.outputDir = await MultiStepWizard.showInputBox({
                    title,
                    step: 6,
                    totalSteps: 6,
                    value: state.outputDir || defaultPath,
                    prompt: 'Output Directory',
                    validate: async (text) => text.length > 0 ? undefined : 'Path cannot be empty'
                });
            }
        ], {});

        return config;
    }
}
