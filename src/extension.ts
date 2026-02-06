import * as vscode from 'vscode';
import * as path from 'path';
import VerilogLinter from './linter/linter';
import VerilogFormatter from './formatter';
// 引入原有的功能函数
import { generateTestbench } from './commands/generateTB';
import { instantiateModule } from './commands/instantiateModule';
import { autoDeclareSignals } from './commands/autoDeclare';
import { activateLanguageServer, deactivateLanguageServer } from './languageClient';
// 引入 V2.0 工程核心
import { ProjectManager } from './project/projectManager';
import { HdlTreeProvider } from './project/hdlTreeProvider';
import { HdlModule } from './project/hdlSymbol';
import { VerilogDefinitionProvider } from './providers/defProvider';
import { VerilogHoverProvider } from './providers/hoverProvider';
import { CodeGenerator } from './utils/codeGenerator'

// 全局变量，方便 deactivate 使用
let projectManager: ProjectManager;
export function activate(context: vscode.ExtensionContext) {
    console.log('HDL Helper is active!');

    // =========================================================================
    // 1. 核心初始化 (顺序很重要！)
    // =========================================================================
    
    // A. 启动 Linter
    const linter = new VerilogLinter();
    linter.activate(context.subscriptions);

    // B. 初始化工程管理器 (只初始化一次！)
    projectManager = new ProjectManager();
    projectManager.scanWorkspace(); // 启动后台扫描

    // C. 初始化 Tree Provider
    const treeProvider = new HdlTreeProvider(projectManager);
    
    // D. 注册侧边栏视图
    vscode.window.registerTreeDataProvider(
        'hdl-hierarchy-view', 
        treeProvider
    );

    // =========================================================================
    // 2. 注册 Formatter (格式化)
    // =========================================================================
    const formatter = new VerilogFormatter();
    const formatProvider = vscode.languages.registerDocumentFormattingEditProvider(
        ['verilog', 'systemverilog'],
        formatter
    );
    context.subscriptions.push(formatProvider);

    // =========================================================================
    // 3. 注册功能命令 (Commands)
    // =========================================================================

    // --- A. 生成 Testbench (升级版：支持右键菜单) ---
    // 逻辑：如果是右键树节点触发的，先打开那个文件，再调用原来的生成逻辑
    const genTBCmd = vscode.commands.registerCommand('hdl-helper.generateTB', async (item?: HdlModule) => {
        try { 
            if (item && item.fileUri) {
                // 如果是从树形菜单点击的，先打开该文件
                await vscode.window.showTextDocument(item.fileUri);
            }
            // 复用之前的逻辑
            await generateTestbench(); 
        } catch (e) { 
            vscode.window.showErrorMessage(`TB 生成失败: ${e}`); 
        }
    });
    context.subscriptions.push(genTBCmd);

    // --- B. 智能例化 (Ctrl+Alt+I) ---
    const instCmd = vscode.commands.registerCommand('hdl-helper.instantiate', async () => {
        try { await instantiateModule(); } catch (e) { vscode.window.showErrorMessage(`${e}`); }
    });
    context.subscriptions.push(instCmd);

    // --- C. 自动声明信号 (Ctrl+Alt+W) ---
    const autoWireCmd = vscode.commands.registerCommand('hdl-helper.createSignals', async () => {
        try { await autoDeclareSignals(); } catch (e) { vscode.window.showErrorMessage(`${e}`); }
    });
    context.subscriptions.push(autoWireCmd);

    // D. 复制实例化模板 (树节点右键)
    context.subscriptions.push(vscode.commands.registerCommand('hdl-helper.copyInstantiation', async (item: HdlModule) => {
        if (!item || !(item instanceof HdlModule)) return;

        // 调用统一生成器 (这里可以选择不带注释，保持清爽，或者设为 true 也带注释)
        const finalCode = CodeGenerator.generateInstantiation(item, false);

        await vscode.env.clipboard.writeText(finalCode);
        vscode.window.showInformationMessage(`已复制 ${item.name} 实例化模板！`);
    }));

    // --- E. 工程管理命令 (Set/Clear Top) ---
    context.subscriptions.push(vscode.commands.registerCommand('hdl-helper.setTopModule', (item: HdlModule) => {
        if (item && item.name) {
            treeProvider.setTopModule(item.name);
            vscode.window.showInformationMessage(`Top Module set to: ${item.name}`);
        } else {
            vscode.window.showErrorMessage("只能将模块定义设为 Top");
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('hdl-helper.clearTopModule', () => {
        treeProvider.setTopModule(null);
        vscode.window.showInformationMessage(`已清除 Top Module 设置`);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('hdl-helper.refreshProject', () => {
        projectManager.scanWorkspace();
        treeProvider.refresh();
    }));

    // =========================================================================
    // 5. 注册跳转定义 (Go to Definition)
    // =========================================================================
    const defProvider = new VerilogDefinitionProvider(projectManager);
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
            ['verilog', 'systemverilog'],
            defProvider
        )
    );

    // =========================================================================
    // 6. 注册悬停提示 (Hover)
    // =========================================================================
    const hoverProvider = new VerilogHoverProvider(projectManager);
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(
            ['verilog', 'systemverilog'],
            hoverProvider
        )
    );

    // --- F. 调试命令 ---
    context.subscriptions.push(vscode.commands.registerCommand('hdl-helper.debugProject', () => {
        const modules = projectManager.getAllModules();
        vscode.window.showInformationMessage(`工程中共有 ${modules.length} 个模块。`);
        vscode.commands.executeCommand('workbench.debug.action.toggleRepl');
        modules.forEach(m => console.log(`📦 ${m.name} (${path.basename(m.fileUri.fsPath)})`));
    }));

    // =========================================================================
    // 4. 启动 Language Server
    // =========================================================================
    activateLanguageServer(context);
}

export function deactivate() {
    return deactivateLanguageServer();
}