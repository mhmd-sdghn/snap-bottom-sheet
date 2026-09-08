import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Shape checks on the published bundle that neither publint nor attw makes.
 * Run after `pnpm build`. Every one of these has already broken once:
 *
 * 1. `process.env.NODE_ENV` must survive verbatim, or `warnOnce` runs in the
 *    consumer's production build (the bundler folds it, we must not).
 * 2. exactly one `"use client"`, in the React entry — the core entry is
 *    framework-agnostic and must not be marked as a client module.
 * 3. no declaration that points at a `.d.ts.map` that was never emitted.
 */

const dist = resolve(fileURLToPath(import.meta.url), "../..", "dist");

const problems = [];
const check = (ok, message) => {
  if (!ok) problems.push(message);
};

const isDir = (path) =>
  statSync(path, { throwIfNoEntry: false })?.isDirectory();
const isFile = (path) => statSync(path, { throwIfNoEntry: false })?.isFile();

if (!isDir(dist)) {
  console.error(`check-dist: ${dist} is missing — run \`pnpm build\` first.`);
  process.exit(1);
}

/** Every emitted file, relative to dist/. */
function walk(dir, prefix = "") {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (isDir(path)) out.push(...walk(path, `${prefix}${name}/`));
    else out.push(`${prefix}${name}`);
  }
  return out;
}

const files = walk(dist);
const read = (file) => readFileSync(join(dist, file), "utf8");
const scripts = files.filter((file) => file.endsWith(".js"));
const declarations = files.filter((file) => file.endsWith(".d.ts"));

// 1. the production guard
check(
  scripts.some((file) => read(file).includes("process.env.NODE_ENV")),
  "no `process.env.NODE_ENV` anywhere in dist — the dev-only guard was folded " +
    "away at build time (see the `define` in tsdown.config.ts).",
);

// 2. the client directive
const USE_CLIENT = /["']use client["']/g;
for (const file of scripts) {
  const count = (read(file).match(USE_CLIENT) ?? []).length;
  const expected = file === "react/index.js" ? 1 : 0;
  check(
    count === expected,
    `${file} has ${count} "use client" directives, expected ${expected}.`,
  );
}
check(
  scripts.includes("react/index.js"),
  "dist/react/index.js is missing — run `pnpm build` first.",
);

// 3. declaration maps that exist
for (const file of declarations) {
  const url = /sourceMappingURL=(\S+)/.exec(read(file))?.[1];
  if (!url) continue;
  const map = join(dist, file, "..", url);
  check(
    isFile(map),
    `${file} points at ${url}, which was not emitted (dts sourcemaps).`,
  );
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`check-dist: ${problem}`);
  process.exit(1);
}

console.log(
  `check-dist: ok — ${scripts.length} scripts, ${declarations.length} declarations.`,
);
