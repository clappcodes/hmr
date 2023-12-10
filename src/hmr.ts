import path from "path";
import chockidar from "chokidar";

interface Dict<T> {
	[key: string]: T | undefined;
}

interface ParentModules {
	[key: string]: string[];
}

export const buildParentTree = (
	module: NodeModule,
	parentChain: string[] = []
): ParentModules => {
	const tree: ParentModules = {};

	tree[module.filename] = [...parentChain];
	tree[module.filename].push(module.filename);

	if (module.children.length) {
		module.children.forEach((child: NodeModule) => {
			if (!child.filename.includes("node_modules")) {
				Object.assign(tree, buildParentTree(child, tree[module.filename]));
			}
		});
	}

	return tree;
};

const callChangeHandler = (cb: Function, data: HMREvent) => {
	try {
		cb(data);
	} catch (err) {
		console.error(err);
	}
};

const handleFileChange =
	(
		cb: Function,
		options: HMROptions,
		rootModule: NodeModule,
		cache: Dict<NodeModule>,
		watcher: chockidar.FSWatcher
	) =>
	(eventType: string, filePath: string, stats: any) => {
		const moduleId = path.resolve(options.watchDir!, filePath);
		const tree = buildParentTree(rootModule);

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

export default function hmr(
	cb: (event: HMREvent) => void,
	options: HMROptions = {},
	rootModule: NodeModule = require.main!,
	cache: Dict<NodeModule> = require.cache
) {
	let { watchFilePatterns } = options;
	if (!watchFilePatterns) {
		watchFilePatterns = options.watchFilePatterns = ["**/*.ts", "**/*.js"];
	}

	const rootDir = path.dirname(rootModule.filename);

	if (options.watchDir) {
		options.watchDir = path.resolve(rootDir, options.watchDir);
	} else {
		options.watchDir = rootDir;
	}

	const watcher = chockidar.watch(watchFilePatterns, {
		ignoreInitial: true,
		cwd: options.watchDir,
		ignored: [".git", "node_modules"],
		...options.chokidar,
	});
	// @ts-ignore
	watcher.on("all", handleFileChange(cb, options, rootModule, cache, watcher));
	callChangeHandler(cb, { type: "init", rootDir, rootModule, options });
}
