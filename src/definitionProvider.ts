import * as vscode from 'vscode';
import { ProjectManager } from './project/projectManager'; // 确保引入了 V2.0 的管理器

export class VerilogDefinitionProvider implements vscode.DefinitionProvider {
    // 注入 ProjectManager
    constructor(private projectManager: ProjectManager) {}

    public provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Definition> {

        // 1. 获取光标处的单词
        const range = document.getWordRangeAtPosition(position);
        if (!range) return undefined;
        const word = document.getText(range);

        // 2. 直接查询内存索引 (速度极快，O(1) 复杂度)
        const hdlModule = this.projectManager.getModule(word);

        if (hdlModule) {
            console.log(`[DefProvider] Jump to: ${word} -> ${hdlModule.fileUri.fsPath}`);
            // 3. 返回精确的位置
            return new vscode.Location(hdlModule.fileUri, hdlModule.range);
        }

        return undefined;
    }
}