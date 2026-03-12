import { CodeGenerator, GeneratedFile } from '../generator';
import { MemoryConfig } from './memoryTypes';

export class MemoryGenerator implements CodeGenerator<MemoryConfig> {
    public async generate(config: MemoryConfig): Promise<GeneratedFile[]> {
        const files: GeneratedFile[] = [];
        const baseName = config.moduleName;
        
        let rtlContent = '';
        if (config.memoryType === 'sync-fifo') {
            rtlContent = this.generateSyncFifo(config);
        } else if (config.memoryType === 'async-fifo') {
            rtlContent = this.generateAsyncFifo(config);
        } else {
            rtlContent = this.generateRam(config);
        }

        files.push({ relativePath: `rtl/${baseName}.sv`, content: rtlContent });
        files.push({ relativePath: `docs/${baseName}_readme.md`, content: this.generateReadme(config) });
        
        if (config.generateTb) {
            files.push({ relativePath: `tb/tb_${baseName}.sv`, content: `// Testbench for ${baseName}\nmodule tb_${baseName}();\nendmodule\n` });
        }

        return files;
    }

    private generateSyncFifo(c: MemoryConfig): string {
        const aw = Math.ceil(Math.log2(c.depth));
        return `\`timescale 1ns/1ps
module ${c.moduleName} #(
    parameter int DATA_WIDTH = ${c.dataWidth},
    parameter int DEPTH = ${c.depth}
)(
    input  logic clk,
    input  logic rst_n,
    
    // Write Interface
    input  logic wr_en,
    input  logic [DATA_WIDTH-1:0] wr_data,
    output logic full,
    
    // Read Interface
    input  logic rd_en,
    output logic [DATA_WIDTH-1:0] rd_data,
    output logic empty
);

    localparam int ADDR_WIDTH = $clog2(DEPTH);

    logic [DATA_WIDTH-1:0] mem [0:DEPTH-1];
    logic [ADDR_WIDTH:0] wr_ptr, rd_ptr;
    logic [ADDR_WIDTH:0] count;

    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            wr_ptr <= '0;
        end else if (wr_en && !full) begin
            mem[wr_ptr[ADDR_WIDTH-1:0]] <= wr_data;
            wr_ptr <= wr_ptr + 1'b1;
        end
    end

    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            rd_ptr <= '0;
            rd_data <= '0;
        end else if (rd_en && !empty) begin
            rd_data <= mem[rd_ptr[ADDR_WIDTH-1:0]];
            rd_ptr <= rd_ptr + 1'b1;
        end
    end

    assign full  = (wr_ptr[ADDR_WIDTH] != rd_ptr[ADDR_WIDTH]) && 
                   (wr_ptr[ADDR_WIDTH-1:0] == rd_ptr[ADDR_WIDTH-1:0]);
    assign empty = (wr_ptr == rd_ptr);

endmodule
`;
    }

    private generateAsyncFifo(c: MemoryConfig): string {
        return `// Async FIFO skeleton for ${c.moduleName}\nmodule ${c.moduleName} (\n  // CDC synchronization logic to be added\n);\nendmodule\n`;
    }

    private generateRam(c: MemoryConfig): string {
        return `// RAM template for ${c.memoryType} ${c.moduleName}\nmodule ${c.moduleName} (\n  // Parameterized depth: ${c.depth}\n  // Data width: ${c.dataWidth}\n);\nendmodule\n`;
    }

    private generateReadme(c: MemoryConfig): string {
        return `# ${c.moduleName}\nGenerated Memory IP.\n- Type: ${c.memoryType}\n- Width: ${c.dataWidth}\n- Depth: ${c.depth}`;
    }
}
