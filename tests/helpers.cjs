const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

// Run actual TypeScript modules with explicit boundary substitutes. Database
// tests use real PostgreSQL through PGlite; no live Neon credentials are loaded.
function loader(overrides = {}) {
  const cache = new Map();
  function load(filename) {
    const absolute = path.resolve(root, filename);
    if (overrides[absolute]) return overrides[absolute];
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} }; cache.set(absolute, module);
    const source = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const req = (name) => {
      if (overrides[name]) return overrides[name];
      if (name.startsWith('@/') || name.startsWith('.')) {
        const resolved = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(absolute), name);
        return load(resolved.endsWith('.ts') ? resolved : resolved + '.ts');
      }
      return require(name);
    };
    new Function('require', 'module', 'exports', source)(req, module, module.exports);
    return module.exports;
  }
  return load;
}
module.exports = { loader, root };
