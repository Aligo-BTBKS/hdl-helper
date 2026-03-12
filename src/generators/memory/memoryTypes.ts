export type MemoryKind = 'sync-fifo' | 'async-fifo' | 'sp-ram' | 'dp-ram' | 'simple-dual-port-ram';

export interface MemoryConfig {
    moduleName: string;
    memoryType: MemoryKind;
    dataWidth: number;
    depth: number;
    addrWidth?: number;
    generateTb: boolean;
    almostFullEmpty?: boolean;
    byteEnable?: boolean;
    outputRegister?: boolean;
    outputDir: string;
}
