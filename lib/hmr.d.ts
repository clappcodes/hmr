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
    watch?: string[];
    ignore?: string[];
    watchDir?: string;
    chokidar?: chockidar.WatchOptions;
    debug?: boolean;
    cwd?: string;
    followSymlinks?: boolean;
};
export type HMREvent = {
    event?: string;
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
declare function hmr(rootModule: NodeModule | undefined, cb: (event: HMREvent) => void, options?: HMROptions, cache?: Dict<NodeModule>): Promise<chockidar.FSWatcher>;
declare namespace hmr {
    var watchers: Dict<chockidar.FSWatcher>;
}
export default hmr;
