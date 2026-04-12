/**
 * Source set resolution service.
 *
 * Responsible for deterministic file resolution by source set includes/excludes.
 */

import * as fs from 'fs';
import * as path from 'path';
import { NormalizedProjectConfig, Role } from './types';

export interface SourceSetRoleSnapshot {
    rolePrimary: Role;
    roleSecondary: Role[];
    referencedBySourceSets: string[];
}

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

    public getMatchedSourceSetsForFile(filePath: string): string[] {
        if (!this.projectConfig) {
            return [];
        }

        const absolutePath = path.isAbsolute(filePath)
            ? path.normalize(filePath)
            : path.normalize(path.join(this.workspaceRoot, filePath));
        const relativePath = this.toRelativePath(absolutePath);
        const matched: string[] = [];

        for (const [setName, sourceSet] of Object.entries(this.projectConfig.sourceSets)) {
            if (this.matchesSourceSet(relativePath, absolutePath, sourceSet.includes, sourceSet.excludes)) {
                matched.push(setName);
            }
        }

        return matched;
    }

    public getRoleSnapshotForFile(filePath: string): SourceSetRoleSnapshot | undefined {
        if (!this.projectConfig) {
            return undefined;
        }

        const matchedSets = this.getMatchedSourceSetsForFile(filePath);
        if (matchedSets.length === 0) {
            return undefined;
        }

        let rolePrimary: Role = Role.Unassigned;
        const roleSecondary: Role[] = [];

        for (const setName of matchedSets) {
            const role = this.projectConfig.sourceSets[setName]?.role;
            if (!role) {
                continue;
            }

            if (rolePrimary === Role.Unassigned) {
                rolePrimary = role;
                continue;
            }

            if (role !== rolePrimary && !roleSecondary.includes(role)) {
                roleSecondary.push(role);
            }
        }

        return {
            rolePrimary,
            roleSecondary,
            referencedBySourceSets: matchedSets
        };
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
            return this.matchesSourceSet(relPath, filePath, sourceSet.includes, sourceSet.excludes);
        });

        this.sourceSetFilesCache.set(setName, resolved);
        return resolved;
    }

    private matchesSourceSet(
        relativePath: string,
        absolutePath: string,
        includes: string[],
        excludes?: string[]
    ): boolean {
        const included = includes.some(pattern => this.matchesPattern(relativePath, absolutePath, pattern));
        if (!included) {
            return false;
        }

        if (!excludes || excludes.length === 0) {
            return true;
        }

        return !excludes.some(pattern => this.matchesPattern(relativePath, absolutePath, pattern));
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
