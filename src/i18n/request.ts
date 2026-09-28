import { getRequestConfig } from "next-intl/server";
import { locale, timeZone } from "@/i18n/config";
import ru from "@/i18n/messages/ru.json";

export default getRequestConfig(async () => ({
  locale,
  timeZone,
  messages: ru,
}));
