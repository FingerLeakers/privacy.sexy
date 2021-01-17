import { EnvironmentStub } from './../stubs/EnvironmentStub';
import { OperatingSystem } from './../../../src/domain/OperatingSystem';
import 'mocha';
import { expect } from 'chai';
import { runCodeAsync } from '@/infrastructure/CodeRunner';

describe('CodeRunner', () => {
    describe('runCodeAsync', () => {
        it('creates temporary directory recursively', async () => {
            // arrange
            const mocks = getNodeJsMocks();
            const dirToCreate = 'expected-dir';
            const folderName = 'privacy.sexy';
            mocks.os.setupTmpdir('tmp');
            mocks.path.setupJoin(dirToCreate, 'tmp', folderName);

            // act
            await runCodeAsync('code', folderName, 'file-extension', mocks);

            // assert
            expect(mocks.fs.mkdirHistory.length).to.equal(1);
            expect(mocks.fs.mkdirHistory[0].isRecursive).to.equal(true);
            expect(mocks.fs.mkdirHistory[0].path).to.equal(dirToCreate);
        });
        it('creates a file with expected code and path', async () => {
            // arrange
            const expectedCode = 'expected-code';
            const expectedFilePath = 'expected-file-path';
            const extension = '.sh';
            const expectedName = `run.${extension}`;
            const folderName = 'privacy.sexy';
            const mocks = getNodeJsMocks();
            mocks.os.setupTmpdir('tmp');
            mocks.path.setupJoin('folder', 'tmp', folderName);
            mocks.path.setupJoin(expectedFilePath, 'folder', expectedName);

            // act
            await runCodeAsync(expectedCode, folderName, extension, mocks);

            // assert
            expect(mocks.fs.writeFileHistory.length).to.equal(1);
            expect(mocks.fs.writeFileHistory[0].data).to.equal(expectedCode);
            expect(mocks.fs.writeFileHistory[0].path).to.equal(expectedFilePath);
        });
        describe('executes as expected', () => {
            // arrange
            const filePath = 'expected-file-path';
            const testData = [ {
                os: OperatingSystem.Windows,
                expected: filePath
            }, {
                os: OperatingSystem.macOS,
                expected: `open -a Terminal.app ${filePath}`
            }]
            for (const data of testData) {
                it(`returns ${data.expected} on ${OperatingSystem[data.os]}`, async () => {
                    const mocks = getNodeJsMocks();
                    mocks.os.setupTmpdir('tmp');
                    mocks.path.setupJoinSequence('folder', filePath);
                    const env = new EnvironmentStub().withOs(data.os);

                    // act
                    await runCodeAsync('code', 'folderName', 'fileExtension', mocks, env);

                    // assert
                    expect(mocks.child_process.executionHistory.length).to.equal(1);
                    expect(mocks.child_process.executionHistory[0]).to.equal(data.expected);
                });
            }
        });
    });
});

function getNodeJsMocks() {
    return {
        os: mockOs(),
        path: mockPath(),
        fs: mockNodeFs(),
        child_process: mockChildProcess(),
    };
}

function mockOs() {
    let tmpDir;
    return {
        setupTmpdir: (value: string): void => {
            tmpDir = value;
        },
        tmpdir: (): string => {
            if (!tmpDir) {
                throw new Error('tmpdir not set up');
            }
            return tmpDir;
        },
    };
}

function mockPath() {
    const sequence = new Array<string>();
    const scenarios = new Map<string, string>();
    const getScenarioKey = (paths: string[]) => paths.join('|');
    return {
        setupJoin: (returnValue: string, ...paths: string[]): void => {
            scenarios.set(getScenarioKey(paths), returnValue);
        },
        setupJoinSequence: (...valuesToReturn: string[]): void => {
            sequence.push(...valuesToReturn);
            sequence.reverse();
        },
        join: (...paths: string[]): string => {
            if (sequence.length > 0) {
                return sequence.pop();
            }
            const key = getScenarioKey(paths);
            if (!scenarios.has(key)) {
                return paths.join('/');
            }
            return scenarios.get(key);
        },
    };
}

function mockChildProcess() {
    const executionHistory = new Array<string>();
    return {
        exec: (command: string): void => {
            executionHistory.push(command);
        },
        executionHistory,
    };
}

function mockNodeFs() {
    interface IMkdirCall { path: string; isRecursive: boolean; }
    interface IWriteFileCall { path: string; data: string; }
    interface IChmodCall { path: string; mode: string | number; }
    const mkdirHistory = new Array<IMkdirCall>();
    const writeFileHistory = new Array<IWriteFileCall>();
    const chmodCallHistory = new Array<IChmodCall>();
    return {
        promises: {
            mkdir: (path, options) => {
                mkdirHistory.push({ path, isRecursive: options && options.recursive });
                return Promise.resolve(path);
            },
            writeFile: (path, data) => {
                writeFileHistory.push({ path, data });
                return Promise.resolve();
            },
            chmod: (path, mode) => {
                chmodCallHistory.push({ path, mode });
                return Promise.resolve();
            },
        },
        mkdirHistory,
        writeFileHistory,
        chmodCallHistory,
    };
}
