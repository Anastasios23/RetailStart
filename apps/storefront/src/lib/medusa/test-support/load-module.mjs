import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import vm from "node:vm"
import ts from "typescript"

// Exercise the production TS/TSX with controlled framework/IO boundaries.
// Transpilation is in memory; no production test seams or emitted files.
// Relative paths resolve against `baseUrl` (the caller's import.meta.url).
export function createModuleLoader(baseUrl, { console = globalThis.console } = {}) {
  const localRequire = createRequire(baseUrl)
  return function load(relativePath, dependencies = {}) {
    const filename = fileURLToPath(new URL(relativePath, baseUrl))
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    })
    const module = { exports: {} }
    const require = (name) => {
      if (Object.hasOwn(dependencies, name)) return dependencies[name]
      if (name.startsWith(".")) throw new Error(`Unstubbed dependency: ${name}`)
      return localRequire(name)
    }
    vm.runInNewContext(outputText, { module, exports: module.exports, require, console }, { filename })
    return module.exports
  }
}
