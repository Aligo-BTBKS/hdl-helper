import { RegisterMap } from '../registerTypes';

export function emitCHeader(map: RegisterMap): string {
    const lines: string[] = [];
    const guard = `__${map.moduleName.toUpperCase()}_REGS_H__`;
    
    lines.push(`#ifndef ${guard}`);
    lines.push(`#define ${guard}\n`);

    lines.push(`/* Generated Register Map for ${map.moduleName} */`);
    lines.push(`/* Data Width: ${map.dataWidth} */\n`);

    map.registers.forEach(reg => {
        const base = `_${map.moduleName.toUpperCase()}_${reg.name.toUpperCase()}`;
        lines.push(`#define ${base}_OFFSET 0x${reg.offset.toString(16)}`);
        
        reg.fields.forEach(field => {
            lines.push(`#define ${base}_${field.name.toUpperCase()}_BIT_OFFSET ${field.bitOffset}`);
            lines.push(`#define ${base}_${field.name.toUpperCase()}_BIT_WIDTH ${field.bitWidth}`);
            const mask = ((1 << field.bitWidth) - 1) << field.bitOffset;
            lines.push(`#define ${base}_${field.name.toUpperCase()}_MASK 0x${mask.toString(16)}`);
        });
        lines.push('');
    });

    lines.push(`#endif /* ${guard} */`);
    return lines.join('\n');
}
