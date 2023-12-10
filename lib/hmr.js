"use strict";
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
const handleFileChange = (cb, options, rootModule, cache, watcher) => (eventType, filePath, stats) => {
    const moduleId = path_1.default.resolve(options.watchDir, filePath);
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
        type: "change",
        eventType,
        filePath,
        stats,
        rootModule,
        moduleId,
        parentTree: tree,
        moduleTree: tree[moduleId],
        options,
        watcher,
    });
};
function hmr(cb, options = {}, rootModule = require.main, cache = require.cache) {
    let { watchFilePatterns } = options;
    if (!watchFilePatterns) {
        watchFilePatterns = options.watchFilePatterns = ["**/*.ts", "**/*.js"];
    }
    const rootDir = path_1.default.dirname(rootModule.filename);
    if (options.watchDir) {
        options.watchDir = path_1.default.resolve(rootDir, options.watchDir);
    }
    else {
        options.watchDir = rootDir;
    }
    const watcher = chokidar_1.default.watch(watchFilePatterns, Object.assign({ ignoreInitial: true, cwd: options.watchDir, ignored: [".git", "node_modules"] }, options.chokidar));
    // @ts-ignore
    watcher.on("all", handleFileChange(cb, options, rootModule, cache, watcher));
    callChangeHandler(cb, { type: "init", rootDir, rootModule, options });
}
exports.default = hmr;
