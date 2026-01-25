import * as vscode from 'vscode';
import VerilogLinter from './linter/linter';
import VerilogFormatter from './formatter';
import { generateTestbench } from './commands/generateTB';
import { instantiateModule } from './commands/instantiateModule';
import { autoDeclareSignals } from './commands/autoDeclare';
import { activateLanguageServer, deactivateLanguageServer } from './languageClient';


export function activate(context: vscode.ExtensionContext) {
    console.log('HDL Helper is active!');

    // 1. 启动 Linter
    const linter = new VerilogLinter();
    linter.activate(context.subscriptions);

    // 2. 注册 Formatter
    const formatter = new VerilogFormatter();
    const formatProvider = vscode.languages.registerDocumentFormattingEditProvider(
        ['verilog', 'systemverilog'],
        formatter
    );
    context.subscriptions.push(formatProvider);

    // 3. 注册命令：生成 Testbench (Ctrl+Alt+T)
    const genTBCmd = vscode.commands.registerCommand('hdl-helper.generateTB', async () => {
        try { await generateTestbench(); } catch (e) { vscode.window.showErrorMessage(`${e}`); }
    });
    context.subscriptions.push(genTBCmd);

    // 4. 注册命令：智能例化 (Ctrl+Alt+I)
    const instCmd = vscode.commands.registerCommand('hdl-helper.instantiate', async () => {
        try { await instantiateModule(); } catch (e) { vscode.window.showErrorMessage(`${e}`); }
    });
    context.subscriptions.push(instCmd);

    // 5. 注册命令：自动声明信号 (Ctrl+Alt+W)
    const autoWireCmd = vscode.commands.registerCommand('hdl-helper.createSignals', async () => {
        try { await autoDeclareSignals(); } catch (e) { vscode.window.showErrorMessage(`${e}`); }
    });
    context.subscriptions.push(autoWireCmd);

    // 6. 启动 Language Server 
    // 这会在后台启动 verible-verilog-ls.exe
    activateLanguageServer(context);
}

export function deactivate() {
    // 关闭插件时，同时也关闭 LS
    return deactivateLanguageServer();
}