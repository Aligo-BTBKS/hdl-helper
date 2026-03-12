import { CodeGenerator, GeneratedFile } from '../generator';
import { AxiConfig } from './axiTypes';

export class AxiLiteGenerator implements CodeGenerator<AxiConfig> {
    public async generate(config: AxiConfig): Promise<GeneratedFile[]> {
        const files: GeneratedFile[] = [];
        const baseName = config.moduleName;
        
        if (config.role === 'slave' || config.role === 'both') {
            files.push({ relativePath: `rtl/${baseName}_slave.sv`, content: this.generateSlave(config) });
        }
        if (config.role === 'master' || config.role === 'both') {
            files.push({ relativePath: `rtl/${baseName}_master.sv`, content: this.generateMaster(config) });
        }
        if (config.role === 'interface-only') {
            files.push({ relativePath: `rtl/${baseName}_if.sv`, content: this.generateInterface(config) });
        }
        if (config.generateTb) {
            files.push({ relativePath: `tb/tb_${baseName}.sv`, content: this.generateTb(config) });
        }

        files.push({ relativePath: `docs/${baseName}_readme.md`, content: this.generateReadme(config) });
        return files;
    }

    private generateSlave(c: AxiConfig): string {
        const aw = c.addrWidth || 16;
        const dw = c.dataWidth || 32;
        const sw = dw / 8;
        return `\`timescale 1ns / 1ps

module ${c.moduleName}_slave #(
    parameter integer C_S_AXI_DATA_WIDTH = ${dw},
    parameter integer C_S_AXI_ADDR_WIDTH = ${aw}
)
(
    // Global Clock Signal
    input wire  S_AXI_ACLK,
    // Global Reset Signal. This Signal is Active LOW
    input wire  S_AXI_ARESETN,

    // Write address channel
    input wire [C_S_AXI_ADDR_WIDTH-1 : 0] S_AXI_AWADDR,
    input wire [2 : 0] S_AXI_AWPROT,
    input wire  S_AXI_AWVALID,
    output wire  S_AXI_AWREADY,

    // Write data channel
    input wire [C_S_AXI_DATA_WIDTH-1 : 0] S_AXI_WDATA,
    input wire [(C_S_AXI_DATA_WIDTH/8)-1 : 0] S_AXI_WSTRB,
    input wire  S_AXI_WVALID,
    output wire  S_AXI_WREADY,

    // Write response channel
    output wire [1 : 0] S_AXI_BRESP,
    output wire  S_AXI_BVALID,
    input wire  S_AXI_BREADY,

    // Read address channel
    input wire [C_S_AXI_ADDR_WIDTH-1 : 0] S_AXI_ARADDR,
    input wire [2 : 0] S_AXI_ARPROT,
    input wire  S_AXI_ARVALID,
    output wire  S_AXI_ARREADY,

    // Read data channel
    output wire [C_S_AXI_DATA_WIDTH-1 : 0] S_AXI_RDATA,
    output wire [1 : 0] S_AXI_RRESP,
    output wire  S_AXI_RVALID,
    input wire  S_AXI_RREADY
);

    // Provide a standardized AXI4-Lite Slave Implementation Skeleton
    // TODO: Implement custom register mapping here

    assign S_AXI_AWREADY = 1'b1;
    assign S_AXI_WREADY  = 1'b1;
    assign S_AXI_BRESP   = 2'b00;
    assign S_AXI_BVALID  = 1'b0;
    
    assign S_AXI_ARREADY = 1'b1;
    assign S_AXI_RDATA   = {C_S_AXI_DATA_WIDTH{1'b0}};
    assign S_AXI_RRESP   = 2'b00;
    assign S_AXI_RVALID  = 1'b0;

endmodule
`;
    }

    private generateMaster(c: AxiConfig): string {
        return `// AXI4-Lite Master Skeleton for ${c.moduleName}\n// ...`;
    }

    private generateInterface(c: AxiConfig): string {
        return `// SystemVerilog AXI4-Lite Interface for ${c.moduleName}\ninterface ${c.moduleName}_if #( parameter DW=${c.dataWidth}, parameter AW=${c.addrWidth} ) ();\n  logic [AW-1:0] awaddr;\n  // ...\nendinterface`;
    }

    private generateTb(c: AxiConfig): string {
        return `\`timescale 1ns/1ps\nmodule tb_${c.moduleName}();\n  // Testbench template\nendmodule\n`;
    }

    private generateReadme(c: AxiConfig): string {
        return `# ${c.moduleName}\nGenerated AXI4-Lite wrapper.\n- Protocol: AXI4-Lite\n- Data Width: ${c.dataWidth}\n`;
    }
}
