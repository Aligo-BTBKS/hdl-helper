export interface RegisterField {
    name: string;
    bitOffset: number;
    bitWidth: number;
    access: 'ro' | 'rw' | 'wo' | 'w1c' | 'rc';
    resetValue?: number;
    description?: string;
}

export interface RegisterDef {
    name: string;
    offset: number;
    description?: string;
    fields: RegisterField[];
}

export interface RegisterMap {
    moduleName: string;
    dataWidth: number;
    registers: RegisterDef[];
}

export interface RegisterGenConfig {
    moduleName: string;
    busType: 'axi-lite';
    inputFile: string;
    outputDir: string;
    generateSv: boolean;
    generateCHeader: boolean;
    generateMarkdown: boolean;
}
