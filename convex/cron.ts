import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "check host disconnect",
  { seconds: 10 },
  internal.hostDisconnect.checkHostDisconnect,
);

export default crons;
