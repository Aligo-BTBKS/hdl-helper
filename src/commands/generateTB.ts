import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FastParser } from '../project/fastParser'; // 👈 V2.0 核心
import { TestbenchGenerator } from '../utils/tbGenerator'; // 👈 新的生成器

export async function generateTestbench() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('请先打开一个 Verilog/SystemVerilog 文件');
        return;
    }

    const doc = editor.document;
    const code = doc.getText();
    const uri = doc.uri;

    // 1. 使用 FastParser 解析
    const hdlModule = FastParser.parse(code, uri);
    
    if (!hdlModule) {
        vscode.window.showErrorMessage('无法解析模块定义，请检查 module 关键字');
        return;
    }

    // 2. 生成 TB 内容
    const tbContent = TestbenchGenerator.generate(hdlModule);

    // 3. 创建文件逻辑 (保持不变)
    const currentFolder = path.dirname(doc.fileName);
    const tbFileName = `tb_${hdlModule.name}.sv`; // 强制用 .sv，哪怕源文件是 .v
    const tbFilePath = path.join(currentFolder, tbFileName);

    // 检查是否存在
    if (fs.existsSync(tbFilePath)) {
        const overwrite = await vscode.window.showWarningMessage(
            `文件 ${tbFileName} 已存在，是否覆盖？`,
            '覆盖', '取消'
        );
        if (overwrite !== '覆盖') return;
    }

    // 写入并打开
    fs.writeFileSync(tbFilePath, tbContent);
    const tbDoc = await vscode.workspace.openTextDocument(tbFilePath);
    await vscode.window.showTextDocument(tbDoc);
    vscode.window.showInformationMessage(`✅ Testbench 生成成功: ${tbFileName}`);
}