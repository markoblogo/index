import { syncUgaDemoIndicesFromSpike } from "../src/lib/uga-spike-demo-sync";

const mode = process.argv.includes("--latest") ? "latest" : "history";

syncUgaDemoIndicesFromSpike({ mode })
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
