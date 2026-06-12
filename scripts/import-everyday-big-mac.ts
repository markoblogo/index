import { importBigMacDataset } from "@/lib/everyday-index/burger-publish";

async function main() {
  const result = await importBigMacDataset({
    trigger: "manual_script",
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
