import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-2">
        <CardHeader className="items-center pb-2 text-center">
          <Logo className="mb-6" />
          <CardTitle className="text-2xl">Painel administrativo</CardTitle>
          <CardDescription>Acesse sua conta para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                disabled
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="••••••••"
                disabled
              />
            </div>
            <Button type="button" className="w-full" disabled>
              Entrar
            </Button>
            <p className="pt-2 text-center text-xs text-muted-foreground">
              Em breve: autenticação Supabase
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
