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

export type ToolchainProfileProbeMap = Record<string, string[]>;

const DEFAULT_PROFILE_PROBE_IDS = ['iverilog', 'vvp', 'verible-lint', 'verible-ls'];

const DEFAULT_PROFILE_PROBE_MAP: ToolchainProfileProbeMap = {
    default: [...DEFAULT_PROFILE_PROBE_IDS],
    iverilog: ['iverilog', 'vvp'],
    icarus: ['iverilog', 'vvp'],
    xsim: ['vivado', 'xvlog', 'xelab', 'xsim'],
    vivado: ['vivado', 'xvlog', 'xelab', 'xsim'],
    verilator: ['verilator'],
    modelsim: ['vlog', 'vsim'],
    questa: ['vlog', 'vsim'],
    verible: ['verible-lint', 'verible-ls']
};

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

export function normalizeToolchainProfileProbeMap(rawValue: unknown): ToolchainProfileProbeMap {
    const normalized: ToolchainProfileProbeMap = {};

    for (const [profile, probeIds] of Object.entries(DEFAULT_PROFILE_PROBE_MAP)) {
        normalized[profile] = [...probeIds];
    }

    if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
        return normalized;
    }

    for (const [profile, probeIds] of Object.entries(rawValue as Record<string, unknown>)) {
        const normalizedProfile = profile.trim().toLowerCase();
        if (!normalizedProfile || !Array.isArray(probeIds)) {
            continue;
        }

        const normalizedProbeIds = probeIds
            .filter((value): value is string => typeof value === 'string')
            .map(value => value.trim().toLowerCase())
            .filter(value => value.length > 0);

        if (normalizedProbeIds.length === 0) {
            continue;
        }

        normalized[normalizedProfile] = Array.from(new Set(normalizedProbeIds));
    }

    return normalized;
}

function resolveConfiguredProbeIdsForProfile(
    normalizedProfile: string,
    profileProbeMap: ToolchainProfileProbeMap
): string[] | undefined {
    if (profileProbeMap[normalizedProfile]) {
        return [...profileProbeMap[normalizedProfile]];
    }

    for (const [profileKey, probeIds] of Object.entries(profileProbeMap)) {
        if (profileKey === 'default') {
            continue;
        }

        if (normalizedProfile.includes(profileKey)) {
            return [...probeIds];
        }
    }

    return undefined;
}

export function resolveToolchainProbeIdsForProfile(
    profile: string,
    profileProbeMap: ToolchainProfileProbeMap = DEFAULT_PROFILE_PROBE_MAP
): string[] {
    const normalizedProfile = profile.trim().toLowerCase();
    const configuredProbeIds = resolveConfiguredProbeIdsForProfile(normalizedProfile, profileProbeMap);
    if (configuredProbeIds) {
        return configuredProbeIds;
    }

    for (const entry of PROFILE_PROBE_ID_MAP) {
        if (entry.pattern.test(normalizedProfile)) {
            return [...entry.probeIds];
        }
    }

    if (profileProbeMap.default && profileProbeMap.default.length > 0) {
        return [...profileProbeMap.default];
    }

    return [...DEFAULT_PROFILE_PROBE_IDS];
}

export function selectToolchainProbesForProfile(
    profile: string,
    probes: ToolchainProbeResult[],
    profileProbeMap?: ToolchainProfileProbeMap
): ToolchainProbeResult[] {
    const requiredProbeIds = resolveToolchainProbeIdsForProfile(profile, profileProbeMap);
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

export function resolveToolchainHealthProfileArg(arg?: unknown): string | undefined {
    if (typeof arg === 'string') {
        const normalized = arg.trim();
        return normalized.length > 0 ? normalized : undefined;
    }

    if (arg && typeof arg === 'object') {
        const profile = (arg as { profile?: unknown }).profile;
        if (typeof profile === 'string') {
            const normalized = profile.trim();
            return normalized.length > 0 ? normalized : undefined;
        }
    }

    return undefined;
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
    if (!commandOrPath || commandOrPath.trim().length === 0) {
        return false;
    }

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
    stateService: StateService,
    profileArg?: unknown
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
        const profileProbeMap = normalizeToolchainProfileProbeMap(
            config.get<unknown>('toolchain.profileProbeMap', {})
        );
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
                command: config.get<string>('simulation.modelsimVlogPath', 'vlog')
            },
            {
                id: 'vsim',
                label: 'vsim',
                command: config.get<string>('simulation.modelsimVsimPath', 'vsim')
            }
        ].map(item => ({
            ...item,
            command: (item.command || '').trim(),
            available: false
        }));

        for (const probe of probes) {
            if (!probe.command) {
                probe.available = false;
                continue;
            }
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
        const requestedProfile = resolveToolchainHealthProfileArg(profileArg);
        let profilesToCheck = [...profileNames];
        if (requestedProfile) {
            const matchedProfile = profileNames.find(
                profile => profile.toLowerCase() === requestedProfile.toLowerCase()
            );
            profilesToCheck = [matchedProfile || requestedProfile];
        }

        outputChannel.appendLine(`Workspace: ${folder.name}`);
        outputChannel.appendLine(`Root: ${folder.uri.fsPath}`);
        outputChannel.appendLine('Tool Probes:');
        for (const probe of probes) {
            const probeState = !probe.command
                ? 'invalid-setting'
                : (probe.available ? 'ok' : 'missing');
            outputChannel.appendLine(`  ${probe.label}: ${probeState} (${probe.command || '(empty)'})`);
        }

        outputChannel.appendLine('Profile Health:');
        for (const profile of profilesToCheck) {
            const requiredProbes = selectToolchainProbesForProfile(profile, probes, profileProbeMap);
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
