import * as vscode from 'vscode';
import * as path from 'path';
import { FastParser } from './fastParser';
import { HdlModule } from './hdlSymbol';

export class ProjectManager {
    private moduleMap = new Map<string, HdlModule>();

    constructor() {
        // 监听变动
        const watcher = vscode.workspace.createFileSystemWatcher('**/*.{v,sv}');
        watcher.onDidCreate(uri => { console.log(`[File Create] ${uri.fsPath}`); this.updateFile(uri); });
        watcher.onDidChange(uri => { console.log(`[File Change] ${uri.fsPath}`); this.updateFile(uri); });
        watcher.onDidDelete(uri => this.removeFile(uri));
    }

    public async scanWorkspace() {
        console.log('[Step 1] 开始搜索 workspace 下的 .v/.sv 文件...');
        
        // 1. 查找文件 (不排除 node_modules 试试，防止误杀)
        const files = await vscode.workspace.findFiles('**/*.{v,sv}');
        
        console.log(`[Step 2] 搜索结束，共找到 ${files.length} 个文件：`);
        files.forEach(f => console.log(`   - 📄 ${path.basename(f.fsPath)}`));

        if (files.length === 0) {
            console.warn('[Warning] 没有找到任何 HDL 文件！请检查文件后缀是否为 .v 或 .sv');
            return;
        }

        // 2. 逐个解析
        console.log('[Step 3] 开始解析文件内容...');
        await Promise.all(files.map(file => this.updateFile(file)));

        console.log(`[Step 4] 扫描完成! 最终建立了 ${this.moduleMap.size} 个模块索引。`);
    }

    private async updateFile(uri: vscode.Uri) {
        try {
            const uint8Array = await vscode.workspace.fs.readFile(uri);
            const text = new TextDecoder('utf-8').decode(uint8Array);

            // ---> 调试关键点：看看文件头 100 个字符是啥，确认读到了东西
            // console.log(`[Reading] ${path.basename(uri.fsPath)} (前50字符): ${text.substring(0, 50).replace(/\n/g, '\\n')}...`);

            const hdlModule = FastParser.parse(text, uri);

            if (hdlModule) {
                console.log(`   ✅ [Success] 解析成功: ${hdlModule.name} -> ${path.basename(uri.fsPath)}`);
                this.moduleMap.set(hdlModule.name, hdlModule);
            } else {
                console.warn(`   ❌ [Failed] 解析失败: ${path.basename(uri.fsPath)} (未找到 module 定义)`);
                // 如果你想看为什么失败，可以把 parse 里的 moduleMatch 打印出来
            }
        } catch (error) {
            console.error(`[Error] 读取失败: ${uri.fsPath}`, error);
        }
    }

    private removeFile(uri: vscode.Uri) {
        for (const [name, module] of this.moduleMap) {
            if (module.fileUri.toString() === uri.toString()) {
                this.moduleMap.delete(name);
                break;
            }
        }
    }

    public getAllModules(): HdlModule[] {
        return Array.from(this.moduleMap.values());
    }

    public getModule(name: string): HdlModule | undefined {
        return this.moduleMap.get(name);
    }
}
