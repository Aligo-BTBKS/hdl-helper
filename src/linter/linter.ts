import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

export default class VerilogLinter {
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

        this.outputChannel.appendLine(`[Linter] Tool selected: ${tool}`);

        if (tool === 'verible-lint') {
            this.lintWithVerible(doc, config);
        } else {
            this.lintWithVivado(doc, config);
        }
    }

    // =========================================================
    // 引擎 A: Vivado (xvlog) - 极简回归版 (依赖绝对路径)
    // =========================================================
    private lintWithVivado(doc: vscode.TextDocument, config: vscode.WorkspaceConfiguration) {
        let binPath = config.get<string>('linter.executablePath') || 'xvlog';
        const isWindows = process.platform === 'win32';
        
        // 路径检查建议
        if (isWindows && binPath.includes('\\') && !path.isAbsolute(binPath)) {
             vscode.window.showWarningMessage(`建议使用 Vivado 的绝对路径，例如: D:\\Xilinx\\Vivado\\...\\xvlog.bat`);
        }

        // 1. 构造参数
        const args = ['--nolog'];
        if (doc.languageId === 'systemverilog') {
            args.push('-sv');
        }
        // 文件名加引号
        args.push(`"${doc.fileName}"`);

        let cmd = '';
        if (isWindows) {
            // 补全后缀
            if (!binPath.endsWith('.bat') && !binPath.endsWith('.exe')) {
                 binPath += '.bat';
            }
            
            // ⚠️ 终极方案：直接使用 "Path" Args 格式
            // 既然你已经配了绝对路径，就不需要 cmd /c call 这种复杂的嵌套了
            // Node.js 的 exec 会自动处理这个执行过程
            cmd = `"${binPath}" ${args.join(' ')}`;
        } else {
            cmd = `"${binPath}" ${args.join(' ')}`;
        }

        this.outputChannel.appendLine(`[Exec] ${cmd}`);

        cp.exec(cmd, { cwd: path.dirname(doc.fileName) }, (error, stdout, stderr) => {
            const output = stdout.toString() + stderr.toString();
            
            // 错误处理
            if (output.includes('is not recognized') || (output.length < 200 && error)) {
                if (output.includes('') || output.includes('not recognized')) {
                    this.outputChannel.appendLine('[Error] Vivado 启动失败。');
                    this.outputChannel.appendLine(`[Raw Output] ${output}`);
                    
                    // @ts-ignore
                    if (error && (error.code === 'ENOENT' || error.code === 9009 || error.code === 1)) {
                        vscode.window.showErrorMessage(
                            `Linter 启动失败！请检查设置中 Vivado 路径是否为绝对路径。`,
                            "去设置"
                        ).then(sel => {
                            if (sel) vscode.commands.executeCommand('workbench.action.openSettings', 'hdl-helper.linter.executablePath');
                        });
                    }
                }
            }

            if (output.trim().length > 0) {
                // 只要不是找不到脚本的错误，就打印
                if (!output.includes('setupEnv.bat') && !output.includes('loader.bat')) {
                    this.outputChannel.appendLine('--- xvlog output ---');
                    this.outputChannel.appendLine(output);
                }
            }

            const diagnostics = this.parseVivadoOutput(output, doc);
            this.diagnosticCollection.set(doc.uri, diagnostics);
        });
    }

    private parseVivadoOutput(output: string, doc: vscode.TextDocument): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];
        const regex = /(ERROR|WARNING):\s+\[(.*?)\]\s+(.*?)\s+\[.*?:(\d+)\]/g;
        
        let match;
        while ((match = regex.exec(output)) !== null) {
            const severity = match[1] === 'ERROR' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning;
            const code = match[2];
            const msg = match[3];
            const line = parseInt(match[4]) - 1;
            
            if (line >= 0) {
                diagnostics.push(new vscode.Diagnostic(
                    new vscode.Range(line, 0, line, 1000),
                    `${code}: ${msg}`,
                    severity
                ));
            }
        }
        return diagnostics;
    }

    // =========================================================
    // 引擎 B: Verible Lint (Google)
    // =========================================================
    private lintWithVerible(doc: vscode.TextDocument, config: vscode.WorkspaceConfiguration) {
        let binPath = config.get<string>('linter.veriblePath') || 'verible-verilog-lint';
        
        if (process.platform === 'win32' && !binPath.endsWith('.exe') && binPath.includes('/')) {
            binPath += '.exe';
        }

        const args = [doc.fileName];
        this.outputChannel.appendLine(`[Exec] ${binPath} ${args.join(' ')}`);

        cp.execFile(binPath, args, { cwd: path.dirname(doc.fileName) }, (error, stdout, stderr) => {
            const output = stderr.toString() + stdout.toString();
            
            if (output.trim().length > 0) {
                this.outputChannel.appendLine('--- verible output ---');
                this.outputChannel.appendLine(output);
            }

            const diagnostics = this.parseVeribleOutput(output, doc);
            this.diagnosticCollection.set(doc.uri, diagnostics);

            // @ts-ignore
            if (error && error.code === 'ENOENT') {
                this.outputChannel.appendLine(`[Error] Verible not found: ${binPath}`);
                vscode.window.showErrorMessage(`无法启动 Verible Lint，请检查路径配置: ${binPath}`);
            }
        });
    }

    private parseVeribleOutput(output: string, doc: vscode.TextDocument): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];
        // 兼容列号范围 (例如 5-13)
        const regex = /^(.*):(\d+):(\d+)(?:-\d+)?:\s+(.*)$/gm;

        let match;
        while ((match = regex.exec(output)) !== null) {
            const line = parseInt(match[2]) - 1;
            const col = parseInt(match[3]) - 1;
            const msg = match[4];

            let severity = vscode.DiagnosticSeverity.Warning;
            if (msg.toLowerCase().includes('error')) {
                severity = vscode.DiagnosticSeverity.Error;
            }
            
            if (line >= 0) {
                const range = new vscode.Range(line, col, line, 1000);
                const diagnostic = new vscode.Diagnostic(range, `[Verible] ${msg}`, severity);
                diagnostic.source = 'Verible';
                diagnostics.push(diagnostic);
            }
        }
        return diagnostics;
    }
}