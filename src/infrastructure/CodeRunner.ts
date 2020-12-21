import os from 'os';
import path from 'path';
import fs from 'fs';
import child_process from 'child_process';

export async function runCodeAsync(
    code: string, folderName: string, fileExtension: string, node = getNodeJs()): Promise<void> {
    const dir = node.path.join(node.os.tmpdir(), folderName);
    await node.fs.promises.mkdir(dir, {recursive: true});
    const filePath = node.path.join(dir, `run.${fileExtension}`);
    await node.fs.promises.writeFile(filePath, code);
    node.child_process.exec(filePath);
}

function getNodeJs(): INodeJs {
    return { os, path, fs, child_process };
}

export interface INodeJs {
    os: INodeOs;
    path: INodePath;
    fs: INodeFs;
    child_process: INodeChildProcess;
}

export interface INodeOs {
    tmpdir(): string;
}

export interface INodePath {
    join(...paths: string[]): string;
}

export interface INodeChildProcess {
    exec(command: string): void;
}

export interface INodeFs {
    readonly promises: INodeFsPromises;
}

interface INodeFsPromisesMakeDirectoryOptions {
    recursive?: boolean;
}

interface INodeFsPromises {
    mkdir(path: string, options: INodeFsPromisesMakeDirectoryOptions): Promise<string>;
    writeFile(path: string, data: string): Promise<void>;
}

