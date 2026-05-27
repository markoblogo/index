import {
  MN7R_MONITOR_RESPONDENT_ID,
  SPIKE_ADMIN_FALLBACK_RESPONDENT_ID,
} from "@/lib/index-platform";

export function orderDailyInputRespondents<T extends { id: string; legalName: string }>(
  respondents: T[],
) {
  return [...respondents].sort((first, second) => {
    const firstPriority = getDailyInputPriority(first.id);
    const secondPriority = getDailyInputPriority(second.id);

    if (firstPriority !== secondPriority) {
      return firstPriority - secondPriority;
    }

    return first.legalName.localeCompare(second.legalName, "en");
  });
}

function getDailyInputPriority(respondentId: string) {
  if (respondentId === MN7R_MONITOR_RESPONDENT_ID) {
    return 0;
  }

  if (respondentId === SPIKE_ADMIN_FALLBACK_RESPONDENT_ID) {
    return 1;
  }

  return 2;
}
