import * as vscode from 'vscode';
import { ProjectManager } from '../project/projectManager';

export class VerilogDefinitionProvider implements vscode.DefinitionProvider {
    constructor(private projectManager: ProjectManager) {}

    public provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Definition> {
        
        // 1. 获取当前光标所在的单词范围
        const range = document.getWordRangeAtPosition(position);
        if (!range) return null;

        // 2. 获取单词文本 (例如 "sync_fifo_gen")
        const word = document.getText(range);

        // 3. 去工程管理器里查询
        const hdlModule = this.projectManager.getModule(word);

        if (hdlModule) {
            // 4. 如果找到了，返回位置信息
            // 这样 VS Code 就会自动跳过去，还会高亮显示模块名
            return new vscode.Location(hdlModule.fileUri, hdlModule.range);
        }

        return null;
    }
}