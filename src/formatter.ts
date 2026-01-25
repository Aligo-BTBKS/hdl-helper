import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

export default class VerilogFormatter implements vscode.DocumentFormattingEditProvider {
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('HDL Formatter');
    }

    public provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        
        const config = vscode.workspace.getConfiguration('hdl-helper');
        let binPath = config.get<string>('formatter.executablePath') || 'verible-verilog-format';

        // Windows 下如果没有后缀，且不是全局命令，尝试加 .exe (防呆设计)
        if (process.platform === 'win32' && !binPath.endsWith('.exe') && binPath.includes('/')) {
            binPath += '.exe';
        }

        const args = [
            '--indentation_spaces', options.tabSize.toString(),
            '--column_limit', '120', 
            '-' 
        ];

        return new Promise((resolve, reject) => {
            const cwd = path.dirname(document.fileName);
            this.outputChannel.appendLine(`[Exec] ${binPath} ${args.join(' ')}`);

            const startTime = Date.now();
            const process = cp.execFile(binPath, args, { cwd }, (error, stdout, stderr) => {
                if (error) {
                    this.outputChannel.appendLine(`[Error] ${error.message}`);
                    
                    // --- 核心修改：区分错误类型 ---
                    // ENOENT 表示文件不存在 (Error NO ENTry)
                    // @ts-ignore
                    if (error.code === 'ENOENT') {
                        vscode.window.showErrorMessage(
                            `无法找到 Verible 格式化工具！请检查路径设置: ${binPath}`,
                            "去设置" // 提供一个按钮
                        ).then(selection => {
                            if (selection === "去设置") {
                                vscode.commands.executeCommand('workbench.action.openSettings', 'hdl-helper.formatter.executablePath');
                            }
                        });
                    } else {
                        // 如果找到了工具，但工具报错了（通常是代码语法烂到没法格式化）
                        vscode.window.showWarningMessage('格式化失败：Verible 无法解析当前代码，请检查是否存在语法错误。');
                    }
                    return resolve([]); 
                }

                const duration = Date.now() - startTime;
                this.outputChannel.appendLine(`[Success] Formatted in ${duration}ms`);

                const firstLine = document.lineAt(0);
                const lastLine = document.lineAt(document.lineCount - 1);
                const fullRange = new vscode.Range(firstLine.range.start, lastLine.range.end);

                resolve([vscode.TextEdit.replace(fullRange, stdout)]);
            });

            if (process.stdin) {
                process.stdin.write(document.getText());
                process.stdin.end();
            }
        });
    }
}