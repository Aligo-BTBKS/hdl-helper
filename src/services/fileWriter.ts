import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { GeneratedFile } from '../generators/generator';

export class FileWriter {
    /**
     * Writes generated files to the target directory. Prompts for overwrite if files exist.
     * @param targetDir The absolute path to the target directory.
     * @param files The array of files to generate.
     */
    public static async writeFiles(targetDir: string, files: GeneratedFile[]): Promise<boolean> {
        // Collect files that already exist
        const existingFiles: string[] = [];
        for (const file of files) {
            const absolutePath = path.join(targetDir, file.relativePath);
            if (fs.existsSync(absolutePath)) {
                existingFiles.push(file.relativePath);
            }
        }

        if (existingFiles.length > 0) {
            const msg = `The following files already exist and will be overwritten:\n${existingFiles.join('\n')}`;
            const action = await vscode.window.showWarningMessage(msg, { modal: true }, 'Overwrite', 'Cancel');
            if (action !== 'Overwrite') {
                return false;
            }
        }

        for (const file of files) {
            const absolutePath = path.join(targetDir, file.relativePath);
            const dir = path.dirname(absolutePath);
            
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(absolutePath, file.content, { encoding: 'utf-8' });
        }

        vscode.window.showInformationMessage(`Successfully generated ${files.length} file(s) in ${targetDir}`);
        
        // Open the first file or a README if present
        if (files.length > 0) {
            let fileToOpen = files.find(f => f.relativePath.toLowerCase().endsWith('.md')) || files[0];
            const uri = vscode.Uri.file(path.join(targetDir, fileToOpen.relativePath));
            await vscode.window.showTextDocument(uri, { preview: false });
        }

        return true;
    }
}
