import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FastParser } from './fastParser';
import { HdlModule } from './hdlSymbol';
import { FilelistParser } from './filelistParser';

export class ProjectManager {
    // 核心存储: 模块名 -> 模块数据
    private moduleMap = new Map<string, HdlModule>();
    
    // 辅助存储: 文件路径 -> 该文件包含的模块名列表 (用于快速删除)
    private fileMap = new Map<string, string[]>();

    constructor() {
        // 监听变动
        const watcher = vscode.workspace.createFileSystemWatcher('**/*.{v,sv,vh,svh}');
        watcher.onDidCreate(uri => { console.log(`[File Create] ${uri.fsPath}`); this.updateFile(uri); });
        watcher.onDidChange(uri => { console.log(`[File Change] ${uri.fsPath}`); this.updateFile(uri); });
        watcher.onDidDelete(uri => this.removeFile(uri));
    }

    public async scanWorkspace() {
        this.moduleMap.clear();
        this.fileMap.clear();

        console.log('[Step 1] 开始搜索项目索引...');

        // 1. 优先查找 .f 文件
        const fFiles = await vscode.workspace.findFiles('**/*.f', '**/node_modules/**');
        let filesToScan: vscode.Uri[] = [];

        if (fFiles.length > 0) {
            // ---> 🅰️ 模式 A: Filelist 模式
            console.log(`[Step 1.1] 发现 ${fFiles.length} 个 .f 文件，进入 Filelist 模式。`);
            
            const rawPaths = new Set<string>();

            // 遍历所有 .f 文件并解析
            for (const fUri of fFiles) {
                console.log(`   - 📜 解析 Filelist: ${path.basename(fUri.fsPath)}`);
                const paths = FilelistParser.parse(fUri.fsPath);
                paths.forEach(p => rawPaths.add(p));
            }

            // 将路径字符串转换为 VS Code Uri
            rawPaths.forEach(p => filesToScan.push(vscode.Uri.file(p)));

        } else {
            // ---> 🅱️ 模式 B: 全盘扫描模式 (Fallback)
            console.log('[Step 1.2] 未发现 .f 文件，进入全盘扫描模式...');
            // 查找所有 .v/.sv 文件
            filesToScan = await vscode.workspace.findFiles('**/*.{v,sv,vh,svh}'); 
        }
        
        console.log(`[Step 2] 搜索结束，待解析文件共 ${filesToScan.length} 个：`);
        // 仅打印前 10 个，防止大项目刷屏
        filesToScan.slice(0, 10).forEach(f => console.log(`   - 📄 ${path.basename(f.fsPath)}`));
        if (filesToScan.length > 10) console.log(`   - ... (还有 ${filesToScan.length - 10} 个)`);

        if (filesToScan.length === 0) {
            console.warn('[Warning] 没有找到任何 HDL 文件！请检查 .f 文件内容或文件后缀。');
            return;
        }

        // 2. 逐个解析
        console.log('[Step 3] 开始解析文件内容...');
        
        // 并行处理所有文件读取和解析
        await Promise.all(filesToScan.map(file => this.updateFile(file)));

        console.log(`[Step 4] 扫描完成! 最终建立了 ${this.moduleMap.size} 个模块索引。`);
    }

    private async updateFile(uri: vscode.Uri) {
        try {
            // 使用 VS Code API 读取文件 (处理了编码问题)
            const uint8Array = await vscode.workspace.fs.readFile(uri);
            const text = new TextDecoder('utf-8').decode(uint8Array);

            const hdlModule = FastParser.parse(text, uri);

            if (hdlModule) {
                // 1. 存入 moduleMap
                this.moduleMap.set(hdlModule.name, hdlModule);
                
                // 2. 存入 fileMap (为了 removeFile 时能 O(1) 找到)
                const fsPath = uri.fsPath;
                if (!this.fileMap.has(fsPath)) {
                    this.fileMap.set(fsPath, []);
                }
                const list = this.fileMap.get(fsPath);
                if (list && !list.includes(hdlModule.name)) {
                    list.push(hdlModule.name);
                }

                console.log(`   ✅ [Success] 解析成功: ${hdlModule.name} -> ${path.basename(uri.fsPath)}`);
            } else {
                // 仅在非 .f 模式下或者明确调试时打印失败，避免干扰
                // console.warn(`   ❌ [Failed] 解析失败: ${path.basename(uri.fsPath)} (未找到 module 定义)`);
            }
        } catch (error) {
            console.error(`[Error] 读取失败: ${uri.fsPath}`, error);
        }
    }

    private removeFile(uri: vscode.Uri) {
        const fsPath = uri.fsPath;
        const moduleNames = this.fileMap.get(fsPath);

        if (moduleNames) {
            console.log(`[File Delete] 移除文件索引: ${path.basename(fsPath)}`);
            // 从 moduleMap 中移除该文件包含的所有模块
            moduleNames.forEach(name => {
                this.moduleMap.delete(name);
            });
            // 从 fileMap 中移除
            this.fileMap.delete(fsPath);
        }
    }

    public getAllModules(): HdlModule[] {
        return Array.from(this.moduleMap.values());
    }

    public getModule(name: string): HdlModule | undefined {
        return this.moduleMap.get(name);
    }
}