const fs = require('fs');
const path = require('path');

const workspaceRoot = process.cwd();
const fixtureRoot = path.join(workspaceRoot, 'resources', 'regression', 'fixtures');

const requiredFixtures = [
    'pure_rtl_project',
    'rtl_tb_sva_project',
    'multi_top_project',
    'heuristic_only_project',
    'shared_file_project',
    'filelist_narrow_project'
];

const requiredChecklistTokens = [
    'sources grouping',
    'hierarchy roots',
    'target context resolution',
    'run resolution',
    'diagnostics behavior'
];

function pushUnique(errors, message) {
    if (!errors.includes(message)) {
        errors.push(message);
    }
}

function main() {
    const errors = [];

    if (!fs.existsSync(fixtureRoot)) {
        pushUnique(errors, `Fixture root directory is missing: ${fixtureRoot}`);
    }

    for (const fixtureName of requiredFixtures) {
        const fixtureDir = path.join(fixtureRoot, fixtureName);
        const fixtureReadme = path.join(fixtureDir, 'README.md');

        if (!fs.existsSync(fixtureDir) || !fs.statSync(fixtureDir).isDirectory()) {
            pushUnique(errors, `Missing required fixture directory: resources/regression/fixtures/${fixtureName}`);
            continue;
        }

        if (!fs.existsSync(fixtureReadme)) {
            pushUnique(errors, `Missing fixture README: resources/regression/fixtures/${fixtureName}/README.md`);
            continue;
        }

        let readmeContent = '';
        try {
            readmeContent = fs.readFileSync(fixtureReadme, 'utf8').toLowerCase();
        } catch {
            pushUnique(errors, `Unable to read fixture README: resources/regression/fixtures/${fixtureName}/README.md`);
            continue;
        }

        const missingTokens = requiredChecklistTokens.filter(token => !readmeContent.includes(token));
        if (missingTokens.length > 0) {
            pushUnique(
                errors,
                `Fixture '${fixtureName}' README missing checklist coverage tokens: ${missingTokens.join(', ')}`
            );
        }
    }

    if (errors.length > 0) {
        console.error('[fixture-matrix] Fixture matrix check failed with issues:');
        for (const issue of errors) {
            console.error(`  - ${issue}`);
        }
        process.exit(1);
    }

    console.log('[fixture-matrix] Fixture matrix check passed.');
}

main();
