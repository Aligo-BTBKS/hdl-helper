import { CodeGenerator, GeneratedFile } from '../generator';
import { AxiConfig } from './axiTypes';

export class AxiStreamGenerator implements CodeGenerator<AxiConfig> {
    public async generate(config: AxiConfig): Promise<GeneratedFile[]> {
        const files: GeneratedFile[] = [];
        const baseName = config.moduleName;
        
        files.push({
            relativePath: `rtl/${baseName}_stream.sv`,
            content: `// AXI4-Stream Skeleton\nmodule ${baseName} #(\n  parameter int TDATA_WIDTH = ${config.dataWidth}\n) (\n  input logic clk,\n  input logic rst_n,\n  // Master\n  output logic [TDATA_WIDTH-1:0] m_tdata,\n  output logic m_tvalid,\n  input  logic m_tready,\n  output logic m_tlast\n);\nendmodule`
        });

        return files;
    }
}
