const fs = require('fs');
const path = require('path');

const workspaceRoot = process.cwd();
const packageJsonPath = path.join(workspaceRoot, 'package.json');
const extensionPath = path.join(workspaceRoot, 'src', 'extension.ts');
const testsPath = path.join(workspaceRoot, 'src', 'test', 'extension.test.ts');
const reportPath = path.join(workspaceRoot, 'resources', 'regression', 'DEBUG_COMMANDS_SANITY_REPORT_2026-04-12.md');

const requiredCommands = [
    {
        id: 'hdl-helper.debugProjectClassification',
        title: 'HDL: Debug Current Project Classification',
        testToken: 'buildClassificationDebugSections'
    },
    {
        id: 'hdl-helper.debugActiveTargetContext',
        title: 'HDL: Debug Active Target Context',
        testToken: 'Active target context debug snapshot reports invalid activeTarget fallback'
    },
    {
        id: 'hdl-helper.debugRecentRunsByTarget',
        title: 'HDL: Debug Recent Runs By Target',
        testToken: 'formatRunRecords('
    },
    {
        id: 'hdl-helper.debugToolchainHealthByProfile',
        title: 'HDL: Debug Toolchain Health By Profile',
        testToken: 'buildToolchainStatusForProfile'
    }
];

function readText(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function pushUnique(errors, message) {
    if (!errors.includes(message)) {
        errors.push(message);
    }
}

function hasCommandContribution(packageJson, commandId) {
    const commands = packageJson && packageJson.contributes && Array.isArray(packageJson.contributes.commands)
        ? packageJson.contributes.commands
        : [];
    return commands.some(command => command && command.command === commandId);
}

function hasCommandRegistration(extensionSource, commandId) {
    return extensionSource.includes(`registerCommand('${commandId}'`);
}

function main() {
    const errors = [];
    const lines = [];

    if (!fs.existsSync(packageJsonPath)) {
        pushUnique(errors, `Missing file: ${packageJsonPath}`);
    }
    if (!fs.existsSync(extensionPath)) {
        pushUnique(errors, `Missing file: ${extensionPath}`);
    }
    if (!fs.existsSync(testsPath)) {
        pushUnique(errors, `Missing file: ${testsPath}`);
    }

    if (errors.length > 0) {
        for (const error of errors) {
            console.error(`[debug-commands-sanity] ${error}`);
        }
        process.exit(1);
    }

    const packageJson = JSON.parse(readText(packageJsonPath));
    const extensionSource = readText(extensionPath);
    const testSource = readText(testsPath);

    lines.push('# Debug Commands Sanity Report (Day53)');
    lines.push('');
    lines.push('Date: 2026-04-12');
    lines.push('Scope: Iteration 6 debug command sanity evidence');
    lines.push('');

    for (const command of requiredCommands) {
        const contributed = hasCommandContribution(packageJson, command.id);
        const registered = hasCommandRegistration(extensionSource, command.id);
        const tested = testSource.includes(command.testToken);

        lines.push(`## ${command.title}`);
        lines.push(`- Command ID: ${command.id}`);
        lines.push(`- Contributed: ${contributed ? 'yes' : 'no'}`);
        lines.push(`- Registered in extension: ${registered ? 'yes' : 'no'}`);
        lines.push(`- Test evidence token: ${tested ? 'yes' : 'no'} (${command.testToken})`);

        if (!contributed) {
            pushUnique(errors, `${command.id}: command contribution missing in package.json`);
        }
        if (!registered) {
            pushUnique(errors, `${command.id}: command registration missing in src/extension.ts`);
        }
        if (!tested) {
            pushUnique(errors, `${command.id}: test evidence token missing in src/test/extension.test.ts`);
        }

        lines.push(`- Status: ${contributed && registered && tested ? 'passed' : 'failed'}`);
        lines.push('');
    }

    lines.push('## Summary');
    if (errors.length > 0) {
        lines.push('- Overall: failed');
        lines.push(`- Failed checks: ${errors.length}`);
        for (const error of errors) {
            lines.push(`- ${error}`);
        }
    } else {
        lines.push('- Overall: passed');
        lines.push('- Result: all debug commands are contributed, registered, and covered by test evidence tokens.');
    }

    fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');

    if (errors.length > 0) {
        console.error('[debug-commands-sanity] Debug command sanity failed.');
        console.error(`[debug-commands-sanity] Report: ${reportPath}`);
        process.exit(1);
    }

    console.log('[debug-commands-sanity] Debug command sanity passed.');
    console.log(`[debug-commands-sanity] Report: ${reportPath}`);
}

main();
