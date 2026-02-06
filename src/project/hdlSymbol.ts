import * as vscode from 'vscode';

/**
 * 模块类型：是 Verilog 还是 SystemVerilog，或者是 Testbench
 */
export enum HdlModuleType {
    Module,
    Interface,
    Package,
    Testbench // 简单的启发式判断：没有端口的 module
}

/**
 * 1. 新增：代表一个参数
 * 例如: parameter DATA_WIDTH = 32
 */
export class HdlParam {
    constructor(
        public name: string,       // DATA_WIDTH
        public defaultValue: string // 32
    ) {}
}

/**
 * 代表一个端口
 * 例如: input wire [7:0] data_in
 */
export class HdlPort {
    constructor(
        public name: string, // data_in
        public dir: string,  // input, output, inout
        public type: string  // wire [7:0], logic, reg [3:0] 等 (简化处理)
    ) {}
}

/**
 * 代表一个实例化对象
 * 例如: my_sub_module u_inst (.clk(clk));
 * type = "my_sub_module"
 * name = "u_inst"
 */
export class HdlInstance {
    constructor(
        public type: string,  // 实例化的模块名 (模板)
        public name: string,  // 实例名
        public range: vscode.Range, // 代码中的位置
        public fileUri: vscode.Uri  // 所在文件
    ) {}
}

/**
 * 代表一个模块定义
 * 例如: module my_sub_module (input clk); ... endmodule
 */
export class HdlModule {
    public instances: HdlInstance[] = [];
    public ports: HdlPort[] = [];
    public params: HdlParam[] = [];
    public parent: string | null = null;
    
    constructor(
        public name: string,
        public fileUri: vscode.Uri,
        public range: vscode.Range,
        public type: HdlModuleType = HdlModuleType.Module
    ) {}

    public addInstance(inst: HdlInstance) {
        this.instances.push(inst);
    }

    public addPort(port: HdlPort) {
        this.ports.push(port);
    }

    public addParam(param: HdlParam) {
        this.params.push(param); 
    }
}