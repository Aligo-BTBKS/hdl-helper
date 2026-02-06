import * as vscode from 'vscode';
import { ProjectManager } from './projectManager';
import { HdlModule, HdlInstance } from './hdlSymbol';
import * as path from 'path';

/**
 * 树节点类型：可能是“模块定义”或者“实例化引用”
 */
type HdlItem = HdlModule | HdlInstance;

export class HdlTreeProvider implements vscode.TreeDataProvider<HdlItem> {
    // 事件发射器：当数据变化时，通知 VS Code 刷新 UI
    private _onDidChangeTreeData: vscode.EventEmitter<HdlItem | undefined | null | void> = new vscode.EventEmitter<HdlItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<HdlItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    // 当前选中的 Top 模块名
    private topModuleName: string | null = null;

    constructor(private projectManager: ProjectManager) {
    }

    /**
     * 设置 Top Module 并刷新
     */
    public setTopModule(name: string | null) {
        this.topModuleName = name;
        this.refresh(); // 触发刷新
    }

    /**
     * 强制刷新 UI
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * 获取单个节点的 UI 信息
     */
    getTreeItem(element: HdlItem): vscode.TreeItem {
        if (element instanceof HdlModule) {
            // ---> 情况 A: 这是一个模块定义 (Module)
            // 无论是根节点还是子节点，它都默认是“可折叠的”
            const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.Collapsed);
            item.description = path.basename(element.fileUri.fsPath); // 灰色文件名
            item.iconPath = new vscode.ThemeIcon('symbol-class'); // 类图标
            item.contextValue = 'module'; // 用于右键菜单判断
            
            // 点击行为：跳转到定义
            item.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [element.fileUri, { selection: element.range }]
            };
            return item;
        } else {
            // ---> 情况 B: 这是一个实例化 (Instance)
            // 显示格式: u_inst : module_type
            const label = `${element.name} : ${element.type}`;
            
            // 🔥 核心逻辑：先去数据库查一下，这个实例化的类型，有没有对应的定义？
            const moduleDef = this.projectManager.getModule(element.type);
            const hasChildren = moduleDef !== undefined;
            
            // 如果有定义，就是 Collapsed (有箭头)；如果是黑盒/IP，就是 None (无箭头)
            const state = hasChildren 
                ? vscode.TreeItemCollapsibleState.Collapsed 
                : vscode.TreeItemCollapsibleState.None;

            const item = new vscode.TreeItem(label, state);
            
            item.iconPath = new vscode.ThemeIcon('symbol-field'); // 字段图标
            item.contextValue = 'instance';
            
            // 点击行为：跳转到实例化代码所在行
            item.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [element.fileUri, { selection: element.range }]
            };
            return item;
        }
    }

    /**
     * 获取子节点 (递归核心)
     */
    getChildren(element?: HdlItem): vscode.ProviderResult<HdlItem[]> {
        // 1. 根节点 (Root)
        if (!element) {
            // 如果用户设置了 Top，只显示那个 Top
            if (this.topModuleName) {
                const top = this.projectManager.getModule(this.topModuleName);
                return top ? [top] : [];
            }
            // 没设置 Top，显示所有模块
            return this.projectManager.getAllModules();
        } 
        
        // 2. 如果当前节点是“模块定义” (Module) -> 返回它内部的实例化
        if (element instanceof HdlModule) {
            return element.instances;
        } 
        
        // 3. 🔥 如果当前节点是“实例化” (Instance) -> 查找它的定义，并返回定义的子节点！
        // 这就是实现 "无限套娃" 的关键
        if (element instanceof HdlInstance) {
            const moduleDef = this.projectManager.getModule(element.type);
            if (moduleDef) {
                // 这里我们要返回的是 moduleDef 的 instances
                // 但是！TreeItem 需要知道父子关系吗？在这个简单版里不需要，
                // 直接把下一层的 instances 返回给 VS Code 即可。
                return moduleDef.instances;
            } else {
                return []; // 没找到定义 (比如标准库原语)，到底了
            }
        }
        
        return [];
    }
}