import * as vscode from 'vscode';

export async function autoDeclareSignals() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const document = editor.document;
    const selection = editor.selection;
    
    // 获取选中的文本
    const text = document.getText(selection);
    if (!text.trim()) {
        vscode.window.showErrorMessage('请先选中一段包含例化的代码 (带 // 注释)');
        return;
    }

    // 解析选中内容
    const lines = text.split('\n');
    const signals: string[] = [];
    
    // 正则：匹配 .port ( signal ), // direction [width]
    // 捕获组 1: 信号名
    // 捕获组 2: 位宽 (可选)
    const regex = /\.\w+\s*\(\s*(\w+)\s*\).*?\/\/\s*\w+\s*(\[.*?\])?/;

    for (const line of lines) {
        const match = regex.exec(line);
        if (match) {
            const sigName = match[1];
            const width = match[2] ? match[2] : ''; // 如果有位宽就用，没有就是空
            
            // 忽略 clk 和 rst, rst_n 等常见信号，通常不需要重复声明
            if (!['clk', 'rst_n', 'rst', 'clock', 'reset'].includes(sigName)) {
                // 对齐逻辑：logic [31:0] name;
                // 为了美观，我们简单拼装，VS Code 的 Formatter 会帮我们最终对齐
                if (width) {
                    signals.push(`logic ${width} ${sigName};`);
                } else {
                    signals.push(`logic        ${sigName};`);
                }
            }
        }
    }

    if (signals.length === 0) {
        vscode.window.showWarningMessage('未识别到有效信号。请确保选中了包含 // 注释的例化行');
        return;
    }

    // 去重
    const uniqueSignals = [...new Set(signals)];
    const declarationBlock = uniqueSignals.join('\n') + '\n\n';

    // 在选中区域的上方插入
    editor.edit(editBuilder => {
        editBuilder.insert(selection.start, declarationBlock);
    });

    vscode.window.showInformationMessage(`已自动声明 ${uniqueSignals.length} 个信号！`);
}