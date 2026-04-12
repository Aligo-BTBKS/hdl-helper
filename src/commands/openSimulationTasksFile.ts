import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function getSimulationTasksFilePath(workspaceRoot: string, tasksFile = '.vscode/hdl_tasks.json'): string {
    return path.isAbsolute(tasksFile)
        ? tasksFile
        : path.join(workspaceRoot, tasksFile);
}

export function buildSimulationTasksTemplate(): string {
    return `${JSON.stringify({
        tasks: [
            {
                name: 'Simulate tb_top',
                type: 'hdl-sim',
                tool: 'iverilog',
                top: 'tb_top',
                filelist: ['filelist.f'],
                flags: ['-g2012'],
                waveform: true,
                waveformFormat: 'fst'
            }
        ]
    }, null, 2)}\n`;
}

export interface OpenSimulationTasksFileOptions {
    workspaceRoot?: string;
    configuredTasksFile?: string;
    existsSync?: (filePath: string) => boolean;
    ensureDir?: (dirPath: string) => void;
    writeFile?: (filePath: string, content: string) => Promise<void>;
    openFile?: (filePath: string) => Promise<void>;
    showInfo?: (message: string) => void;
    showWarning?: (message: string) => void;
}

export async function openSimulationTasksFile(options: OpenSimulationTasksFileOptions): Promise<'opened' | 'created' | 'skipped'> {
    const {
        workspaceRoot,
        configuredTasksFile,
        existsSync = fs.existsSync,
        ensureDir = (dirPath: string) => fs.mkdirSync(dirPath, { recursive: true }),
        writeFile = async (filePath: string, content: string) => fs.promises.writeFile(filePath, content, 'utf8'),
        openFile = async (filePath: string) => {
            await vscode.window.showTextDocument(vscode.Uri.file(filePath), { preview: false });
        },
        showInfo = (message: string) => {
            vscode.window.showInformationMessage(message);
        },
        showWarning = (message: string) => {
            vscode.window.showWarningMessage(message);
        }
    } = options;

    if (!workspaceRoot) {
        showWarning('No workspace folder open.');
        return 'skipped';
    }

    const tasksPath = getSimulationTasksFilePath(workspaceRoot, configuredTasksFile);
    if (existsSync(tasksPath)) {
        await openFile(tasksPath);
        return 'opened';
    }

    ensureDir(path.dirname(tasksPath));
    await writeFile(tasksPath, buildSimulationTasksTemplate());
    showInfo('Created simulation tasks file template.');
    await openFile(tasksPath);
    return 'created';
}
