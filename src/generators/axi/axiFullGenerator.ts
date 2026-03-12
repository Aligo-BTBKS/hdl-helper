import { CodeGenerator, GeneratedFile } from '../generator';
import { AxiConfig } from './axiTypes';

export class AxiFullGenerator implements CodeGenerator<AxiConfig> {
    public async generate(config: AxiConfig): Promise<GeneratedFile[]> {
        const files: GeneratedFile[] = [];
        const baseName = config.moduleName;
        files.push({
            relativePath: `rtl/${baseName}_full.sv`,
            content: `// AXI4-Full Skeleton\nmodule ${baseName} (\n  // TBD\n);\nendmodule`
        });
        return files;
    }
}
