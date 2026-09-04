import { useEffect, useState } from "react";

import { AccountDetail } from "@/components/AccountDetail";
import { AccountsList } from "@/components/AccountsList";
import { Login } from "@/components/Login";
import { DEMO_CREDENTIALS, login, setToken, type LoginResponse } from "@/lib/api";

export default function App() {
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [autoReject, setAutoReject] = useState(false);
  const [booting, setBooting] = useState(true);

  // Deep link support: `?demo=<role>&account=<id>&reject=1` auto signs in with a
  // seeded role and opens an account. Used for shareable demo links and the
  // landing-page screenshot; the normal flow is the login screen.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demo = params.get("demo");
    const account = params.get("account");
    const reject = params.get("reject");

    async function boot() {
      if (demo && DEMO_CREDENTIALS[demo]) {
        try {
          const s = await login(DEMO_CREDENTIALS[demo]);
          setToken(s.token as string);
          setSession(s);
          if (account) {
            setAccountId(Number(account));
            if (reject) setAutoReject(true);
          }
        } catch {
          // fall through to the login screen
        }
      }
      setBooting(false);
    }

    void boot();
  }, []);

  function signOut() {
    setToken(null);
    setSession(null);
    setAccountId(null);
    setAutoReject(false);
  }

  if (booting) {
    return (
      <div className="text-muted-foreground grid min-h-screen place-items-center text-sm">Loading…</div>
    );
  }

  if (!session) {
    return <Login onLoggedIn={setSession} />;
  }

  if (accountId != null) {
    return (
      <AccountDetail
        session={session}
        accountId={accountId}
        autoReject={autoReject}
        onBack={() => {
          setAccountId(null);
          setAutoReject(false);
        }}
      />
    );
  }

  return <AccountsList session={session} onOpen={(id) => setAccountId(id)} onSignOut={signOut} />;
}
