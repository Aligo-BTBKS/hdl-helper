import * as vscode from 'vscode';
import { ProjectManager } from '../project/projectManager';
import { HdlModule } from '../project/hdlSymbol';
import * as path from 'path';

export class VerilogHoverProvider implements vscode.HoverProvider {
    constructor(private projectManager: ProjectManager) {}

    public provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        
        // 1. 获取当前鼠标悬停的单词
        const range = document.getWordRangeAtPosition(position);
        if (!range) return null;
        
        const word = document.getText(range);

        // 2. 去数据库里查：这是一个模块名吗？
        const module = this.projectManager.getModule(word);
        
        if (module) {
            // 3. 如果是，构建 Markdown 内容
            return this.buildHoverContent(module);
        }

        return null;
    }

    private buildHoverContent(module: HdlModule): vscode.Hover {
        const md = new vscode.MarkdownString();
        
        // --- 标题 ---
        md.appendMarkdown(`### 📦 Module: **${module.name}**\n`);
        md.appendMarkdown(`--- \n`);
        
        // --- 所在文件 ---
        md.appendMarkdown(`📍 *File: ${path.basename(module.fileUri.fsPath)}* \n\n`);

        // --- 参数列表 (Parameters) ---
        if (module.params.length > 0) {
            md.appendMarkdown(`#### ⚙️ Parameters:\n`);
            md.appendCodeblock(
                module.params.map(p => `${p.name} = ${p.defaultValue}`).join('\n'), 
                'verilog'
            );
        }

        // --- 端口列表 (Ports) ---
        // 我们简单分类一下 input 和 output，看起来更清晰
        if (module.ports.length > 0) {
            const inputs = module.ports.filter(p => p.dir === 'input');
            const outputs = module.ports.filter(p => p.dir === 'output');
            const inouts = module.ports.filter(p => p.dir === 'inout');

            md.appendMarkdown(`#### 🔌 Ports:\n`);
            
            // 构造端口显示的辅助函数
            const formatPorts = (ports: typeof module.ports) => 
                ports.map(p => `${p.dir.padEnd(6)} ${p.type} ${p.name}`).join('\n');

            let portText = '';
            if (inputs.length) portText += `// Inputs\n${formatPorts(inputs)}\n`;
            if (outputs.length) portText += `// Outputs\n${formatPorts(outputs)}\n`;
            if (inouts.length) portText += `// Inouts\n${formatPorts(inouts)}\n`;

            md.appendCodeblock(portText, 'verilog');
        } else {
            md.appendMarkdown(`*(No ports detected or parsing failed)*`);
        }

        // 允许 Markdown 里的内容支持命令链接 (可选)
        md.isTrusted = true;

        return new vscode.Hover(md);
    }
}