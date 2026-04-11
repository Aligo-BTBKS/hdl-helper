/**
 * Bug Condition Exploration Tests for targetContextService
 * 
 * These tests verify bug conditions and expected behaviors for the
 * doc-implementation-inconsistency-fix bugfix spec.
 * 
 * Test Status:
 * - Bug Condition C1 tests are EXPECTED TO FAIL on unfixed code
 * - Failure confirms the bug exists (missing diagnostic emission)
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { TargetContextService } from './targetContextService';
import { NormalizedProjectConfig, Role, TargetKind } from './types';

suite('Bug Condition C1: Invalid ActiveTarget Without Fallback Diagnostics', () => {
    let diagnosticCollection: vscode.DiagnosticCollection;

    setup(() => {
        // Create a diagnostic collection for target context warnings
        diagnosticCollection = vscode.languages.createDiagnosticCollection('hdl-helper-target-context');
    });

    teardown(() => {
        diagnosticCollection.clear();
        diagnosticCollection.dispose();
    });

    /**
     * Property 1: Bug Condition - Invalid ActiveTarget Without Fallback
     * 
     * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
     * 
     * This test encodes the EXPECTED behavior from bugfix.md section 2.1-2.4:
     * - When activeTarget is invalid, system SHALL fallback to first valid target (2.1)
     * - When no valid targets exist, system SHALL fallback to heuristic context (2.2)
     * - When fallback occurs, system SHALL emit warning diagnostic (2.3)
     * - When all fallbacks fail, system SHALL return undefined and emit error diagnostic (2.4)
     * 
     * **CRITICAL**: This test is EXPECTED TO FAIL on unfixed code.
     * The current implementation has fallback logic but does NOT emit diagnostics.
     * 
     * **Scoped PBT Approach**: Testing concrete failing case from Example 1 in bugfix.md:
     * - activeTarget = "invalid_target" (does not exist)
     * - valid targets = ["sim", "synth"]
     * - Expected: fallback to "sim" + warning diagnostic emitted
     * - Current Bug: fallback to "sim" but NO diagnostic emitted
     */
    test('Property 1: Invalid activeTarget should fallback with warning diagnostic', () => {
        // Arrange: Create config with invalid activeTarget
        const projectConfig: NormalizedProjectConfig = {
            version: '1.0',
            name: 'test-project',
            root: '/workspace',
            sourceSets: {
                rtl: {
                    name: 'rtl',
                    includes: ['rtl/**/*.sv'],
                    excludes: [],
                    role: Role.Design
                }
            },
            targets: {
                sim: {
                    id: 'sim',
                    kind: TargetKind.Simulation,
                    sourceSets: ['rtl'],
                    top: 'tb_top'
                },
                synth: {
                    id: 'synth',
                    kind: TargetKind.Synthesis,
                    sourceSets: ['rtl'],
                    top: 'top'
                }
            },
            activeTarget: 'invalid_target', // This target does not exist
            tops: {
                design: 'top',
                simulation: 'tb_top'
            }
        };

        const service = new TargetContextService('/workspace', {
            projectConfig
        });

        // Act: Get active target context
        const context = service.getActiveTargetContext();

        // Assert: Expected behavior (will FAIL on unfixed code)
        
        // 2.1: Should fallback to first valid target
        assert.ok(context !== undefined, 'Context should not be undefined (should fallback)');
        assert.strictEqual(context?.targetId, 'sim', 'Should fallback to first valid target "sim"');
        
        // 2.3: Should emit warning diagnostic (THIS WILL FAIL - bug exists here)
        const diagnostics = diagnosticCollection.get(vscode.Uri.file('/workspace/.hdl-helper/project.json'));
        assert.ok(diagnostics && diagnostics.length > 0, 
            'Should emit warning diagnostic when fallback occurs (BUG: no diagnostic emitted)');
        
        const warningDiagnostic = diagnostics?.find(d => d.severity === vscode.DiagnosticSeverity.Warning);
        assert.ok(warningDiagnostic, 'Should have at least one warning diagnostic');
        assert.ok(warningDiagnostic?.message.includes('invalid_target'), 
            'Warning should mention the invalid target ID');
        assert.ok(warningDiagnostic?.message.includes('sim'), 
            'Warning should mention the fallback target');
    });

    /**
     * Property 1: Bug Condition - No Valid Targets Fallback
     * 
     * **Validates: Requirements 2.2, 2.3**
     * 
     * Tests scenario where activeTarget is invalid AND no valid targets exist.
     * Expected: fallback to heuristic context + warning diagnostic
     */
    test('Property 1: Invalid activeTarget with no valid targets should fallback to heuristic with warning', () => {
        // Arrange: Config with invalid activeTarget and empty targets
        const projectConfig: NormalizedProjectConfig = {
            version: '1.0',
            name: 'test-project',
            root: '/workspace',
            sourceSets: {},
            targets: {}, // No valid targets
            activeTarget: 'invalid_target',
            tops: {
                design: 'top',
                simulation: 'tb_top'
            }
        };

        const service = new TargetContextService('/workspace', {
            projectConfig,
            designTop: 'top' // Provide heuristic fallback
        });

        // Act
        const context = service.getActiveTargetContext();

        // Assert: Expected behavior (will FAIL on unfixed code)
        
        // 2.2: Should fallback to heuristic context
        assert.ok(context !== undefined, 'Context should not be undefined (should fallback to heuristic)');
        assert.strictEqual(context?.targetId, 'heuristic-fallback', 
            'Should fallback to heuristic context when no valid targets exist');
        
        // 2.3: Should emit warning diagnostic (THIS WILL FAIL - bug exists here)
        const diagnostics = diagnosticCollection.get(vscode.Uri.file('/workspace/.hdl-helper/project.json'));
        assert.ok(diagnostics && diagnostics.length > 0, 
            'Should emit warning diagnostic when fallback to heuristic occurs (BUG: no diagnostic emitted)');
    });

    /**
     * Property 1: Bug Condition - All Fallbacks Fail
     * 
     * **Validates: Requirements 2.4**
     * 
     * Tests scenario where all fallback strategies fail.
     * Expected: return undefined + error diagnostic
     */
    test('Property 1: When all fallbacks fail should return undefined with error diagnostic', () => {
        // Arrange: Config with invalid activeTarget, no valid targets, no heuristic fallback
        const projectConfig: NormalizedProjectConfig = {
            version: '1.0',
            name: 'test-project',
            root: '/workspace',
            sourceSets: {},
            targets: {},
            activeTarget: 'invalid_target',
            tops: {
                design: undefined,
                simulation: undefined
            }
        };

        const service = new TargetContextService('/workspace', {
            projectConfig
            // No designTop or simulationTop provided
        });

        // Act
        const context = service.getActiveTargetContext();

        // Assert: Expected behavior (will FAIL on unfixed code)
        
        // 2.4: Should return undefined when all fallbacks fail
        assert.strictEqual(context, undefined, 
            'Should return undefined when all fallback strategies fail');
        
        // 2.4: Should emit error diagnostic (THIS WILL FAIL - bug exists here)
        const diagnostics = diagnosticCollection.get(vscode.Uri.file('/workspace/.hdl-helper/project.json'));
        assert.ok(diagnostics && diagnostics.length > 0, 
            'Should emit error diagnostic when all fallbacks fail (BUG: no diagnostic emitted)');
        
        const errorDiagnostic = diagnostics?.find(d => d.severity === vscode.DiagnosticSeverity.Error);
        assert.ok(errorDiagnostic, 'Should have at least one error diagnostic');
        assert.ok(errorDiagnostic?.message.includes('invalid_target'), 
            'Error should mention the invalid target ID');
    });
});
