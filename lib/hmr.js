"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildParentTree = void 0;
const path_1 = __importDefault(require("path"));
const chokidar_1 = __importDefault(require("chokidar"));
const buildParentTree = (module, parentChain = []) => {
    const tree = {};
    tree[module.filename] = [...parentChain];
    tree[module.filename].push(module.filename);
    if (module.children.length) {
        module.children.forEach((child) => {
            if (!child.filename.includes("node_modules")) {
                Object.assign(tree, (0, exports.buildParentTree)(child, tree[module.filename]));
            }
        });
    }
    return tree;
};
exports.buildParentTree = buildParentTree;
const callChangeHandler = (cb, data) => {
    try {
        cb(data);
    }
    catch (err) {
        console.error(err);
    }
};
const handleFileChange = (cb, options, rootModule, cache, watcher) => (event, filePath, stats) => {
    // const moduleId = path.resolve(options.watchDir!, filePath);
    const moduleId = path_1.default.resolve(watcher.options.cwd, filePath);
    const tree = (0, exports.buildParentTree)(rootModule);
    if (tree[moduleId]) {
        tree[moduleId].forEach((id) => {
            delete cache[id];
        });
        rootModule.children = [];
        if (options.debug) {
            console.info({ modulesToReload: tree[moduleId] });
        }
    }
    callChangeHandler(cb, {
        event,
        filePath,
        rootModule,
        moduleId,
        parentTree: tree,
        moduleTree: tree[moduleId],
        options,
        watcher,
    });
};
const watchers = {};
hmr.watchers = watchers;
function hmr(rootModule = require.main, cb, options = {
    watch: ["**/*.js", "**/*.json"],
    followSymlinks: false,
}, cache = require.cache) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!options.watch) {
            options.watch = ["**/*.js", "**/*.json"];
        }
        const rootDir = path_1.default.dirname(rootModule.filename);
        if (options.watchDir) {
            options.watchDir = path_1.default.resolve(rootDir, options.watchDir);
        }
        else {
            options.watchDir = rootDir;
        }
        const runWatcher = () => {
            const watcher = (watchers[rootModule.id] = chokidar_1.default.watch(options.watch, Object.assign({ ignoreInitial: true, cwd: options.cwd || options.watchDir, ignored: options.ignore || [
                    ".git",
                    "**/.git",
                    "node_modules",
                    "**/node_modules/**",
                    "**/**/node_modules/**",
                ], followSymlinks: typeof options.followSymlinks === "undefined"
                    ? false
                    : options.followSymlinks }, options.chokidar)));
            // @ts-ignore
            watcher.on("all", handleFileChange(cb, options, rootModule, cache, watcher));
            return watcher;
        };
        if (watchers[rootModule.id]) {
            const _watcher = watchers[rootModule.id];
            console.warn(
            // @ts-ignore
            `[HMR] Whatcher active. (${rootModule.id}:${_watcher.closed}). Closing...`);
            yield _watcher.close();
            delete watchers[rootModule.id];
            console.log(
            // @ts-ignore
            `[HMR] Watcher closed. (${rootModule.id}:${_watcher.closed})`);
        }
        const watcher = runWatcher();
        callChangeHandler(cb, {
            event: "init",
            watcher,
            rootDir,
            rootModule,
            moduleTree: [],
            parentTree: {},
            filePath: undefined,
            moduleId: rootModule.id,
            options,
        });
        return watcher;
    });
}
exports.default = hmr;
