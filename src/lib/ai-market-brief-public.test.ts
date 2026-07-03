import { afterEach, describe, expect, it } from "vitest";

import { vi } from "vitest";

vi.mock("server-only", () => ({}));

import { shouldAutoRepairPublicAiBrief } from "@/lib/ai-market-brief-public";

afterEach(() => {
  delete process.env.SPIKE_AI_BRIEF_PUBLIC_AUTO_REPAIR;
});

describe("ai market brief public access", () => {
  it("does not auto-repair public AI briefs by default", () => {
    expect(shouldAutoRepairPublicAiBrief()).toBe(false);
  });

  it("requires an explicit env flag to allow public auto-repair", () => {
    process.env.SPIKE_AI_BRIEF_PUBLIC_AUTO_REPAIR = "1";

    expect(shouldAutoRepairPublicAiBrief()).toBe(true);
  });
});
