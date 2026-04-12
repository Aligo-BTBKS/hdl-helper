const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const workspaceRoot = process.cwd();
const fixtureRoot = path.join(workspaceRoot, 'resources', 'regression', 'fixtures');
const integrityScriptPath = path.join(__dirname, 'check-project-config-integrity.cjs');
const reportPath = path.join(workspaceRoot, 'resources', 'regression', 'FIXTURE_SANITY_REPORT_2026-04-12.md');

const requiredFixtures = [
    'pure_rtl_project',
    'rtl_tb_sva_project',
    'multi_top_project',
    'heuristic_only_project',
    'shared_file_project',
    'filelist_narrow_project'
];

function runIntegrityForFixture(fixtureDir) {
    try {
        const output = cp.execFileSync(process.execPath, [integrityScriptPath], {
            cwd: fixtureDir,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe']
        });
        return {
            ok: true,
            output: output.trim()
        };
    } catch (error) {
        const stderr = error && error.stderr ? String(error.stderr).trim() : '';
        const stdout = error && error.stdout ? String(error.stdout).trim() : '';
        return {
            ok: false,
            output: stderr || stdout || String(error)
        };
    }
}

function main() {
    const lines = [];
    const failures = [];

    lines.push('# Fixture Sanity Report (Day52)');
    lines.push('');
    lines.push('Date: 2026-04-12');
    lines.push('Scope: Iteration 6 fixture first-pass sanity');
    lines.push('');

    for (const fixtureName of requiredFixtures) {
        const fixtureDir = path.join(fixtureRoot, fixtureName);
        const fixtureConfigPath = path.join(fixtureDir, '.hdl-helper', 'project.json');
        const hasFixtureDir = fs.existsSync(fixtureDir) && fs.statSync(fixtureDir).isDirectory();

        lines.push(`## ${fixtureName}`);
        if (!hasFixtureDir) {
            lines.push('- Status: failed');
            lines.push('- Reason: fixture directory missing');
            lines.push('');
            failures.push(`${fixtureName}: missing fixture directory`);
            continue;
        }

        const hasProjectConfig = fs.existsSync(fixtureConfigPath);
        lines.push(`- Fixture directory: present`);
        lines.push(`- project.json: ${hasProjectConfig ? 'present' : 'absent'}`);

        if (fixtureName === 'heuristic_only_project') {
            if (hasProjectConfig) {
                lines.push('- Status: failed');
                lines.push('- Reason: heuristic fixture should not include project.json');
                failures.push(`${fixtureName}: unexpected project.json present`);
            } else {
                lines.push('- Status: passed');
                lines.push('- Sanity: heuristic-only contract satisfied (no project.json)');
            }
            lines.push('');
            continue;
        }

        if (!hasProjectConfig) {
            lines.push('- Status: failed');
            lines.push('- Reason: expected project.json is missing');
            lines.push('');
            failures.push(`${fixtureName}: missing project.json`);
            continue;
        }

        const integrity = runIntegrityForFixture(fixtureDir);
        if (!integrity.ok) {
            lines.push('- Status: failed');
            lines.push('- Integrity gate: failed');
            lines.push(`- Detail: ${integrity.output}`);
            failures.push(`${fixtureName}: integrity gate failed`);
        } else {
            lines.push('- Status: passed');
            lines.push('- Integrity gate: passed');
        }

        lines.push('');
    }

    lines.push('## Summary');
    if (failures.length === 0) {
        lines.push('- Overall: passed');
        lines.push('- Result: all required fixtures passed first-pass sanity checks.');
    } else {
        lines.push('- Overall: failed');
        lines.push(`- Failed count: ${failures.length}`);
        for (const failure of failures) {
            lines.push(`- ${failure}`);
        }
    }

    fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');

    if (failures.length > 0) {
        console.error('[fixture-sanity] Fixture sanity failed.');
        console.error(`[fixture-sanity] Report: ${reportPath}`);
        process.exit(1);
    }

    console.log('[fixture-sanity] Fixture sanity passed.');
    console.log(`[fixture-sanity] Report: ${reportPath}`);
}

main();
