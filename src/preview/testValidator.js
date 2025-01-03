"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestValidator = void 0;
var fs = require("fs");
var path = require("path");
var child_process_1 = require("child_process");
var TestValidator = /** @class */ (function () {
    /* For GitHub Action, the process.cwd() will return the directory of the runner, the file hierarchy will be as follows along with the repo code:
    /home/runner/work/repo-name/repo-name

    To execute the generated unit tests in fix test/ folder for code in specified folder (rootDir), e.g. src/, we need to configure the tsConfigFile, jestConfigFile accordingly.

    The typical file hierarchy will be as follows:
    /home/runner/work/[repository-name]/[repository-name]/
    │
    ├── .github/
    │   └── workflows/
    │       └── main.yml
    │
    ├── dist/ (generated by ts-build, this is the actual folder that will be used in the github action)
    │   ├── src/
    │   │   ├── index.js
    │   │   ├── index.d.ts (this is the entry file for github action)
    │   └── ...
    │
    ├── src/ (original source code)
    │   ├── file-1.ts
    │   ├── file-2.ts
    │   ├── ...
    │   └── file-n.ts
    │
    ├── unitTestGenerated/ (generated unit test for the external source code)
    │   ├── file-1.test.ts
    │   ├── file-2.test.ts
    │   ├── ...
    │   └── file-n.test.ts
    │
    ├── test/ (unit test for the original source code)
    ├── .gitignore
    ├── package.json
    ├── README.md
    └── LICENSE
    */
    function TestValidator(packagePath) {
        if (packagePath === void 0) { packagePath = process.cwd(); }
        this.packagePath = packagePath;
        this.coverageDirs = [];
        // this.testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-validator-'));
        this.testDir = path.join(this.packagePath, 'preflight-tests');
        if (!fs.existsSync(this.testDir)) {
            fs.mkdirSync(this.testDir, { recursive: true });
        }
    }
    TestValidator.prototype.validateTest = function (testName, testSource, rootDir) {
        var _a;
        console.log('Validating test: ', testName, '\nTest source: ', testSource, '\nRoot dir: ', rootDir, '\nTest dir: ', this.testDir, '\nCurrent folder hierarchy: ', fs.readdirSync(this.packagePath));
        var testFile = path.join(this.testDir, "".concat(testName, ".test.ts"));
        fs.writeFileSync(testFile, testSource);
        // const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "jest-validator"));
        var tmpDir = path.join(this.testDir, "jest-validator");
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
        var coverageDir = path.join(tmpDir, "coverage");
        var reportFile = path.join(tmpDir, "report.json");
        // Create a temporary tsconfig.json file, 
        var tsConfigFile = path.join(this.testDir, 'tsconfig.json');
        var tsConfig = {
            compilerOptions: {
                target: "es2018",
                module: "commonjs",
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
                forceConsistentCasingInFileNames: true,
                baseUrl: this.packagePath,
                paths: (_a = {
                        "@/*": ["./*"]
                    },
                    _a["".concat(rootDir, "/*")] = ["./*"],
                    _a),
                moduleResolution: "node",
                resolveJsonModule: true
            },
            include: [
                "./**/*.ts",
                "../**/*.ts"
            ],
            exclude: ["node_modules"]
        };
        fs.writeFileSync(tsConfigFile, JSON.stringify(tsConfig, null, 2));
        // Create a temporary Jest config file
        var jestConfigFile = path.join(this.testDir, 'jest.config.js');
        var jestConfig = "\nmodule.exports = {\n  preset: 'ts-jest',\n  testEnvironment: 'node',\n  transform: {\n    '^.+\\.tsx?$': ['ts-jest', {\n      tsconfig: '".concat(tsConfigFile, "'\n    }],\n  },\n  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],\n  moduleDirectories: ['node_modules', '").concat(path.join(this.packagePath, rootDir), "'],\n  rootDir: '").concat(path.join(this.packagePath, rootDir), "',\n  modulePaths: ['").concat(path.join(this.packagePath, rootDir), "'],\n  testMatch: ['**/*.test.ts'],\n  moduleNameMapper: {\n    '^@/(.*)$': '<rootDir>/$1',\n    '^").concat(rootDir, "/(.*)$': '<rootDir>/$1'\n  }\n};");
        fs.writeFileSync(jestConfigFile, jestConfig);
        // Ensure ts-jest is installed
        this.ensureTsJestInstalled();
        var res = (0, child_process_1.spawnSync)('npx', [
            'jest',
            '--coverage',
            '--coverageDirectory', coverageDir,
            '--json',
            '--outputFile', reportFile,
            '--rootDir', this.packagePath,
            '--config', jestConfigFile,
            testFile
        ], { timeout: 30000, encoding: 'utf-8', cwd: this.packagePath });
        // Log out the actual npx command for debugging
        console.log("Executed command: npx jest --coverage --coverageDirectory ".concat(coverageDir, " --json --outputFile ").concat(reportFile, " --rootDir ").concat(this.packagePath, " --config ").concat(jestConfigFile, " ").concat(testFile));
        if (res.status !== 0) {
            return { status: 'FAILED', error: res.stderr || res.stdout };
        }
        var report = JSON.parse(fs.readFileSync(reportFile, 'utf-8'));
        if (report.numFailedTests > 0) {
            var failedTestResult = report.testResults[0].assertionResults.find(function (result) { return result.status === 'failed'; });
            return { status: 'FAILED', error: failedTestResult ? failedTestResult.failureMessages.join('\n') : 'Unknown error' };
        }
        // Only record the coverage directory if all tests passed
        this.coverageDirs.push(coverageDir);
        return { status: 'PASSED' };
    };
    TestValidator.prototype.ensureTsJestInstalled = function () {
        try {
            require.resolve('ts-jest');
        }
        catch (e) {
            console.log('ts-jest not found. Installing...');
            (0, child_process_1.spawnSync)('npm', ['install', '--save-dev', 'ts-jest'], { stdio: 'inherit', cwd: this.packagePath });
        }
    };
    TestValidator.prototype.getCoverageSummary = function () {
        var aggregatedCoverage = {
            lines: { total: 0, covered: 0, skipped: 0, pct: 0 },
            statements: { total: 0, covered: 0, skipped: 0, pct: 0 },
            functions: { total: 0, covered: 0, skipped: 0, pct: 0 },
            branches: { total: 0, covered: 0, skipped: 0, pct: 0 }
        };
        for (var _i = 0, _a = this.coverageDirs; _i < _a.length; _i++) {
            var coverageDir = _a[_i];
            var coverageFile = path.join(coverageDir, 'coverage-final.json');
            if (fs.existsSync(coverageFile)) {
                var coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf-8'));
                for (var _b = 0, _c = Object.values(coverage); _b < _c.length; _b++) {
                    var fileCoverage = _c[_b];
                    var summary = fileCoverage.summary;
                    if (summary) {
                        this.addCoverage(aggregatedCoverage.lines, summary.lines);
                        this.addCoverage(aggregatedCoverage.statements, summary.statements);
                        this.addCoverage(aggregatedCoverage.functions, summary.functions);
                        this.addCoverage(aggregatedCoverage.branches, summary.branches);
                    }
                }
            }
        }
        this.calculatePercentages(aggregatedCoverage.lines);
        this.calculatePercentages(aggregatedCoverage.statements);
        this.calculatePercentages(aggregatedCoverage.functions);
        this.calculatePercentages(aggregatedCoverage.branches);
        return aggregatedCoverage;
    };
    TestValidator.prototype.addCoverage = function (target, source) {
        target.total += source.total;
        target.covered += source.covered;
        target.skipped += source.skipped;
    };
    TestValidator.prototype.calculatePercentages = function (coverage) {
        coverage.pct = coverage.total === 0 ? 100 : (coverage.covered / coverage.total) * 100;
    };
    return TestValidator;
}());
exports.TestValidator = TestValidator;
