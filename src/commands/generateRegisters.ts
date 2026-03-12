import * as vscode from 'vscode';
import { RegisterWizard } from '../generators/registers/registerWizard';
import { RegisterGenerator } from '../generators/registers/registerGenerator';
import { FileWriter } from '../services/fileWriter';

export async function generateRegistersCommand() {
    try {
        const config = await RegisterWizard.runWizard();
        if (!config || !config.inputFile) {
            return;
        }

        const generator = new RegisterGenerator();
        const files = await generator.generate(config);

        if (files.length === 0) {
            return; // Either parsing failed, validation failed, or no files toggled
        }

        // Preview generation before writing
        const summaryMsg = `Validated Register Map.\nWill generate ${files.length} files into ${config.outputDir}: \n` + files.map(f => `- ${f.relativePath}`).join('\n');
        const proceed = await vscode.window.showInformationMessage(summaryMsg, { modal: true }, 'Generate', 'Cancel');
        
        if (proceed === 'Generate') {
            await FileWriter.writeFiles(config.outputDir, files);
        }
    } catch (err) {
        vscode.window.showErrorMessage(`Error generating Register Map: ${err}`);
    }
}
