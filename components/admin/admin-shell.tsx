import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import {
  OlhinhoGlobal,
  ValoresSensiveisProvider,
} from "@/components/admin/valores-sensiveis";

interface AdminShellProps {
  userEmail: string;
  children: React.ReactNode;
}

/** As abas da barra (e qual acende em cada página) estão em admin-nav.tsx. */
export function AdminShell({ userEmail, children }: AdminShellProps) {
  return (
    <ValoresSensiveisProvider>
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-white/85 backdrop-blur-md print:hidden">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/admin/dashboard" aria-label="Início do painel">
              <Logo variant="compact" />
            </Link>
            <AdminNav />
          </div>

          <div className="flex items-center gap-3">
            <OlhinhoGlobal />
            <span
              className="hidden text-sm text-muted-foreground sm:inline"
              title={userEmail}
            >
              {userEmail}
            </span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm" title="Sair">
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </form>
          </div>
        </div>
        <AdminNav mobile />
      </header>

      <main>{children}</main>
    </div>
    </ValoresSensiveisProvider>
  );
}
