// @shadcn/lint's theme worker resolves @plugin packages with createRequire,
// which loads fluid-tailwindcss's CJS build. That export is a namespace
// object (`{ default, fluidPlugin, ... }`), so Tailwind throws
// `b is not a function`. This ESM re-export is a function on `default`.
import { fluidPlugin } from "fluid-tailwindcss";

export default fluidPlugin;
