const { spawnSync } = require("node:child_process")
const path = require("node:path")

const [testType, ...jestArguments] = process.argv.slice(2)
const supportedTestTypes = new Set([
  "unit",
  "integration:http",
  "integration:modules",
])

if (!supportedTestTypes.has(testType)) {
  console.error(
    `Usage: node scripts/run-tests.js <${[...supportedTestTypes].join("|")}> [jest arguments]`
  )
  process.exit(1)
}

const jestMainPath = require.resolve("jest")
const jestPath = path.resolve(
  path.dirname(jestMainPath),
  "..",
  "bin",
  "jest.js"
)
const result = spawnSync(
  process.execPath,
  ["--experimental-vm-modules", jestPath, ...jestArguments],
  {
    env: {
      ...process.env,
      TEST_TYPE: testType,
    },
    stdio: "inherit",
  }
)

if (result.error) {
  console.error(result.error)
  process.exit(1)
}

process.exit(result.status ?? 1)
