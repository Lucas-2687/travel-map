import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function upgradeSql(after) {
  const directory = new URL("../supabase/migrations/", import.meta.url);
  const files = (await readdir(directory)).filter((name) => /^\d+_.*\.sql$/.test(name)).sort();
  const index = files.findIndex((name) => name === after || name.split("_")[0] === after);
  if (index < 0) throw new Error("Specify the last consecutively applied migration, for example --after 0003. Verify it in Supabase first; this command cannot detect the live database version.");
  const pending = files.slice(index + 1);
  if (!pending.length) return "-- No newer migrations. No SQL needs to be applied.\n";
  const sections = await Promise.all(pending.map(async (name) => `-- ${name}\n${await readFile(new URL(name, directory), "utf8")}`));
  return `-- Existing installations only. Back up the database and photos first.\n-- Assumes all migrations through ${files[index]} have succeeded.\n-- Review the target project and test this upgrade before production.\n-- This command only prints SQL; it does not connect to Supabase.\n\n${sections.join("\n\n")}\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 2 || args[0] !== "--after") throw new Error("Usage: npm run --silent db:upgrade -- --after 0003");
    process.stdout.write(await upgradeSql(args[1]));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
