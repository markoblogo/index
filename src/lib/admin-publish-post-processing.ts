import { after } from "next/server";
import { generateAndStoreDailyAiMarketBriefs } from "@/lib/ai-market-brief-lazy";

type PublishAiBriefInput = { date: string; userId: string };

type PublishAiBriefDependencies = {
  generate?: typeof generateAndStoreDailyAiMarketBriefs;
  report?: (error: unknown) => void;
  schedule?: (task: () => Promise<void>) => void;
};

export function scheduleAdminPublishAiBrief(
  input: PublishAiBriefInput,
  dependencies: PublishAiBriefDependencies = {},
) {
  const generate = dependencies.generate ?? generateAndStoreDailyAiMarketBriefs;
  const report = dependencies.report ?? ((error) => {
    console.error("Admin index publication succeeded, but AI brief refresh failed.", error);
  });
  const schedule = dependencies.schedule ?? after;

  schedule(async () => {
    try {
      await generate({
        actorUserId: input.userId,
        date: input.date,
        force: true,
        source: "admin_publish",
      });
    } catch (error) {
      report(error);
    }
  });
}
