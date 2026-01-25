import * as vscode from 'vscode';

export interface Port {
    direction: string; // input, output, inout
    width: string;     // [31:0] or empty
    name: string;
}

export interface Param {
    name: string;
    value: string;
}

export interface ModuleInfo {
    name: string;
    params: Param[];
    ports: Port[];
}

// 核心解析函数
export function parseModule(code: string): ModuleInfo | null {
    // 移除注释
    const cleanCode = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

    // 1. 提取模块名
    const moduleRegex = /\bmodule\s+(\w+)/;
    const moduleMatch = cleanCode.match(moduleRegex);
    if (!moduleMatch) return null;
    const moduleName = moduleMatch[1];

    // 2. 提取参数
    const params: Param[] = [];
    const paramRegex = /parameter\s+(?:int\s+|logic\s+|bit\s+|real\s+)?(?:\s*\[.*?\]\s*)?(\w+)\s*=\s*([^,);]+)/g;
    let pMatch;
    while ((pMatch = paramRegex.exec(cleanCode)) !== null) {
        params.push({ name: pMatch[1], value: pMatch[2].trim() });
    }

    // 3. 提取端口
    const ports: Port[] = [];
    const portRegex = /^\s*(input|output|inout)\s+(?:logic|wire|reg|bit)?\s*(\[.*?\])?\s*(\w+)/gm;
    let match;
    
    while ((match = portRegex.exec(cleanCode)) !== null) {
        ports.push({
            direction: match[1],
            width: match[2] ? match[2].replace(/\s+/g, '') : '',
            name: match[3]
        });
    }

    return { name: moduleName, params, ports };
}