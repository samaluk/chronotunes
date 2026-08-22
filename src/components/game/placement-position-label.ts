import type { useTranslations } from "next-intl";

import type { TimelineEntry } from "./betting-types";

/**
 * Human label for the gap above, between, or after timeline entries at the
 * given insertion index.
 */
export const getPlacementPositionLabel = (
  t: ReturnType<typeof useTranslations>,
  timeline: TimelineEntry[],
  index: number,
): string => {
  if (index === 0 && timeline.length === 0) {
    return t("emptyTimeline");
  }
  if (index === 0) {
    const firstYear = timeline[0]?.year;
    return t("beforeYear", { year: firstYear });
  }
  if (index === timeline.length) {
    const lastYear = timeline.at(-1)?.year ?? 0;
    return t("afterYear", { year: lastYear });
  }
  const yearBefore = timeline[index - 1]?.year;
  const yearAfter = timeline[index]?.year;
  return t("betweenYears", { year1: yearBefore, year2: yearAfter });
};
