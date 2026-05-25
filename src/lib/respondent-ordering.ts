export function orderDailyInputRespondents<T extends { id: string; legalName: string }>(
  respondents: T[],
) {
  return [...respondents].sort((first, second) => {
    const firstIsMn7r = first.id === "MN7R_MONITOR";
    const secondIsMn7r = second.id === "MN7R_MONITOR";

    if (firstIsMn7r !== secondIsMn7r) {
      return firstIsMn7r ? -1 : 1;
    }

    return first.legalName.localeCompare(second.legalName, "en");
  });
}
