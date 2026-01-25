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

        // --- 1. 获取用户自定义参数 ---
        // 默认为空数组，防止用户没配置时报错
        const customFlags = config.get<string[]>('formatter.flags') || [];

        // --- 2. 构建参数列表 ---
        // 复制一份用户参数，避免修改原配置
        let args = [...customFlags];

        // --- 3. 智能处理缩进 (Indentation) ---
        // 逻辑：如果用户在 flags 里显式指定了缩进 (例如 --indentation_spaces=2)，则以用户的为准。
        // 如果用户没指定，则默认使用 VS Code 当前编辑器的 Tab 大小 (options.tabSize)。
        const hasUserIndentation = args.some(arg => arg.startsWith('--indentation_spaces'));
        if (!hasUserIndentation) {
            args.push(`--indentation_spaces=${options.tabSize}`);
        }

        // --- 4. 必要的固定参数 ---
        // 告诉 Verible 从标准输入 (stdin) 读取代码，并输出到 stdout
        args.push('-'); 

        return new Promise((resolve, reject) => {
            const cwd = path.dirname(document.fileName);
            
            // 打印完整的执行命令，方便调试
            this.outputChannel.appendLine(`[Exec] "${binPath}" ${args.join(' ')}`);

            const startTime = Date.now();
            
            // 使用 execFile 启动进程
            const process = cp.execFile(binPath, args, { cwd }, (error, stdout, stderr) => {
                if (error) {
                    this.outputChannel.appendLine(`[Error] ${error.message}`);
                    if (stderr) {
                         this.outputChannel.appendLine(`[Stderr] ${stderr}`);
                    }
                    
                    // --- 错误处理逻辑 (保留你的原逻辑) ---
                    // @ts-ignore
                    if (error.code === 'ENOENT') {
                        vscode.window.showErrorMessage(
                            `无法找到 Verible 格式化工具！请检查路径设置: ${binPath}`,
                            "去设置"
                        ).then(selection => {
                            if (selection === "去设置") {
                                vscode.commands.executeCommand('workbench.action.openSettings', 'hdl-helper.formatter.executablePath');
                            }
                        });
                    } else {
                        // 如果有 stderr，通常包含了具体的语法错误位置，可以打印出来给用户看
                        // 比如: "test.sv:5:10: syntax error..."
                        const msg = stderr ? `格式化失败：${stderr.split('\n')[0]}` : '格式化失败：Verible 无法解析当前代码，请检查语法错误。';
                        vscode.window.showWarningMessage(msg);
                    }
                    return resolve([]); 
                }

                const duration = Date.now() - startTime;
                this.outputChannel.appendLine(`[Success] Formatted in ${duration}ms`);

                // 全文替换
                const firstLine = document.lineAt(0);
                const lastLine = document.lineAt(document.lineCount - 1);
                const fullRange = new vscode.Range(firstLine.range.start, lastLine.range.end);

                resolve([vscode.TextEdit.replace(fullRange, stdout)]);
            });

            // 写入代码到 stdin
            if (process.stdin) {
                process.stdin.write(document.getText());
                process.stdin.end();
            }
        });
    }
}