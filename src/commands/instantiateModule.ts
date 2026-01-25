import * as vscode from 'vscode';
import { parseModule } from '../utils/hdlUtils';

export async function instantiateModule() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('请先打开一个 Verilog/SystemVerilog 文件');
        return;
    }

    const doc = editor.document;
    const code = doc.getText();

    // 1. 解析
    const moduleInfo = parseModule(code);
    if (!moduleInfo) {
        vscode.window.showErrorMessage('无法识别模块定义，请检查语法');
        return;
    }

    // 2. 生成例化代码
    const instCode = generateInstantiation(moduleInfo);

    // 3. 写入剪贴板
    await vscode.env.clipboard.writeText(instCode);
    
    // 4. 提示用户
    vscode.window.showInformationMessage(`已复制 ${moduleInfo.name} 的例化代码到剪贴板！`);
}

function generateInstantiation(info: any): string {
    const { name, params, ports } = info;
    const instanceName = `u_${name}`;

    // 找出最长的端口名长度 (用于对齐)
    const maxPortLen = Math.max(...ports.map((p: any) => p.name.length));

    // --- 1. 构建参数部分 (保持不变) ---
    let paramBlock = '';
    if (params.length > 0) {
        const maxParamLen = Math.max(...params.map((p: any) => p.name.length));
        const paramLines = params.map((p: any, i: number) => {
            const padding = ' '.repeat(maxParamLen - p.name.length);
            const comma = i === params.length - 1 ? '' : ',';
            return `    .${p.name}${padding} ( ${p.name}${padding} )${comma}`;
        }).join('\n');
        paramBlock = ` #(\n${paramLines}\n)`;
    }

    // --- 2. 构建端口部分 (升级版：带注释) ---
    const portLines = ports.map((p: any, i: number) => {
        const padding = ' '.repeat(maxPortLen - p.name.length);
        const comma = i === ports.length - 1 ? '' : ','; 
        
        // 关键修改：添加注释，记录方向和位宽
        // 格式: .port ( sig ), // input [31:0]
        const widthStr = p.width ? ` ${p.width}` : '';
        const comment = ` // ${p.direction}${widthStr}`;
        
        return `    .${p.name}${padding} ( ${p.name}${padding} )${comma}${comment}`;
    }).join('\n');

    return `${name}${paramBlock} ${instanceName} (\n${portLines}\n);`;
}