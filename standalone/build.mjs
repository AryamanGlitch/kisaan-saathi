// Builds dist/index.html: one self-contained file (HTML + CSS + JS), no server needed.
// Usage: npm run build:standalone
import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const swap = {
  name: "standalone-swaps",
  setup(b) {
    // Server API → in-browser equivalent; next/link and next/navigation → hash addresses.
    b.onResolve({ filter: /^@\/lib\/client\/api$/ }, () => ({ path: join(here, "localApi.ts") }));
    b.onResolve({ filter: /^next\/link$/ }, () => ({ path: join(here, "link.tsx") }));
    b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: join(here, "navigation.ts") }));
  },
};

const result = await build({
  entryPoints: [join(here, "main.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  write: false,
  tsconfig: join(root, "tsconfig.json"),
  define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_DATA_BASE": '"./data/"' },
  plugins: [swap],
  logLevel: "error",
  legalComments: "none",
});

const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
// A single file has no public/ folder, so the background photo is inlined as a data URL.
const photo = `data:image/webp;base64,${readFileSync(join(root, "public", "images", "rice-field-2000.webp")).toString("base64")}`;
const theme = readFileSync(join(root, "app", "theme.css"), "utf8").replace('url("/images/rice-field-2000.webp")', () => `url("${photo}")`);
if (!theme.includes(photo)) throw new Error("theme.css no longer references /images/rice-field-2000.webp");
const css = readFileSync(join(here, "styles.css"), "utf8") + theme;
const html = readFileSync(join(here, "template.html"), "utf8").replace("/*CSS*/", () => css).replace("/*JS*/", () => js);
mkdirSync(join(here, "dist"), { recursive: true });
writeFileSync(join(here, "dist", "index.html"), html);
// Converted datasets (soil, crops) are loaded from ./data/ next to index.html.
if (existsSync(join(root, "public", "data"))) cpSync(join(root, "public", "data"), join(here, "dist", "data"), { recursive: true });
console.log(`standalone/dist/index.html — ${(html.length / 1024).toFixed(0)} KB`);
