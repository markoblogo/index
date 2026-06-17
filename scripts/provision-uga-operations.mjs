import { provisionUgaOperations } from "../src/lib/uga-operations";

const sendEmails = process.env.SEND_UGA_ONBOARDING_EMAILS === "1";

provisionUgaOperations({ sendEmails })
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
