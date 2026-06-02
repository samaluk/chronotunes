"use client";

import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo, useCallback } from "react";
import { toast } from "sonner";

interface CopyCodeButtonProps {
  code: string;
}

export const CopyCodeButton = memo(
  ({ code }: CopyCodeButtonProps): React.ReactNode => {
    const t = useTranslations("lobby");
    const tCommon = useTranslations("common");

    const handleCopyCode = useCallback((): void => {
      navigator.clipboard.writeText(code);
      toast.success(tCommon("copied"), { description: t("copiedToClipboard") });
    }, [code, t, tCommon]);

    return (
      <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5">
        <code className="font-bold font-mono text-lg tracking-widest">
          {code}
        </code>
        <button
          className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-background"
          onClick={handleCopyCode}
          title={t("copyCode")}
          type="button"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    );
  }
);
