const fs = require('fs');
const path = require('path');

const workspaceRoot = process.cwd();
const configPath = path.join(workspaceRoot, '.hdl-helper', 'project.json');

function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasGlob(pattern) {
    return /[*?[\]{}]/.test(pattern);
}

function toAbsPath(base, maybeRelative) {
    return path.isAbsolute(maybeRelative) ? maybeRelative : path.join(base, maybeRelative);
}

function pushError(errors, message) {
    if (!errors.includes(message)) {
        errors.push(message);
    }
}

function validateConfig(raw, rootDir, errors) {
    if (!isObject(raw)) {
        pushError(errors, 'project.json must be a JSON object.');
        return;
    }

    if (typeof raw.version !== 'string' || raw.version.trim().length === 0) {
        pushError(errors, 'Missing required field: version');
    }
    if (typeof raw.name !== 'string' || raw.name.trim().length === 0) {
        pushError(errors, 'Missing required field: name');
    }

    if (!isObject(raw.sourceSets) || Object.keys(raw.sourceSets).length === 0) {
        pushError(errors, 'Missing required field: sourceSets');
    }

    if (!isObject(raw.targets) || Object.keys(raw.targets).length === 0) {
        pushError(errors, 'Missing required field: targets');
    }

    if (!isObject(raw.sourceSets) || !isObject(raw.targets)) {
        return;
    }

    const validTargetKinds = new Set(['design', 'simulation', 'synthesis', 'implementation']);

    for (const [setName, sourceSet] of Object.entries(raw.sourceSets)) {
        if (!isObject(sourceSet)) {
            pushError(errors, `Source set '${setName}' must be an object.`);
            continue;
        }

        if (!Array.isArray(sourceSet.includes) || sourceSet.includes.length === 0) {
            pushError(errors, `Source set '${setName}' missing required field: includes`);
            continue;
        }

        for (const includePattern of sourceSet.includes) {
            if (typeof includePattern !== 'string' || includePattern.trim().length === 0) {
                pushError(errors, `Source set '${setName}' contains invalid include pattern.`);
                continue;
            }

            if (!hasGlob(includePattern)) {
                const includePath = toAbsPath(rootDir, includePattern);
                if (!fs.existsSync(includePath)) {
                    pushError(errors, `Source set '${setName}' references missing include path: ${includePattern}`);
                }
            }
        }
    }

    for (const [targetId, target] of Object.entries(raw.targets)) {
        if (!isObject(target)) {
            pushError(errors, `Target '${targetId}' must be an object.`);
            continue;
        }

        if (typeof target.kind !== 'string' || !validTargetKinds.has(target.kind)) {
            pushError(errors, `Target '${targetId}' has invalid kind: ${String(target.kind || '')}`);
        }

        if (!Array.isArray(target.sourceSets) || target.sourceSets.length === 0) {
            pushError(errors, `Target '${targetId}' missing required field: sourceSets`);
        } else {
            for (const sourceSetName of target.sourceSets) {
                if (!raw.sourceSets[sourceSetName]) {
                    pushError(errors, `Target '${targetId}' references unknown source set: ${sourceSetName}`);
                }
            }
        }

        if (target.filelist) {
            if (typeof target.filelist !== 'string' || target.filelist.trim().length === 0) {
                pushError(errors, `Target '${targetId}' has invalid filelist value.`);
            } else {
                const filelistPath = toAbsPath(rootDir, target.filelist);
                if (!fs.existsSync(filelistPath)) {
                    pushError(errors, `Target '${targetId}' references missing filelist: ${target.filelist}`);
                }
            }
        }
    }

    if (raw.activeTarget && !raw.targets[raw.activeTarget]) {
        pushError(errors, `Active target '${raw.activeTarget}' not found in targets`);
    }
}

function main() {
    if (!fs.existsSync(configPath)) {
        console.log('[project-config-integrity] No .hdl-helper/project.json found. Skipping integrity checks.');
        process.exit(0);
    }

    let raw;
    try {
        raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
        console.error('[project-config-integrity] Failed to parse .hdl-helper/project.json');
        console.error(String(error));
        process.exit(1);
    }

    const errors = [];
    validateConfig(raw, workspaceRoot, errors);

    if (errors.length > 0) {
        console.error('[project-config-integrity] Integrity check failed with issues:');
        for (const issue of errors) {
            console.error(`  - ${issue}`);
        }
        process.exit(1);
    }

    console.log('[project-config-integrity] Integrity check passed.');
}

main();
