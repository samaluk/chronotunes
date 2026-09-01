import { expect, test } from "vitest";

import { DEFAULT_SETTINGS } from "./lobby_settings";
import { DEMO_CATALOG } from "./demo-catalog";
import { validateTrackItem } from "./track_validation";

const MINIMUM_DEMO_PLAYERS = 2;

test("demo catalog supports a default two-player game", () => {
  const minimumTrackCount = DEFAULT_SETTINGS.targetTimelineSize * MINIMUM_DEMO_PLAYERS;
  const videoIds = new Set<string>();

  expect(DEMO_CATALOG.length).toBeGreaterThanOrEqual(minimumTrackCount);

  for (const track of DEMO_CATALOG) {
    expect(() => validateTrackItem(track)).not.toThrow();
    expect(track.year).toBeGreaterThanOrEqual(DEFAULT_SETTINGS.minYear);
    expect(track.year).toBeLessThanOrEqual(DEFAULT_SETTINGS.maxYear);
    expect(videoIds.has(track.youtubeVideoId)).toBe(false);
    videoIds.add(track.youtubeVideoId);
  }
});
