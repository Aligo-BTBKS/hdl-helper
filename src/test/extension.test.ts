import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { FilelistParser } from '../project/filelistParser';
import { ClassificationService } from '../project/classificationService';
import { Role } from '../project/types';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('Filelist parser handles nested filelists and env vars', () => {
		const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hdl-helper-filelist-'));
		const rtlDir = path.join(tempRoot, 'rtl');
		const tbDir = path.join(tempRoot, 'tb');
		const incDir = path.join(tempRoot, 'inc');
		fs.mkdirSync(rtlDir, { recursive: true });
		fs.mkdirSync(tbDir, { recursive: true });
		fs.mkdirSync(incDir, { recursive: true });

		const rtlFile = path.join(rtlDir, 'dut.sv');
		const tbFile = path.join(tbDir, 'tb_top.sv');
		fs.writeFileSync(rtlFile, 'module dut; endmodule\n', 'utf8');
		fs.writeFileSync(tbFile, 'module tb_top; endmodule\n', 'utf8');

		const subFilelist = path.join(tempRoot, 'sub.f');
		const mainFilelist = path.join(tempRoot, 'main.f');

		process.env.HDL_HELPER_TEST_ROOT = tempRoot;
		process.env.HDL_HELPER_TEST_INC = incDir;

		fs.writeFileSync(
			subFilelist,
			'-v rtl/dut.sv\n+incdir+$HDL_HELPER_TEST_INC\n',
			'utf8'
		);

		fs.writeFileSync(
			mainFilelist,
			'-f sub.f\n${HDL_HELPER_TEST_ROOT}/tb/tb_top.sv\n%HDL_HELPER_TEST_ROOT%/rtl/dut.sv\n',
			'utf8'
		);

		const parsed = FilelistParser.parseDetailed(mainFilelist);
		assert.ok(parsed.sourceFiles.includes(rtlFile));
		assert.ok(parsed.sourceFiles.includes(tbFile));
		assert.ok(parsed.includeDirs.includes(incDir));
		assert.strictEqual(FilelistParser.parse(mainFilelist).length, parsed.sourceFiles.length);

		fs.rmSync(tempRoot, { recursive: true, force: true });
		delete process.env.HDL_HELPER_TEST_ROOT;
		delete process.env.HDL_HELPER_TEST_INC;
	});

	test('Classification heuristic defaults unknown HDL paths to design', () => {
		const workspaceRoot = path.join(os.tmpdir(), 'hdl-helper-classification-root');
		const service = new ClassificationService({ workspaceRoot });

		const unknownHdl = service.classifyFile(vscode.Uri.file(path.join(workspaceRoot, 'misc', 'child.sv')));
		const testbenchByName = service.classifyFile(vscode.Uri.file(path.join(workspaceRoot, 'misc', 'tb_top.sv')));
		const checkerByName = service.classifyFile(vscode.Uri.file(path.join(workspaceRoot, 'misc', 'alu_checker.sv')));

		assert.strictEqual(unknownHdl.rolePrimary, Role.Design);
		assert.strictEqual(testbenchByName.rolePrimary, Role.Simulation);
		assert.strictEqual(checkerByName.rolePrimary, Role.Verification);
	});
});
