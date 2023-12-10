/// <reference types="node" />
import chockidar from "chokidar";
interface Dict<T> {
    [key: string]: T | undefined;
}
interface ParentModules {
    [key: string]: string[];
}
export declare const buildParentTree: (module: NodeModule, parentChain?: string[]) => ParentModules;
export type HMROptions = {
    watchFilePatterns?: string[];
    watchDir?: string;
    chokidar?: chockidar.WatchOptions;
    debug?: boolean;
};
export type HMREvent = {
    type: "init" | "change";
    eventType?: string;
    filePath?: string;
    stats?: any;
    rootModule?: NodeModule;
    moduleId?: string;
    parentTree?: ParentModules;
    moduleTree?: string[];
    options?: HMROptions;
    watcher?: chockidar.FSWatcher;
    rootDir?: string;
};
export default function hmr(cb: (event: HMREvent) => void, options?: HMROptions, rootModule?: NodeModule, cache?: Dict<NodeModule>): void;
export {};
