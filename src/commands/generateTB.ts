import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseModule } from '../utils/hdlUtils';
export async function generateTestbench() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('请先打开一个 Verilog/SystemVerilog 文件');
        return;
    }

    const doc = editor.document;
    const code = doc.getText();

    // 1. 解析代码 (提取模块名、端口、参数)
    const moduleInfo = parseModule(code);
    if (!moduleInfo) {
        vscode.window.showErrorMessage('无法解析模块定义，请检查代码语法');
        return;
    }

    // 2. 生成 TB 内容 (套用你的模板)
    const tbContent = generateContent(moduleInfo);

    // 3. 创建新文件 tb_moduleName.sv
    const currentFolder = path.dirname(doc.fileName);
    const tbFileName = `tb_${moduleInfo.name}.sv`;
    const tbFilePath = path.join(currentFolder, tbFileName);

    // 检查文件是否存在
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
    vscode.window.showInformationMessage(`Testbench 生成成功: ${tbFileName}`);
}

// --- 简单的正则解析器 ---
interface Port {
    direction: string; // input, output, inout
    width: string;     // [31:0] or empty
    name: string;
}

interface Param {
    name: string;
    value: string;
}

interface ModuleInfo {
    name: string;
    params: Param[];
    ports: Port[];
    clockPort?: string;
    resetPort?: string;
}

// --- 核心：套用你的模板 ---
function generateContent(info: ModuleInfo): string {
    const { name, params, ports, clockPort, resetPort } = info;

    // 1. 构建 TB 内部信号声明
    // 除了 clk/rst_n，其他端口都需要声明为 logic / wire
    const signalDecls = ports
        .filter(p => p.name !== clockPort && p.name !== resetPort)
        .map(p => {
            const width = p.width ? ` ${p.width}` : '';
            return `\tlogic${width} ${p.name};`;
        })
        .join('\n');

    // 2. 构建实例化连线
    const maxNameLen = Math.max(...ports.map(p => p.name.length)) + 1;
    
    const instanceConnections = ports.map((p, index) => {
        let connectTo = p.name;
        // 如果 DUT 的端口叫 sys_clk，但 TB 里统一叫 clk，这里做个映射
        if (p.name === clockPort) connectTo = 'clk';
        if (p.name === resetPort) connectTo = 'rst_n';
        
        // 对齐美化
        const padding = ' '.repeat(maxNameLen - p.name.length);
        const comma = index === ports.length - 1 ? '' : ',';
        return `\t\t.${p.name}${padding} (${connectTo})${comma}`;
    }).join('\n');

    // 3. 构建参数传递
    let paramStr = '';
    if (params.length > 0) {
        const pList = params.map(p => `.${p.name}(${p.value})`).join(', ');
        paramStr = ` #(${pList})`;
    }

    // --- 模板替换开始 ---
    return `\`timescale 1ns/1ps

module tb_${name};

    // -------------------------------------------------------------------------
    // 1. Parameters & Constants
    // -------------------------------------------------------------------------
    localparam float CLK_PERIOD = 10.0; // Float for precision
    localparam int   TIMEOUT    = 50000; // Cycles watchdog
    
${params.map(p => `    localparam ${p.name} = ${p.value};`).join('\n')}

    // -------------------------------------------------------------------------
    // 2. Signals & Interface
    // -------------------------------------------------------------------------
    logic clk;
    logic rst_n;

    // DUT Signals
${signalDecls}

    // -------------------------------------------------------------------------
    // 3. DUT Instantiation
    // -------------------------------------------------------------------------
    ${name}${paramStr} u_dut (
${instanceConnections}
    );

    // -------------------------------------------------------------------------
    // 4. Clock & Reset Generation
    // -------------------------------------------------------------------------
    initial begin
        clk = 0;
        forever #(CLK_PERIOD/2.0) clk = ~clk;
    end

    // Task: Standard Reset Sequence
    task apply_reset();
    begin
        $display("[%0t] Reset Asserted...", $time);
        rst_n = 0;
        repeat(10) @(posedge clk);
        @(negedge clk); // Release on negedge
        rst_n = 1;
        $display("[%0t] Reset Released...", $time);
    end
    endtask

    // -------------------------------------------------------------------------
    // 5. Main Test Process
    // -------------------------------------------------------------------------
    initial begin
        // 5.1 Waveform Dump
        \`ifdef DUMP_VCD
            $dumpfile("tb_${name}.vcd");
            $dumpvars(0, tb_${name});
        \`endif
        \`ifdef DUMP_FSDB
            $fsdbDumpfile("tb_${name}.fsdb");
            $fsdbDumpvars(0, tb_${name});
        \`endif

        // 5.2 Test Sequence
        apply_reset();

        $display("[%0t] Test Started...", $time);
        
        // TODO: Driver Logic Here
        repeat(100) @(posedge clk);

        // 5.3 End of Simulation
        $display("[%0t] TEST PASSED", $time);
        $finish;
    end

    // -------------------------------------------------------------------------
    // 6. Watchdog (Safety Net)
    // -------------------------------------------------------------------------
    initial begin
        repeat(TIMEOUT) @(posedge clk);
        $display("\\nError: Simulation Timeout after %0d cycles!", TIMEOUT);
        $display("[%0t] TEST FAILED (TIMEOUT)", $time);
        $fatal;
    end

endmodule
`;
}