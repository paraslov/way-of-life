import type { ReactNode } from "react";
import { requireCurrentUser } from "@/auth/session";
import { AppSidebar } from "@/components/app-sidebar";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const user = await requireCurrentUser();

  return (
    <div className="min-h-screen bg-page min-[900px]:flex min-[900px]:items-stretch">
      <AppSidebar email={user.email} />
      <main className="min-w-0 flex-1 px-5 pt-6 pb-16 min-[900px]:max-w-[1220px] min-[900px]:px-8 min-[900px]:pt-7">
        {children}
      </main>
    </div>
  );
}
