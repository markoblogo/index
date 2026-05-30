import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2).map((arg) => arg.trim()).filter(Boolean);

function getArgValue(name) {
  const withEquals = `--${name}=`;
  const exact = args.find((arg) => arg.startsWith(withEquals));

  if (exact) {
    return exact.slice(withEquals.length);
  }

  const index = args.indexOf(`--${name}`);

  if (index >= 0 && args[index + 1]) {
    return args[index + 1];
  }

  return null;
}

const expectedProject = getArgValue("project");

if (!expectedProject) {
  console.error("[vercel-guard] Missing required flag: --project <project-name>");
  process.exit(1);
}

const projectFilePath = path.resolve(process.cwd(), ".vercel", "project.json");

if (!fs.existsSync(projectFilePath)) {
  console.error(
    "[vercel-guard] Cannot find .vercel/project.json. Run `vercel link` for the target project first.",
  );
  process.exit(1);
}

let linkedProject = "";

try {
  const raw = fs.readFileSync(projectFilePath, "utf8");
  const parsed = JSON.parse(raw);
  linkedProject = parsed.projectName || "";
} catch (error) {
  console.error(
    "[vercel-guard] Failed to parse .vercel/project.json:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}

if (!linkedProject) {
  console.error(
    `[vercel-guard] .vercel/project.json does not contain projectName. Current file: ${projectFilePath}`,
  );
  process.exit(1);
}

if (linkedProject !== expectedProject) {
  console.error(
    `[vercel-guard] Refusing deploy: linked project is \"${linkedProject}\", expected \"${expectedProject}\".`,
  );
  console.error(
    "[vercel-guard] Run: vercel link --yes --project <expected> --scope abvcreative",
  );
  process.exit(1);
}

console.log(`[vercel-guard] Linked project is correct: ${linkedProject}`);
process.exit(0);
