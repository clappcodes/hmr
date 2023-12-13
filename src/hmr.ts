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
	(event: string, filePath: string, stats: any) => {
		// const moduleId = path.resolve(options.watchDir!, filePath);
		const moduleId = path.resolve(watcher.options.cwd!, filePath);

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

const watchers: Dict<chockidar.FSWatcher> = {};
hmr.watchers = watchers;

export default async function hmr(
	rootModule: NodeModule = require.main!,
	cb: (event: HMREvent) => void,
	options: HMROptions = {
		watch: ["**/*.js", "**/*.json"],
		followSymlinks: false,
	},
	cache: Dict<NodeModule> = require.cache
) {
	if (!options.watch) {
		options.watch = ["**/*.js", "**/*.json"];
	}

	const rootDir = path.dirname(rootModule.filename);

	if (options.watchDir) {
		options.watchDir = path.resolve(rootDir, options.watchDir);
	} else {
		options.watchDir = rootDir;
	}

	const runWatcher = () => {
		const watcher = (watchers[rootModule.id] = chockidar.watch(options.watch!, {
			ignoreInitial: true,
			cwd: options.cwd || options.watchDir,
			ignored: options.ignore || [
				".git",
				"**/.git",
				"node_modules",
				"**/node_modules/**",
				"**/**/node_modules/**",
			],
			followSymlinks:
				typeof options.followSymlinks === "undefined"
					? false
					: options.followSymlinks,
			...options.chokidar,
		}));
		// @ts-ignore
		watcher.on(
			"all",
			handleFileChange(cb, options, rootModule, cache, watcher)
		);

		return watcher;
	};

	if (watchers[rootModule.id]) {
		const _watcher = watchers[rootModule.id]!;
		console.warn(
			// @ts-ignore
			`[HMR] Whatcher active. (${rootModule.id}:${_watcher.closed}). Closing...`
		);

		await _watcher.close();
		delete watchers[rootModule.id];

		console.log(
			// @ts-ignore
			`[HMR] Watcher closed. (${rootModule.id}:${_watcher.closed})`
		);
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
}
