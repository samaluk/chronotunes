interface ImportMeta {
  glob: (pattern: string) => Record<string, () => Promise<unknown>>;
}

declare module "*.svg" {
  import type { ComponentType } from "react";

  const content: ComponentType<{ className?: string }>;
  export default content;
}
