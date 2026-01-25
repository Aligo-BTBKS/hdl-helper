import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class VerilogDefinitionProvider implements vscode.DefinitionProvider {

    public async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Definition | undefined> {

        // 1. 获取光标处的单词
        const range = document.getWordRangeAtPosition(position);
        if (!range) return undefined;
        const word = document.getText(range);

        // 排除关键字（点了 input 或者 wire 这种词不用跳）
        if (this.isKeyword(word)) return undefined;

        console.log(`Searching definition for: ${word}`);

        // 2. 在当前工作区找所有 HDL 文件
        // 限制搜索范围：.v, .sv, .vh, .svh
        const files = await vscode.workspace.findFiles('**/*.{v,sv,vh,svh}', '**/node_modules/**');

        // 3. 遍历文件查找定义
        for (const fileUri of files) {
            // 如果文件太多，这一步可能会慢。
            // 优化版 V2.0 应该做缓存，MVP 先直接读文件。
            const doc = await vscode.workspace.openTextDocument(fileUri);
            const text = doc.getText();

            // 正则策略：匹配 "module 单词" 或 "interface 单词" 或 "task/function 单词"
            // \b 确保是单词边界
            const regex = new RegExp(`\\b(module|interface|task|function|package)\\s+${word}\\b`);
            
            const match = text.match(regex);
            
            if (match && match.index !== undefined) {
                // 找到了！计算行号
                const position = doc.positionAt(match.index);
                
                // 返回跳转目标
                return new vscode.Location(fileUri, position);
            }
        }

        return undefined;
    }

    // 辅助：简单的关键字黑名单
    private isKeyword(word: string): boolean {
        const keywords = [
            'input', 'output', 'inout', 'wire', 'reg', 'logic', 
            'module', 'endmodule', 'begin', 'end', 'assign', 
            'always', 'always_ff', 'always_comb', 'if', 'else', 'case'
        ];
        return keywords.includes(word);
    }
}