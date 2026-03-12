import * as vscode from 'vscode';
import { MemoryWizard } from '../generators/memory/memoryWizard';
import { MemoryGenerator } from '../generators/memory/memoryGenerator';
import { FileWriter } from '../services/fileWriter';

export async function generateMemoryCommand() {
    try {
        const config = await MemoryWizard.runWizard();
        if (!config) {
            return;
        }

        const generator = new MemoryGenerator();
        const files = await generator.generate(config);

        if (files.length === 0) {
            vscode.window.showInformationMessage('No files generated.');
            return;
        }

        await FileWriter.writeFiles(config.outputDir, files);
    } catch (err) {
        vscode.window.showErrorMessage(`Error generating Memory IP: ${err}`);
    }
}
