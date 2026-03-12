import * as vscode from 'vscode';
import { AxiWizard } from '../generators/axi/axiWizard';
import { AxiGenerator } from '../generators/axi/axiGenerator';
import { FileWriter } from '../services/fileWriter';

export async function generateAxiCommand() {
    try {
        const config = await AxiWizard.runWizard();
        if (!config) {
            // User cancelled
            return;
        }

        const generator = new AxiGenerator();
        const files = await generator.generate(config);

        if (files.length === 0) {
            vscode.window.showInformationMessage('No files generated for the selected configuration.');
            return;
        }

        const success = await FileWriter.writeFiles(config.outputDir, files);
        if (success) {
            // Further actions if needed
        }
    } catch (err) {
        vscode.window.showErrorMessage(`Error generating AXI: ${err}`);
    }
}
