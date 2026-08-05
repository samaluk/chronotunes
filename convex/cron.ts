import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "check host disconnect",
  { seconds: 10 },
  internal.host_disconnect.checkHostDisconnect,
);

crons.interval("check host transfer", { seconds: 10 }, internal.host_disconnect.checkHostTransfer);

export default crons;
