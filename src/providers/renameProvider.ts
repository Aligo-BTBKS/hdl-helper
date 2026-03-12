import * as vscode from 'vscode';
import { ProjectManager } from '../project/projectManager';

export class VerilogRenameProvider implements vscode.RenameProvider {
    constructor(private projectManager: ProjectManager) {}

    public prepareRename(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Range | { range: vscode.Range; placeholder: string }> {
        const range = document.getWordRangeAtPosition(position);
        if (!range) throw new Error('Cannot rename this element.');
        return range;
    }

    public provideRenameEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        newName: string,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.WorkspaceEdit> {
        
        const range = document.getWordRangeAtPosition(position);
        if (!range) return null;
        
        const word = document.getText(range);
        const edit = new vscode.WorkspaceEdit();

        // 1. 局部信号/参数重命名
        const currentModules = this.projectManager.getModulesInFile(document.uri.fsPath);
        let foundLocal = false;
        for (const mod of currentModules) {
            if (mod.range.contains(position)) {
                const sym = mod.symbols.find(s => s.name === word);
                if (sym) {
                    foundLocal = true;
                    // 将该符号的所有引用（含声明）进行替换
                    for (const ref of sym.references) {
                        edit.replace(sym.fileUri, ref, newName);
                    }
                    break;
                }
            }
        }

        if (foundLocal) {
            return edit;
        }

        // 2. 跨文件模块重命名
        const moduleDef = this.projectManager.getModule(word);
        if (moduleDef) {
            // 模块在定义处的重命名
            edit.replace(moduleDef.fileUri, moduleDef.nameRange || moduleDef.range, newName);
            
            // 所有实例化了该模块的地方
            for (const otherMod of this.projectManager.getAllModules()) {
                const instances = otherMod.instances.filter(i => i.type === word);
                for (const inst of instances) {
                    edit.replace(inst.fileUri, inst.range, newName);
                }
            }
            return edit;
        }

        return null;
    }
}
