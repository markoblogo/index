import "server-only";

export type DemoSubmissionStatus = "draft" | "submitted";

export type DemoStoredSubmission = {
  commodityId: string;
  date: string;
  excluded?: boolean;
  price: number;
  respondentId: string;
  source: "admin" | "respondent";
  status: DemoSubmissionStatus;
  updatedAt: string;
};

const globalForDemoSubmissions = globalThis as unknown as {
  ugaDemoSubmissions?: Map<string, DemoStoredSubmission>;
};

const submissions =
  globalForDemoSubmissions.ugaDemoSubmissions ??
  new Map<string, DemoStoredSubmission>();

globalForDemoSubmissions.ugaDemoSubmissions = submissions;

export function getDemoSubmission({
  commodityId,
  date,
  respondentId,
  source,
}: {
  commodityId: string;
  date: string;
  respondentId: string;
  source: "admin" | "respondent";
}) {
  return submissions.get(key({ commodityId, date, respondentId, source }));
}

export function setDemoSubmission(submission: DemoStoredSubmission) {
  submissions.set(key(submission), submission);
}

function key({
  commodityId,
  date,
  respondentId,
  source,
}: {
  commodityId: string;
  date: string;
  respondentId: string;
  source: "admin" | "respondent";
}) {
  return `${date}:${commodityId}:${respondentId}:${source}`;
}
