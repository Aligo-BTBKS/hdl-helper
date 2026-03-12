import * as vscode from 'vscode';
import { ProjectManager } from '../project/projectManager';

export class VerilogOutlineProvider implements vscode.DocumentSymbolProvider {
    constructor(private projectManager: ProjectManager) {}

    public provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.DocumentSymbol[] | vscode.SymbolInformation[]> {
        const symbols: vscode.DocumentSymbol[] = [];
        
        // 1. 获取当前文件中的所有模块
        const modules = this.projectManager.getModulesInFile(document.uri.fsPath);
        
        for (const mod of modules) {
            // 模块级节点
            const moduleSymbol = new vscode.DocumentSymbol(
                mod.name,
                'Module',
                vscode.SymbolKind.Class,
                mod.range,
                mod.nameRange || mod.range // selection range
            );
            
            // 2. 遍历模块内部所有符号 (Parameters, Ports, 局部信号)
            for (const sym of mod.symbols) {
                let kind = vscode.SymbolKind.Variable;
                let detail = sym.type;

                if (sym.kind === 'port') {
                    kind = vscode.SymbolKind.Interface;
                } else if (sym.kind === 'parameter' || sym.kind === 'localparam') {
                    kind = vscode.SymbolKind.Constant;
                    detail = `(param)`;
                } else if (sym.kind === 'wire') {
                    kind = vscode.SymbolKind.Event;
                } else if (sym.kind === 'integer' || sym.kind === 'genvar' || sym.kind === 'real') {
                    kind = vscode.SymbolKind.Number;
                }
                
                moduleSymbol.children.push(new vscode.DocumentSymbol(
                    sym.name,
                    detail,
                    kind,
                    sym.range,
                    sym.range
                ));
            }

            // 3. 遍历所有内部例化 (Instances)
            for (const inst of mod.instances) {
                moduleSymbol.children.push(new vscode.DocumentSymbol(
                    inst.name,
                    `Instance of ${inst.type}`,
                    vscode.SymbolKind.Field,
                    inst.range,
                    inst.range
                ));
            }

            symbols.push(moduleSymbol);
        }

        return symbols;
    }
}
