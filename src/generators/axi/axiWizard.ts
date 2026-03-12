import * as vscode from 'vscode';
import { MultiStepWizard } from '../../ui/wizard';
import { AxiConfig } from './axiTypes';

export class AxiWizard {
    public static async runWizard(): Promise<AxiConfig | undefined> {
        // Collect inputs through steps
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const defaultPath = workspaceFolders && workspaceFolders.length > 0
            ? workspaceFolders[0].uri.fsPath
            : '';

        const title = 'AXI Interface Generator';

        const config = await MultiStepWizard.run<AxiConfig>([
            // 1. Module Name
            async (state) => {
                state.moduleName = await MultiStepWizard.showInputBox({
                    title,
                    step: 1,
                    totalSteps: 7,
                    value: state.moduleName || 'my_axi_ip',
                    prompt: 'Enter the base module name (e.g., my_axi_ip)',
                    validate: async (text) => {
                        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(text) ? undefined : 'Invalid module name';
                    }
                });
            },
            // 2. Protocol
            async (state) => {
                const pick = await MultiStepWizard.showQuickPick({
                    title,
                    step: 2,
                    totalSteps: 7,
                    placeholder: 'Select AXI Protocol',
                    items: [
                        { label: 'AXI4-Lite', description: 'Simple register mapping', detail: 'axi4-lite' },
                        { label: 'AXI4-Stream', description: 'Data streaming', detail: 'axi4-stream' },
                        { label: 'AXI4-Full', description: 'High performance burst (Skeleton)', detail: 'axi4-full' },
                    ]
                });
                state.protocol = pick.detail as any;
            },
            // 3. Role
            async (state) => {
                const pick = await MultiStepWizard.showQuickPick({
                    title,
                    step: 3,
                    totalSteps: 7,
                    placeholder: 'Select Interface Role',
                    items: [
                        { label: 'Slave', description: 'Generate Slave Logic', detail: 'slave' },
                        { label: 'Master', description: 'Generate Master Logic', detail: 'master' },
                        { label: 'Both', description: 'Generate Master & Slave', detail: 'both' },
                        { label: 'Interface Only', description: 'Generate SystemVerilog Interface', detail: 'interface-only' }
                    ]
                });
                state.role = pick.detail as any;
            },
            // 4. Data Width
            async (state) => {
                const val = await MultiStepWizard.showInputBox({
                    title,
                    step: 4,
                    totalSteps: 7,
                    value: state.dataWidth ? state.dataWidth.toString() : '32',
                    prompt: 'Enter Data Width (e.g., 32, 64, 128)',
                    validate: async (text) => {
                        const num = parseInt(text);
                        return (!isNaN(num) && num > 0) ? undefined : 'Must be a positive integer';
                    }
                });
                state.dataWidth = parseInt(val);
            },
            // 5. Address Width (Skip if stream)
            async (state) => {
                if (state.protocol === 'axi4-stream') {
                    // skipped
                    return;
                }
                const val = await MultiStepWizard.showInputBox({
                    title,
                    step: 5,
                    totalSteps: 7,
                    value: state.addrWidth ? state.addrWidth.toString() : '16',
                    prompt: 'Enter Address Width (e.g., 16, 32)',
                    validate: async (text) => {
                        const num = parseInt(text);
                        return (!isNaN(num) && num > 0) ? undefined : 'Must be a positive integer';
                    }
                });
                state.addrWidth = parseInt(val);
            },
            // 6. Generate Testbench
            async (state) => {
                const pick = await MultiStepWizard.showQuickPick({
                    title,
                    step: 6,
                    totalSteps: 7,
                    placeholder: 'Generate Testbench?',
                    items: [
                        { label: 'Yes', detail: 'true' },
                        { label: 'No', detail: 'false' },
                    ]
                });
                state.generateTb = pick.detail === 'true';
            },
            // 7. Output Directory
            async (state) => {
                state.outputDir = await MultiStepWizard.showInputBox({
                    title,
                    step: 7,
                    totalSteps: 7,
                    value: state.outputDir || defaultPath,
                    prompt: 'Output Directory',
                    validate: async (text) => text.length > 0 ? undefined : 'Path cannot be empty'
                });
            }
        ], {});

        return config;
    }
}
