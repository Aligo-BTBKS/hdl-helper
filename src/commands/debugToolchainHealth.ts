import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import { ProjectConfigService } from '../project/projectConfigService';
import { StateService } from '../project/stateService';
import { NormalizedProjectConfig, ToolchainStatus } from '../project/types';

export interface ToolchainProbeResult {
    id: string;
    label: string;
    command: string;
    available: boolean;
}

const DEFAULT_PROFILE_PROBE_IDS = ['iverilog', 'vvp', 'verible-lint', 'verible-ls'];

const PROFILE_PROBE_ID_MAP: Array<{ pattern: RegExp; probeIds: string[] }> = [
    { pattern: /^(default)$/i, probeIds: DEFAULT_PROFILE_PROBE_IDS },
    { pattern: /(iverilog|icarus)/i, probeIds: ['iverilog', 'vvp'] },
    { pattern: /(xsim|vivado)/i, probeIds: ['vivado', 'xvlog', 'xelab', 'xsim'] },
    { pattern: /(verilator)/i, probeIds: ['verilator'] },
    { pattern: /(modelsim|questa)/i, probeIds: ['vlog', 'vsim'] },
    { pattern: /(verible)/i, probeIds: ['verible-lint', 'verible-ls'] }
];

const PROBE_FALLBACK_DEFINITIONS: Record<string, { label: string; command: string }> = {
    'iverilog': { label: 'iverilog', command: 'iverilog' },
    'vvp': { label: 'vvp', command: 'vvp' },
    'verible-lint': { label: 'verible-verilog-lint', command: 'verible-verilog-lint' },
    'verible-ls': { label: 'verible-verilog-ls', command: 'verible-verilog-ls' },
    'verilator': { label: 'verilator', command: 'verilator' },
    'xvlog': { label: 'xvlog', command: 'xvlog' },
    'xelab': { label: 'xelab', command: 'xelab' },
    'xsim': { label: 'xsim', command: 'xsim' },
    'vivado': { label: 'vivado', command: 'vivado' },
    'vlog': { label: 'vlog', command: 'vlog' },
    'vsim': { label: 'vsim', command: 'vsim' }
};

export function resolveToolchainProbeIdsForProfile(profile: string): string[] {
    const normalizedProfile = profile.trim().toLowerCase();
    for (const entry of PROFILE_PROBE_ID_MAP) {
        if (entry.pattern.test(normalizedProfile)) {
            return [...entry.probeIds];
        }
    }

    return [...DEFAULT_PROFILE_PROBE_IDS];
}

export function selectToolchainProbesForProfile(
    profile: string,
    probes: ToolchainProbeResult[]
): ToolchainProbeResult[] {
    const requiredProbeIds = resolveToolchainProbeIdsForProfile(profile);
    const probeById = new Map(probes.map(probe => [probe.id, probe]));

    return requiredProbeIds.map(probeId => {
        const existingProbe = probeById.get(probeId);
        if (existingProbe) {
            return existingProbe;
        }

        const fallback = PROBE_FALLBACK_DEFINITIONS[probeId] || {
            label: probeId,
            command: probeId
        };

        return {
            id: probeId,
            label: fallback.label,
            command: fallback.command,
            available: false
        };
    });
}

export function collectToolchainProfileNames(config?: NormalizedProjectConfig): string[] {
    const names = new Set<string>(['default']);

    if (config) {
        for (const target of Object.values(config.targets)) {
            if (target.toolProfile) {
                names.add(target.toolProfile);
            }
        }
    }

    return Array.from(names).sort((a, b) => a.localeCompare(b));
}

export function buildToolchainStatusForProfile(
    profile: string,
    probes: ToolchainProbeResult[],
    lastChecked = Date.now()
): ToolchainStatus {
    const missingTools = probes
        .filter(probe => !probe.available)
        .map(probe => probe.label)
        .sort((a, b) => a.localeCompare(b));

    return {
        profile,
        available: missingTools.length === 0,
        missingTools,
        lastChecked
    };
}

