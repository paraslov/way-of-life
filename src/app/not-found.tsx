import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-6 py-16">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex items-center justify-center gap-4">
          <span className="text-4xl font-semibold tracking-tight text-foreground">
            {t("code")}
          </span>
          <span className="h-10 w-px bg-border" aria-hidden />
          <h1 className="text-left text-base font-medium text-foreground">
            {t("title")}
          </h1>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("body")}
        </p>
        <Link
          href="/"
          className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          {t("home")}
        </Link>
      </div>
    </main>
  );
}
