import { RegisterMap } from '../registerTypes';

export function emitSystemVerilog(map: RegisterMap): string {
    const lines: string[] = [];
    lines.push(`// Generated AXI-Lite Slave Register Map for ${map.moduleName}`);
    lines.push(`module ${map.moduleName} #(\n    parameter int AXI_DATA_WIDTH = ${map.dataWidth}\n)(`);
    lines.push(`    // AXI-Lite Interface signals...`);
    lines.push(`);`);
    
    // Generate simple localparams for offsets
    lines.push(``);
    lines.push(`    // Register Offsets`);
    map.registers.forEach(reg => {
        lines.push(`    localparam int ADDR_${reg.name.toUpperCase()} = 'h${reg.offset.toString(16)};`);
    });

    lines.push(``);
    lines.push(`    // Register declarations`);
    map.registers.forEach(reg => {
        lines.push(`    logic [AXI_DATA_WIDTH-1:0] reg_${reg.name.toLowerCase()};`);
    });

    lines.push(`\n    // TODO: Implement Write/Read AXI logic matching offsets...`);
    lines.push(`endmodule`);
    
    return lines.join('\n');
}
