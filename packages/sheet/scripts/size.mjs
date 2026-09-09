import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

/**
 * Gzip budget for the published bundles. Run after `pnpm build`.
 *
 * Each budget is the size measured when it was set, plus 20 % (measured:
 * 97 B / 5651 B / 20569 B gzipped). They are a tripwire, not a target — when a
 * change legitimately grows a bundle, re-baseline these numbers in the same
 * commit and say why. Never silently.
 *
 * `shared` was re-baselined from 16_100 in task 13 (review fixes): keeping
 * `process.env.NODE_ENV` verbatim restores the dev-only guard rolldown used to
 * fold away, and the review fixes themselves are mostly comments — the chunk
 * ships unminified, and ~6 kB gzipped of it is prose.
 *
 * `react` was re-baselined from 5_900 and `shared` from 20_200 after the
 * handoff fixes: the drag/scroll arbiter now finds its scroll ceiling without
 * waiting for the at-rest layout, and the recogniser refuses text selection and
 * native drag-and-drop for the length of a mouse gesture. Both are behaviour we
 * want, and about half of the growth is again the comments that explain it.
 */
const Budgets = { core: 120, react: 6_800, shared: 24_700 };

const dist = resolve(fileURLToPath(import.meta.url), "../..", "dist");

const die = (message) => {
  console.error(`size: ${message}`);
  process.exit(1);
};

const isDir = (path) =>
  statSync(path, { throwIfNoEntry: false })?.isDirectory();
const isFile = (path) => statSync(path, { throwIfNoEntry: false })?.isFile();

if (!isDir(dist)) die(`${dist} is missing — run \`pnpm build\` first.`);

/**
 * The code-split chunks: every top-level dist/*.js that is not the entry.
 * There is exactly one today. Measuring only the first would hide a second one
 * appearing, so the count is part of the tripwire — when a build legitimately
 * splits differently, change `SharedChunks` here and say why.
 */
const SharedChunks = 1;
const shared = readdirSync(dist).filter(
  (name) => name.endsWith(".js") && name !== "index.js",
);
if (shared.length !== SharedChunks) {
  die(
    `expected ${SharedChunks} shared chunk(s) in dist/, found ${shared.length}` +
      `${shared.length > 0 ? ` (${shared.join(", ")})` : " — run `pnpm build` first"}.`,
  );
}

const entries = [
  { file: "index.js", budget: Budgets.core },
  { file: join("react", "index.js"), budget: Budgets.react },
  ...shared.map((file) => ({ file, budget: Budgets.shared })),
];

const kb = (bytes) => `${(bytes / 1024).toFixed(2)} kB`;
const pad = (text, width) => String(text).padEnd(width);

const rows = entries.map(({ file, budget }) => {
  const path = join(dist, file);
  if (!isFile(path)) die(`${path} is missing — run \`pnpm build\` first.`);
  const raw = readFileSync(path);
  const gzip = gzipSync(raw).length;
  return {
    name: `dist/${file.replace(/\\/g, "/")}`,
    raw: raw.length,
    gzip,
    budget,
    over: gzip > budget,
  };
});

const width = Math.max(...rows.map((row) => row.name.length));
const line = (name, raw, gzip, budget, headroom) =>
  `${pad(name, width)}  ${pad(raw, 10)}  ${pad(gzip, 10)}  ${pad(budget, 10)}  ${headroom}`;

console.log(line("name", "raw", "gzip", "budget", "headroom"));
for (const row of rows) {
  console.log(
    line(
      row.name,
      kb(row.raw),
      kb(row.gzip),
      kb(row.budget),
      row.over ? "OVER" : kb(row.budget - row.gzip),
    ),
  );
}

const over = rows.filter((row) => row.over);
if (over.length > 0) {
  die(
    over
      .map(
        (row) =>
          `${row.name} is ${row.gzip} B gzipped, over its ${row.budget} B budget by ${row.gzip - row.budget} B.`,
      )
      .join("\n       "),
  );
}
