# @clapp/hmr

## Usage
```js
require('@clapp/hmr')(() => {
  require('./your-dev-module');
});
```

* `callback` Function which will be called each time when some file was changed
* `options` Options
  * `debug` Show list of modules which was removed from the cache. Default: false
  * `watchDir` Relative path to the directory to be watched recursively. Default: directory of the  current module
  * `watchFilePatterns` Files that will trigger reload on change. Default: `["**/*.ts", "**/*.js"]`
  * `chokidar` Chokidar [options](https://github.com/paulmillr/chokidar#api)

## Example
`route.ts`
```ts
function route(req: http.Request, res: http.Response): http.RequestListener {
  res.write('Hello World');
  res.end()
});

export default route;
```

`index.ts`
```ts
import http from 'http';
import hmr from '@clapp/hmr';

let route: http.RequestListener;

hmr(async () => {
  console.log('Reloading app...');
  ({ default: route } = await import('./route'));
});

const server = http.createServer((req, res) => route(req, res));

server.listen(3000);
```
