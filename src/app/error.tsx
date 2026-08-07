"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  retry: () => void;
}

export default function ErrorPage({ error, retry }: ErrorPageProps): React.ReactNode {
  const t = useTranslations("error");
  const tCommon = useTranslations("common");

  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background p-6 text-center">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-5 w-5 text-destructive" />
      </div>
      <h2 className="font-semibold text-lg">{t("somethingWrong")}</h2>
      <p className="mb-4 max-w-md text-muted-foreground text-sm">{t("unexpectedError")}</p>
      <Button onClick={() => retry()} variant="outline">
        <RefreshCw className="mr-2 h-4 w-4" />
        {tCommon("tryAgain")}
      </Button>
    </div>
  );
}
