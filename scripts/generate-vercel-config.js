import { readdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const dirs = readdirSync(".", { withFileTypes: true })
  .filter(
    (d) =>
      d.isDirectory() &&
      existsSync(join(d.name, "vite.config.js"))
  );

const builds = [];
const routes = [];

for (const dir of dirs) {
  const name = dir.name;
  builds.push({
    src: `${name}/vite.config.js`,
    use: "@vercel/static-build",
    config: { distDir: `${name}/dist` }
  });
  routes.push({
    src: `/${name}/(.*)`,
    dest: `${name}/$1`
  });
}

const config = { builds, routes };
writeFileSync("vercel.json", JSON.stringify(config, null, 2));

console.log(
  "✅ vercel.json généré automatiquement avec :",
  dirs.map((d) => d.name)
);