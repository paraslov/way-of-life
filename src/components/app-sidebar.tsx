"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { logout } from "@/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavLabel =
  | "today"
  | "week"
  | "journal"
  | "strength"
  | "metrics"
  | "horizon"
  | "medical"
  | "tasks"
  | "reference";

type NavGroup = {
  label: "groupDay" | "groupReserve" | "groupHealth" | "groupReference";
  items: { href: string; label: NavLabel }[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "groupDay",
    items: [
      { href: "/", label: "today" },
      { href: "/week", label: "week" },
      { href: "/journal", label: "journal" },
    ],
  },
  {
    label: "groupReserve",
    items: [
      { href: "/strength", label: "strength" },
      { href: "/metrics", label: "metrics" },
      { href: "/horizon", label: "horizon" },
    ],
  },
  {
    label: "groupHealth",
    items: [
      { href: "/medical", label: "medical" },
      { href: "/tasks", label: "tasks" },
    ],
  },
  {
    label: "groupReference",
    items: [{ href: "/reference", label: "reference" }],
  },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const linkClass =
  "flex min-h-9 items-center gap-2.5 rounded-button px-2.5 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground hover:bg-accent hover:text-accent-foreground";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        linkClass,
        active && "bg-accent font-semibold text-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-[2px] bg-border",
          active && "bg-pine",
        )}
      />
      <span className="flex-1">{label}</span>
    </Link>
  );
}

export function AppSidebar({ email }: { email: string }) {
  const t = useTranslations();

  return (
    <aside className="grid w-full shrink-0 grid-cols-[auto_minmax(0,1fr)] gap-x-4 border-b bg-background px-4 py-3 min-[900px]:sticky min-[900px]:top-0 min-[900px]:flex min-[900px]:h-screen min-[900px]:w-[236px] min-[900px]:flex-col min-[900px]:overflow-y-auto min-[900px]:border-r min-[900px]:border-b-0 min-[900px]:px-3.5 min-[900px]:py-5">
      <Link
        href="/"
        className="order-1 flex items-center gap-2.5 self-center px-1 min-[900px]:mb-7 min-[900px]:self-stretch"
      >
        <span className="text-xl font-semibold tracking-[-0.02em]">
          {t("common.appName")}
        </span>
        <span className="rounded-chip border px-2 py-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
          {t("common.badge")}
        </span>
      </Link>

      <nav
        aria-label={t("common.appName")}
        className="order-3 col-span-2 mt-3 flex min-w-0 gap-1 overflow-x-auto border-t pt-3 min-[900px]:order-2 min-[900px]:mt-0 min-[900px]:block min-[900px]:overflow-visible min-[900px]:border-0 min-[900px]:pt-0"
      >
        {NAV_GROUPS.map((group) => (
          <section
            key={group.label}
            className="flex gap-0.5 min-[900px]:mb-5 min-[900px]:flex-col"
          >
            <p className="mb-2.5 hidden px-2 font-mono text-[10px] tracking-[0.16em] text-muted-foreground/80 uppercase min-[900px]:block">
              {t(`nav.${group.label}`)}
            </p>
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={t(`nav.${item.label}`)}
              />
            ))}
          </section>
        ))}
      </nav>

      <div className="order-2 flex min-w-0 flex-wrap items-center justify-end gap-1.5 min-[900px]:order-3 min-[900px]:mt-auto min-[900px]:justify-start min-[900px]:border-t min-[900px]:pt-4">
        <span className="hidden w-full min-w-0 truncate text-xs text-muted-foreground min-[900px]:mb-1 min-[900px]:block">
          {email}
        </span>
        <Button
          asChild
          variant="outline"
          size="icon"
          aria-label={t("nav.settings")}
          title={t("nav.settings")}
        >
          <Link href="/settings">
            <Settings className="size-4" />
          </Link>
        </Button>
        <ThemeToggle ariaLabel={t("common.toggleTheme")} />
        <form action={logout}>
          <Button
            type="submit"
            variant="outline"
            size="icon"
            aria-label={t("common.signOut")}
            title={t("common.signOut")}
          >
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </aside>
  );
}
