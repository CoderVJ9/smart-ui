const path = require("path");
const { context } = require("esbuild");
const args = require("minimist")(process.argv.slice(2));

const target = args._[0] || "reactivity";
const format = args.f || "cjs";

const pkg = require(path.resolve(
  __dirname,
  `../packages/${target}/package.json`
));
const outputFormat = format.startsWith("global")
  ? "iife"
  : format === "cjs"
  ? "cjs"
  : "esm";

const outfile = path.resolve(
  __dirname,
  `../packages/${target}/dist/${target}.${format}.js`
);

context({
  entryPoints: [path.resolve(__dirname, `../packages/${target}/src/index.ts`)],
  outfile,
  bundle: true,
  sourcemap: true,
  format: outputFormat,
  globalName: pkg.buildOptions.name,
  platform: format === "cjs" ? "node" : "browser",
}).then((ctx) => {
  ctx.watch();
  console.log("watching~~");
});
