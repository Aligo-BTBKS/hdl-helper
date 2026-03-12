import * as vscode from 'vscode';
import { ProjectManager } from '../project/projectManager';

export class VerilogCompletionProvider implements vscode.CompletionItemProvider {
    constructor(private projectManager: ProjectManager) {}

    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        
        const completions: vscode.CompletionItem[] = [];

        // 1. 提供本地上下文符号 (局部信号，参数，端口)
        const currentModules = this.projectManager.getModulesInFile(document.uri.fsPath);
        for (const mod of currentModules) {
            if (mod.range.contains(position)) {
                for (const sym of mod.symbols) {
                    const item = new vscode.CompletionItem(sym.name);
                    item.detail = sym.type;
                    if (sym.comment) {
                        item.documentation = new vscode.MarkdownString(sym.comment);
                    }
                    
                    if (sym.kind === 'port') item.kind = vscode.CompletionItemKind.Interface;
                    else if (sym.kind === 'parameter' || sym.kind === 'localparam') item.kind = vscode.CompletionItemKind.Constant;
                    else item.kind = vscode.CompletionItemKind.Variable;

                    completions.push(item);
                }
            }
        }

        // 2. 模块级补全：提供全局模块和快捷的例化模板 (Snippets)
        const allModules = this.projectManager.getAllModules();
        for (const mod of allModules) {
            const item = new vscode.CompletionItem(mod.name, vscode.CompletionItemKind.Class);
            item.detail = `Module (Auto Instantiate)`;
            
            // 构建带端口和参数映射的 snippet
            let snippet = `${mod.name} `;
            
            if (mod.params.length > 0) {
                snippet += `#(\n`;
                snippet += mod.params.map(p => `    .${p.name}(${p.defaultValue})`).join(',\n');
                snippet += `\n) `;
            }
            
            snippet += `u_${mod.name} (\n`;
            
            if (mod.ports.length > 0) {
                snippet += mod.ports.map((p, idx) => `    .${p.name}(\${${idx + 1}})`).join(',\n');
            }
            
            snippet += `\n);`;
            
            item.insertText = new vscode.SnippetString(snippet);
            completions.push(item);
        }

        return completions;
    }
}