async function execCommand(command: string, cwd: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        cp.exec(command, { cwd }, error => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

async function probeCommandAvailability(commandOrPath: string, cwd: string): Promise<boolean> {
    const hasSlash = commandOrPath.includes('/') || commandOrPath.includes('\\');
    if (path.isAbsolute(commandOrPath) || hasSlash) {
        if (fs.existsSync(commandOrPath)) {
            return true;
        }
        if (process.platform === 'win32' && !commandOrPath.toLowerCase().endsWith('.exe')) {
            return fs.existsSync(`${commandOrPath}.exe`);
        }
        return false;
    }

    const probeCommand = process.platform === 'win32'
        ? `where ${commandOrPath}`
        : `command -v ${commandOrPath}`;

    try {
        await execCommand(probeCommand, cwd);
        return true;
    } catch {
        return false;
    }
}

export async function debugToolchainHealthByProfile(
    outputChannel: vscode.OutputChannel,
    stateService: StateService
): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showWarningMessage('No workspace folder open');
        return;
    }

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine('='.repeat(80));
    outputChannel.appendLine('HDL Helper - Toolchain Health By Profile');
    outputChannel.appendLine('='.repeat(80));
    outputChannel.appendLine('');

    for (const folder of workspaceFolders) {
        const config = vscode.workspace.getConfiguration('hdl-helper', folder.uri);
        const probes: ToolchainProbeResult[] = [
            {
                id: 'iverilog',
                label: 'iverilog',
                command: config.get<string>('simulation.iverilogPath', 'iverilog')
            },
            {
                id: 'vvp',
                label: 'vvp',
                command: config.get<string>('simulation.vvpPath', 'vvp')
            },
            {
                id: 'verible-lint',
                label: 'verible-verilog-lint',
                command: config.get<string>('linter.veriblePath', 'verible-verilog-lint')
            },
            {
                id: 'verible-ls',
                label: 'verible-verilog-ls',
                command: config.get<string>('languageServer.path', 'verible-verilog-ls')
            },
            {
                id: 'verilator',
                label: 'verilator',
                command: config.get<string>('linter.verilatorPath', 'verilator')
            },
            {
                id: 'xvlog',
                label: 'xvlog',
                command: config.get<string>('linter.executablePath', 'xvlog')
            },
            {
                id: 'xelab',
                label: 'xelab',
                command: 'xelab'
            },
            {
                id: 'xsim',
                label: 'xsim',
                command: 'xsim'
            },
            {
                id: 'vivado',
                label: 'vivado',
                command: 'vivado'
            },
            {
                id: 'vlog',
                label: 'vlog',
                command: 'vlog'
            },
            {
                id: 'vsim',
                label: 'vsim',
                command: 'vsim'
            }
        ].map(item => ({ ...item, available: false }));

        for (const probe of probes) {
            probe.available = await probeCommandAvailability(probe.command, folder.uri.fsPath);
        }

        const projectConfigEnabled = config.get<boolean>('projectConfig.enabled', false);
        let projectConfig: NormalizedProjectConfig | undefined;
        if (projectConfigEnabled) {
            const configService = new ProjectConfigService(folder.uri.fsPath);
            projectConfig = await configService.loadConfig();
            configService.dispose();
        }

        const profileNames = collectToolchainProfileNames(projectConfig);

        outputChannel.appendLine(`Workspace: ${folder.name}`);
        outputChannel.appendLine(`Root: ${folder.uri.fsPath}`);
        outputChannel.appendLine('Tool Probes:');
        for (const probe of probes) {
            outputChannel.appendLine(`  ${probe.label}: ${probe.available ? 'ok' : 'missing'} (${probe.command})`);
        }

        outputChannel.appendLine('Profile Health:');
        for (const profile of profileNames) {
            const requiredProbes = selectToolchainProbesForProfile(profile, probes);
            const status = buildToolchainStatusForProfile(profile, requiredProbes);
            await stateService.setToolchainStatus(profile, status);
            outputChannel.appendLine(
                `  ${profile}: ${status.available ? 'ok' : 'degraded'} | checked=${requiredProbes.map(probe => probe.label).join(', ')} | missing=${status.missingTools.length > 0 ? status.missingTools.join(', ') : '(none)'}`
            );
        }

        outputChannel.appendLine('-'.repeat(80));
    }

    outputChannel.appendLine('');
    outputChannel.appendLine('='.repeat(80));
    outputChannel.appendLine('Toolchain health debug complete');
    outputChannel.appendLine('='.repeat(80));
}
