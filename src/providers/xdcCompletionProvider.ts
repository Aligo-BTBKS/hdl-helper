import * as vscode from 'vscode';
import { ProjectManager } from '../project/projectManager';

export class XdcCompletionProvider implements vscode.CompletionItemProvider {
    constructor(private projectManager: ProjectManager) {}

    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        
        const completions: vscode.CompletionItem[] = [];

        // 1. XDC / Vivado SDC 常用命令
        const commands = [
            'set_property', 'get_ports', 'create_clock', 'get_clocks',
            'set_input_delay', 'set_output_delay', 'set_false_path',
            'set_multicycle_path', 'set_max_delay', 'set_min_delay'
        ];
        for (const cmd of commands) {
            completions.push(new vscode.CompletionItem(cmd, vscode.CompletionItemKind.Function));
        }

        // 2. 常用 Properties
        const properties = ['PACKAGE_PIN', 'IOSTANDARD', 'PULLUP', 'PULLDOWN', 'SLEW', 'DRIVE'];
        for (const prop of properties) {
            completions.push(new vscode.CompletionItem(prop, vscode.CompletionItemKind.Property));
        }

        // 3. 常见 IO Standards
        const ioStandards = [
            'LVCMOS33', 'LVCMOS25', 'LVCMOS18', 'LVCMOS15', 'LVCMOS12', 
            'SSTL15', 'SSTL135', 'LVDS', 'LVDS_25', 'DIFF_SSTL15'
        ];
        for (const io of ioStandards) {
            completions.push(new vscode.CompletionItem(io, vscode.CompletionItemKind.Constant));
        }

        // 4. 从 Top Module 提取顶层端口 (如果能找到的话)
        const allModules = this.projectManager.getAllModules();
        if (allModules.length > 0) {
            // 目前没有严格的 Top Module 强绑定机制，我们假设用户可能想补全任何一个大模块的端口
            // 简单版本：把所有模块的端口都扔进去（带上模块名注释）
            // 优化版本：如果将来 ProjectManager 中存了明确的 topModule，则主要补全 top 端口
            for (const mod of allModules) {
                // 如果一个模块没有在其他地方被实例化，那极大概率是 Top
                // 但简便起见，当前就提供全部吧...
                for (const port of mod.ports) {
                    const item = new vscode.CompletionItem(`[get_ports ${port.name}]`, vscode.CompletionItemKind.Snippet);
                    item.detail = `Port of ${mod.name} (${port.dir})`;
                    // 这里可以直接当 snippet 插入完整的一组，例如：
                    item.insertText = new vscode.SnippetString(`set_property PACKAGE_PIN \${1:PIN} [get_ports ${port.name}]\nset_property IOSTANDARD \${2:LVCMOS33} [get_ports ${port.name}]`);
                    completions.push(item);

                    // 同时也单独提供端口名称
                    const portNameItem = new vscode.CompletionItem(port.name, vscode.CompletionItemKind.Variable);
                    portNameItem.detail = `Port from ${mod.name}`;
                    completions.push(portNameItem);
                }
            }
        }

        return completions;
    }
}
