import { CodeGenerator, GeneratedFile } from '../generator';
import { AxiConfig } from './axiTypes';
import { AxiLiteGenerator } from './axiLiteGenerator';
import { AxiStreamGenerator } from './axiStreamGenerator';
import { AxiFullGenerator } from './axiFullGenerator';

export class AxiGenerator implements CodeGenerator<AxiConfig> {
    public async generate(config: AxiConfig): Promise<GeneratedFile[]> {
        if (config.protocol === 'axi4-lite') {
            return new AxiLiteGenerator().generate(config);
        } else if (config.protocol === 'axi4-stream') {
            return new AxiStreamGenerator().generate(config);
        } else if (config.protocol === 'axi4-full') {
            return new AxiFullGenerator().generate(config);
        }
        return [];
    }
}
