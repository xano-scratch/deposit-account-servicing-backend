import { useState } from "react";
import { Landmark, LogIn, ShieldCheck, User, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_CREDENTIALS, login, seed, setToken, type LoginResponse } from "@/lib/api";

const DEMO_USERS: { role: string; label: string; note: string; icon: typeof User }[] = [
  { role: "teller", label: "Teller", note: "Opens accounts, posts within the threshold, places holds", icon: User },
  { role: "supervisor", label: "Supervisor", note: "Also posts large debits, releases holds, freezes accounts", icon: ShieldCheck },
  { role: "viewer", label: "Viewer", note: "Reads accounts, ledger, and the audit trail only", icon: Eye },
];

export function Login({ onLoggedIn }: { onLoggedIn: (session: LoginResponse) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(e: string, p: string) {
    setBusy(true);
    setError(null);
    try {
      const session = await login({ email: e, password: p });
      setToken(session.token as string);
      onLoggedIn(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function resetDemo() {
    setSeeding(true);
    setError(null);
    try {
      await seed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 p-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-xl">
          <Landmark className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deposit Account Servicing</h1>
          <p className="text-muted-foreground text-sm">
            One governed rule layer for every debit, credit, and hold.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sign in as a demo role</CardTitle>
          <CardDescription>
            The same screens gate differently by role. Pick one to see what each can and cannot do. Access
            is enforced in the API layer, so a hidden button is still refused if it is called directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {DEMO_USERS.map((u) => {
            const Icon = u.icon;
            return (
              <button
                key={u.role}
                disabled={busy}
                onClick={() => signIn(DEMO_CREDENTIALS[u.role].email, DEMO_CREDENTIALS[u.role].password)}
                className="border-border hover:border-primary hover:bg-accent flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors disabled:opacity-60"
              >
                <div className="flex items-center gap-2">
                  <Icon className="text-primary size-5" />
                  <span className="font-medium">{u.label}</span>
                </div>
                <span className="text-muted-foreground text-xs leading-snug">{u.note}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Or sign in by email</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(ev) => {
              ev.preventDefault();
              void signIn(email, password);
            }}
          >
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(ev) => setEmail(ev.target.value)} placeholder="tara@bank.example" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(ev) => setPassword(ev.target.value)} placeholder="teller-demo" />
            </div>
            <Button type="submit" disabled={busy || !email || !password}>
              <LogIn className="size-4" /> Sign in
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}

      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>Fresh ephemeral empty or stale? Reload the seed data.</span>
        <Button variant="outline" size="sm" onClick={() => void resetDemo()} disabled={seeding}>
          {seeding ? "Resetting…" : "Reset demo data"}
        </Button>
      </div>
    </main>
  );
}
