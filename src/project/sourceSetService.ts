/**
 * Source set resolution service.
 *
 * Responsible for deterministic file resolution by source set includes/excludes.
 */

import * as fs from 'fs';
import * as path from 'path';
import { NormalizedProjectConfig } from './types';

export class SourceSetService {
    private workspaceRoot: string;
    private projectConfig?: NormalizedProjectConfig;
    private workspaceFilesCache?: string[];
    private sourceSetFilesCache = new Map<string, string[]>();

    constructor(workspaceRoot: string, projectConfig?: NormalizedProjectConfig) {
        this.workspaceRoot = workspaceRoot;
        this.projectConfig = projectConfig;
    }

    public updateProjectConfig(projectConfig?: NormalizedProjectConfig): void {
        this.projectConfig = projectConfig;
        this.clearCache();
    }

    public clearCache(): void {
        this.workspaceFilesCache = undefined;
        this.sourceSetFilesCache.clear();
    }

    public resolveFilesForSourceSets(sourceSetNames: string[]): string[] {
        if (!this.projectConfig) {
            return [];
        }

        const files = new Set<string>();
        for (const setName of sourceSetNames) {
            this.resolveSourceSetFiles(setName).forEach(filePath => files.add(filePath));
        }

        return Array.from(files).sort((a, b) => a.localeCompare(b));
    }

    public resolveSourceSetFiles(setName: string): string[] {
        if (!this.projectConfig) {
            return [];
        }

        const cached = this.sourceSetFilesCache.get(setName);
        if (cached) {
            return cached;
        }

        const sourceSet = this.projectConfig.sourceSets[setName];
        if (!sourceSet) {
            return [];
        }

        const workspaceFiles = this.getWorkspaceFiles();
        const resolved = workspaceFiles.filter(filePath => {
            const relPath = this.toRelativePath(filePath);
            const included = sourceSet.includes.some(pattern => this.matchesPattern(relPath, filePath, pattern));
            if (!included) {
                return false;
            }

            if (!sourceSet.excludes || sourceSet.excludes.length === 0) {
                return true;
            }

            return !sourceSet.excludes.some(pattern => this.matchesPattern(relPath, filePath, pattern));
        });

        this.sourceSetFilesCache.set(setName, resolved);
        return resolved;
    }

    private getWorkspaceFiles(): string[] {
        if (this.workspaceFilesCache) {
            return this.workspaceFilesCache;
        }

        const result: string[] = [];
        const stack: string[] = [this.workspaceRoot];
        const ignored = new Set(['.git', 'node_modules', 'out', '.vscode-test']);

        while (stack.length > 0) {
            const current = stack.pop() as string;
            let entries: fs.Dirent[];

            try {
                entries = fs.readdirSync(current, { withFileTypes: true });
            } catch {
                continue;
            }

            for (const entry of entries) {
                const fullPath = path.join(current, entry.name);
                if (entry.isDirectory()) {
                    if (ignored.has(entry.name)) {
                        continue;
                    }
                    stack.push(fullPath);
                    continue;
                }

                if (entry.isFile()) {
                    result.push(path.normalize(fullPath));
                }
            }
        }

        this.workspaceFilesCache = result;
        return result;
    }

    private toRelativePath(filePath: string): string {
        return path.relative(this.workspaceRoot, filePath).replace(/\\/g, '/');
    }

    private matchesPattern(relativePath: string, absolutePath: string, pattern: string): boolean {
        const normalizedPattern = pattern.replace(/\\/g, '/');
        const normalizedRelative = relativePath.replace(/\\/g, '/');
        const normalizedAbsolute = absolutePath.replace(/\\/g, '/');

        if (normalizedPattern.startsWith('/')) {
            return this.globMatch(normalizedAbsolute, normalizedPattern);
        }

        return this.globMatch(normalizedRelative, normalizedPattern)
            || this.globMatch(normalizedAbsolute, normalizedPattern);
    }

    private globMatch(targetPath: string, pattern: string): boolean {
        if (!pattern) {
            return false;
        }

        const parts = pattern.split(/(\*\*\/|\*\*|\*|\?)/g);
        const regex = parts.map(part => {
            if (part === '**/') {
                return '(?:.*/)?';
            }
            if (part === '**') {
                return '.*';
            }
            if (part === '*') {
                return '[^/]*';
            }
            if (part === '?') {
                return '[^/]';
            }
            return part.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        }).join('');

        return new RegExp(`^${regex}$`).test(targetPath);
    }
}
