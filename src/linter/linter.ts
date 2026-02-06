import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export default class VerilogLinter implements vscode.Disposable {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private outputChannel: vscode.OutputChannel;
    private timer: NodeJS.Timeout | undefined;

    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('verilog-linter');
        this.outputChannel = vscode.window.createOutputChannel('HDL Helper Log');
    }

    public activate(subscriptions: vscode.Disposable[]) {
        subscriptions.push(this);
        vscode.workspace.onDidSaveTextDocument(this.lint, this, subscriptions);
        vscode.workspace.onDidOpenTextDocument(this.lint, this, subscriptions);
        
        vscode.workspace.onDidCloseTextDocument((doc) => {
            this.diagnosticCollection.delete(doc.uri);
        }, null, subscriptions);
    }

    public dispose() {
        this.diagnosticCollection.clear();
        this.diagnosticCollection.dispose();
        this.outputChannel.dispose();
        if (this.timer) {
            clearTimeout(this.timer);
        }
    }

    private lint(doc: vscode.TextDocument) {
        if (doc.languageId !== 'verilog' && doc.languageId !== 'systemverilog') {
            return;
        }
        if (this.timer) {
            clearTimeout(this.timer);
        }
        // 防抖：500ms 内只执行一次
        this.timer = setTimeout(() => {
            this.runLinter(doc);
        }, 500); 
    }

    private runLinter(doc: vscode.TextDocument) {
        const config = vscode.workspace.getConfiguration('hdl-helper');
        const tool = config.get<string>('linter.tool') || 'xvlog';

        // 避免日志刷屏，只有改变工具或出错时才重点关注，但为了调试保留这行
        // this.outputChannel.appendLine(`[Linter] Tool selected: ${tool}`);

        if (tool === 'verible-lint') {
            this.lintWithVerible(doc, config);
        } else {
            this.lintWithVivado(doc, config);
        }
    }

    // =========================================================
    // 引擎 A: Vivado (xvlog)
    // =========================================================
    private lintWithVivado(doc: vscode.TextDocument, config: vscode.WorkspaceConfiguration) {
        let binPath = config.get<string>('linter.executablePath') || 'xvlog';
        const isWindows = process.platform === 'win32';
        
        // 1. 路径处理与补全
        if (isWindows) {
            // 如果不是 .bat 或 .exe 结尾，且不是简单的命令名(xvlog)，尝试追加 .bat
            if (!binPath.toLowerCase().endsWith('.bat') && !binPath.toLowerCase().endsWith('.exe')) {
                // 如果是绝对路径，或者看起来像路径
                if (path.isAbsolute(binPath) || binPath.includes('\\') || binPath.includes('/')) {
                    binPath += '.bat';
                }
            }
        }

        // 2. 构造参数
        const args = ['--nolog'];
        if (doc.languageId === 'systemverilog') {
            args.push('-sv');
        }
        // 文件名必须加引号，防止空格
        args.push(`"${doc.fileName}"`);

        // 3. 构造命令
        // 使用引号包裹可执行文件路径，防止 "Program Files" 空格问题
        const cmd = `"${binPath}" ${args.join(' ')}`;

        this.outputChannel.appendLine(`[Vivado Exec] ${cmd}`);

        cp.exec(cmd, { cwd: path.dirname(doc.fileName) }, (error, stdout, stderr) => {
            const output = stdout.toString() + stderr.toString();
            
            // 错误处理: 检查命令是否未找到
            if (error) {
                // 常见的 Windows/Linux "未找到命令" 错误码
                // Fix: 使用 (error as any).code 解决 TS 报错，因为 ENOENT 是字符串
                if ((error as any).code === 'ENOENT' || error.code === 127 || output.includes('is not recognized')) {
                    this.outputChannel.appendLine(`[Error] Vivado executable not found: ${binPath}`);
                    // 仅当用户明确配置了路径时才频繁弹窗，否则只在输出台显示，避免骚扰
                    if (path.isAbsolute(binPath)) {
                        vscode.window.showErrorMessage(`无法找到 Vivado (xvlog)。请检查设置中的路径。`);
                    }
                    return;
                }
            }

            // 调试日志
            if (output.trim().length > 0) {
                // 过滤掉 Vivado 启动时的环境设置回显，只保留真正的日志
                const lines = output.split('\n').filter(l => !l.includes('setupEnv') && !l.includes('loader.bat'));
                if (lines.length > 0) {
                    this.outputChannel.appendLine(lines.join('\n'));
                }
            }

            const diagnostics = this.parseVivadoOutput(output, doc);
            this.diagnosticCollection.set(doc.uri, diagnostics);
        });
    }

    private parseVivadoOutput(output: string, doc: vscode.TextDocument): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];
        // 匹配格式: ERROR: [VRFC 10-123] message [path:line]
        const regex = /(ERROR|WARNING):\s+\[(.*?)\]\s+(.*?)\s+\[.*?:(\d+)\]/g;
        
        let match;
        while ((match = regex.exec(output)) !== null) {
            const severity = match[1] === 'ERROR' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning;
            const code = match[2];
            const msg = match[3];
            const line = parseInt(match[4]) - 1;
            
            if (line >= 0) {
                const range = new vscode.Range(line, 0, line, 1000);
                const diagnostic = new vscode.Diagnostic(range, `${code}: ${msg}`, severity);
                diagnostic.source = 'Vivado';
                diagnostics.push(diagnostic);
            }
        }
        return diagnostics;
    }

    // =========================================================
    // 引擎 B: Verible Lint (Google)
    // =========================================================
    private lintWithVerible(doc: vscode.TextDocument, config: vscode.WorkspaceConfiguration) {
        let binPath = config.get<string>('linter.veriblePath') || 'verible-verilog-lint';
        
        // Windows 下自动补全 .exe
        if (process.platform === 'win32' && !binPath.toLowerCase().endsWith('.exe')) {
            // 只有当它看起来不像是一个全局命令时才补全 (包含路径分隔符)
            if (binPath.includes('\\') || binPath.includes('/')) {
                binPath += '.exe';
            }
        }

        const args = [
            '--lint_fatal=false', // 确保 warning 不会变成 exit code 1
            '--parse_fatal=false',
            doc.fileName
        ];
        
        this.outputChannel.appendLine(`[Verible Exec] ${binPath} ${args.join(' ')}`);

        // 使用 execFile 比 exec 更安全，因为它可以自动处理参数中的空格
        cp.execFile(binPath, args, { cwd: path.dirname(doc.fileName) }, (error, stdout, stderr) => {
            const output = stderr.toString() + stdout.toString();
            
            if (error) {
                 if (error.code === 'ENOENT') {
                    this.outputChannel.appendLine(`[Error] Verible not found: ${binPath}`);
                    vscode.window.showErrorMessage(`无法启动 Verible Lint，请检查路径配置: ${binPath}`);
                    return;
                }
            }

            if (output.trim().length > 0) {
                // this.outputChannel.appendLine(output); // Verible output might be verbose
            }

            const diagnostics = this.parseVeribleOutput(output, doc);
            this.diagnosticCollection.set(doc.uri, diagnostics);
        });
    }

    private parseVeribleOutput(output: string, doc: vscode.TextDocument): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];
        // 格式: path/to/file.sv:line:col: message
        const regex = /^(.*):(\d+):(\d+)(?:-\d+)?:\s+(.*)$/gm;

        let match;
        while ((match = regex.exec(output)) !== null) {
            const filePath = match[1];
            const line = parseInt(match[2]) - 1;
            const col = parseInt(match[3]) - 1;
            const msg = match[4];

            // 关键修复：检查报错的文件是否是当前文件
            // Verible 可能会报告 include 文件中的错误，如果映射到当前文件行号会错乱
            // 简单比对：检查解析出的路径是否包含在当前文档路径中，或者文件名相同
            if (path.basename(filePath) !== path.basename(doc.fileName)) {
                continue; 
            }

            let severity = vscode.DiagnosticSeverity.Warning;
            if (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('fatal')) {
                severity = vscode.DiagnosticSeverity.Error;
            }
            
            if (line >= 0) {
                const range = new vscode.Range(line, col, line, 1000);
                const diagnostic = new vscode.Diagnostic(range, msg, severity);
                diagnostic.source = 'Verible';
                diagnostics.push(diagnostic);
            }
        }
        return diagnostics;
    }
}