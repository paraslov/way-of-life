import { Siren } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { RED_FLAGS } from "@/lib/decision/decision";

/**
 * Red flags sit outside the traffic light (architecture §6, 02.11): shown
 * above everything, in their own shape, and they override any decision.
 */
export async function RedFlagAlert({ flags }: { flags: readonly string[] }) {
  const t = await getTranslations("redFlags");
  const known = RED_FLAGS.filter((flag) => flags.includes(flag));
  if (known.length === 0) return null;

  return (
    <section
      role="alert"
      className="rounded-card border-2 border-signal-red bg-signal-red-tint p-4"
    >
      <div className="flex items-start gap-3">
        <Siren aria-hidden className="mt-0.5 size-6 shrink-0 text-signal-red" />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-signal-red">
            {t("alertTitle")}
          </h2>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {known.map((flag) => (
              <li key={flag}>{t(flag)}</li>
            ))}
          </ul>
          <p className="text-sm font-medium">{t("alertBody")}</p>
        </div>
      </div>
    </section>
  );
}
