import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

import { messagesByLocale, resolveLocale } from "./messages";

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get("locale")?.value;
  const locale = resolveLocale(cookieLocale);

  return {
    locale,
    messages: messagesByLocale[locale],
  };
});
