import { CodeGenerator, GeneratedFile } from '../generator';
import { RegisterGenConfig, RegisterMap } from './registerTypes';
import { JsonRegisterParser } from './parsers/jsonRegisterParser';
import { CsvRegisterParser } from './parsers/csvRegisterParser';
import { RegisterValidator } from './validators/registerValidator';
import { emitSystemVerilog } from './emitters/emitSystemVerilog';
import { emitCHeader } from './emitters/emitCHeader';
import { emitMarkdown } from './emitters/emitMarkdown';
import * as vscode from 'vscode';

export class RegisterGenerator implements CodeGenerator<RegisterGenConfig> {
    public async generate(config: RegisterGenConfig): Promise<GeneratedFile[]> {
        const files: GeneratedFile[] = [];
        let map: RegisterMap;

        try {
            if (config.inputFile.toLowerCase().endsWith('.json')) {
                map = JsonRegisterParser.parse(config.inputFile);
            } else if (config.inputFile.toLowerCase().endsWith('.csv')) {
                map = CsvRegisterParser.parse(config.inputFile);
            } else {
                throw new Error('Unsupported file extension. Only .json and .csv are supported.');
            }
        } catch (e) {
            vscode.window.showErrorMessage(`Failed to parse register map: ${e}`);
            return [];
        }

        const validation = RegisterValidator.validate(map);
        if (!validation.isValid) {
            const errorMsg = validation.errors.join('\n');
            vscode.window.showErrorMessage(`Register map validation failed:\n${errorMsg}`);
            return [];
        }

        if (validation.warnings.length > 0) {
            vscode.window.showWarningMessage(`Register map warnings:\n${validation.warnings.join('\n')}`);
        }

        const baseName = map.moduleName;

        if (config.generateSv) {
            files.push({ relativePath: `rtl/${baseName}_regs.sv`, content: emitSystemVerilog(map) });
        }
        
        if (config.generateCHeader) {
            files.push({ relativePath: `c_header/${baseName}.h`, content: emitCHeader(map) });
        }

        if (config.generateMarkdown) {
            files.push({ relativePath: `docs/${baseName}_regs.md`, content: emitMarkdown(map) });
        }

        // Also emit a summarized JSON for external tooling
        files.push({ relativePath: `docs/${baseName}_summary.json`, content: JSON.stringify(map, null, 2) });

        return files;
    }
}
