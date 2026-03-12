export interface AxiConfig {
    moduleName: string;
    protocol: 'axi4-lite' | 'axi4-full' | 'axi4-stream';
    role: 'master' | 'slave' | 'both' | 'interface-only';
    dataWidth: number;
    addrWidth?: number;
    idWidth?: number;
    userWidth?: number;
    registerCount?: number;
    generateTb: boolean;
    outputDir: string;
}
