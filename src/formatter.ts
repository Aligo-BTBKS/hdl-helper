import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

export default class VerilogFormatter implements vscode.DocumentFormattingEditProvider {
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('HDL Formatter');
        // 初始化时不自动弹窗，保持安静
        this.outputChannel.clear();
    }

    public provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        
        // ❌ 移除这行，不再每次强制弹窗抢焦点
        // this.outputChannel.show(true); 

        const config = vscode.workspace.getConfiguration('hdl-helper');
        let binPath = config.get<string>('formatter.executablePath') || 'verible-verilog-format';

        if (process.platform === 'win32' && !binPath.endsWith('.exe') && binPath.includes('/')) {
            binPath += '.exe';
        }

        const customFlags = config.get<string[]>('formatter.flags') || [];
        // 清洗参数
        let args = customFlags.map(arg => arg.trim());

        // 智能缩进检测
        const hasUserIndentation = args.some(arg => arg.includes('indentation_spaces'));
        if (!hasUserIndentation) {
            args.push(`--indentation_spaces=${options.tabSize}`);
        }

        args.push('-'); 

        return new Promise((resolve, reject) => {
            const cwd = path.dirname(document.fileName);
            
            // 📝 记录日志，但只写在后台，不弹窗
            // 如果你想彻底屏蔽，可以注释掉下面这一行
            this.outputChannel.appendLine(`[Exec] "${binPath}" ${args.join(' ')}`);

            const startTime = Date.now();
            
            const process = cp.execFile(binPath, args, { cwd }, (error, stdout, stderr) => {
                if (error) {
                    // 只有出错时，才强制弹窗提示用户
                    this.outputChannel.show(true);
                    this.outputChannel.appendLine(`[Error] ${error.message}`);
                    if (stderr) this.outputChannel.appendLine(`[Stderr] ${stderr}`);
                    
                    // @ts-ignore
                    if (error.code === 'ENOENT') {
                        vscode.window.showErrorMessage(`找不到 Verible 工具: ${binPath}`, "去设置")
                            .then(s => s === "去设置" && vscode.commands.executeCommand('workbench.action.openSettings', 'hdl-helper.formatter'));
                    } else {
                        vscode.window.showWarningMessage('格式化失败，请检查 Output 面板中的语法错误日志。');
                    }
                    return resolve([]); 
                }

                // 成功时不弹窗，只记录耗时
                // const duration = Date.now() - startTime;
                // this.outputChannel.appendLine(`[Success] Formatted in ${duration}ms`);

                const fullRange = new vscode.Range(
                    document.lineAt(0).range.start,
                    document.lineAt(document.lineCount - 1).range.end
                );
                resolve([vscode.TextEdit.replace(fullRange, stdout)]);
            });

            if (process.stdin) {
                process.stdin.write(document.getText());
                process.stdin.end();
            }
        });
    }
}