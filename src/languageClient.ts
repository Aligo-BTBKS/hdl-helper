import * as vscode from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient/node';
import * as path from 'path';
import * as fs from 'fs';

let client: LanguageClient;

export function activateLanguageServer(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('hdl-helper');
    const enabled = config.get<boolean>('languageServer.enabled');
    
    if (!enabled) return;

    // 1. 获取并处理路径
    let serverPath = config.get<string>('languageServer.path') || 'verible-verilog-ls';
    
    // Windows 下简单的路径修正
    if (process.platform === 'win32' && !serverPath.endsWith('.exe')) {
        // 如果包含路径分隔符，说明不是全局命令，尝试补全 .exe
        if (serverPath.includes('\\') || serverPath.includes('/')) {
             serverPath += '.exe';
        }
    }

    // 检查可执行文件是否存在 (如果是绝对路径)
    if (path.isAbsolute(serverPath) && !fs.existsSync(serverPath)) {
        vscode.window.showErrorMessage(`Verible LS path invalid: ${serverPath}`);
        return;
    }

    // 2. 创建 Output Channel (让用户能看到 LSP 的日志)
    const outputChannel = vscode.window.createOutputChannel('HDL Helper LSP');
    outputChannel.appendLine(`[Init] Starting Verible LS from: ${serverPath}`);

    // 3. 定义 Server Options (使用标准 Executable 模式)
    const serverOptions: ServerOptions = {
        run: { 
            command: serverPath, 
            args: [], // Verible 通常不需要额外参数，除非你想加 --rules_config
            transport: TransportKind.stdio 
        },
        debug: { 
            command: serverPath, 
            args: [], 
            transport: TransportKind.stdio 
        }
    };

    // 4. 定义 Client Options
    const clientOptions: LanguageClientOptions = {
        documentSelector: [
            { scheme: 'file', language: 'verilog' },
            { scheme: 'file', language: 'systemverilog' }
        ],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{v,sv,vh,svh}')
        },
        outputChannel: outputChannel,
        traceOutputChannel: outputChannel,

        // 🔥🔥🔥 核心修复在这里 🔥🔥🔥
        // 我们要禁止 LSP 注册它自己的 Formatter，因为我们有更高级的 VerilogFormatter
        middleware: {
            provideDocumentFormattingEdits: (document, options, token, next) => {
                // 直接返回 null，表示 LSP 不处理格式化
                // 这样 VS Code 就只会使用我们在 extension.ts 里注册的那个 Formatter
                return null; 
            }
        }
    };

    // 5. 启动客户端
    client = new LanguageClient(
        'veribleLS',
        'Verible Language Server',
        serverOptions,
        clientOptions
    );

    client.start().then(() => {
        outputChannel.appendLine('[Success] LSP Started.');
    }).catch(error => {
        outputChannel.appendLine(`[Error] LSP Start Failed: ${error}`);
        vscode.window.showErrorMessage(`Verible LSP 启动失败，请检查路径配置。`);
    });
}

export function deactivateLanguageServer(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}