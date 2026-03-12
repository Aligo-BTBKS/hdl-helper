import * as fs from 'fs';
import { RegisterMap } from '../registerTypes';

export class JsonRegisterParser {
    public static parse(filePath: string): RegisterMap {
        const content = fs.readFileSync(filePath, 'utf-8');
        try {
            const map = JSON.parse(content) as RegisterMap;
            // Basic structural check
            if (!map.registers || !Array.isArray(map.registers)) {
                throw new Error("Invalid JSON structure: missing 'registers' array");
            }
            return map;
        } catch (e) {
            throw new Error(`JSON parsing failed: ${e}`);
        }
    }
}
