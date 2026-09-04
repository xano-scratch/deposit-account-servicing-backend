import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  Check,
  Lock,
  Plus,
  Snowflake,
  Sun,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  freezeAccount,
  getAccount,
  placeHold,
  postTransaction,
  releaseHold,
  type AccountDetail as AccountDetailT,
  type LoginResponse,
  type Staff,
} from "@/lib/api";
import { money, num, titleCase, when } from "@/lib/format";
import { eventTone, RoleBadge, StatusBadge } from "./badges";

// The posting engine rejects with an HTTP 4xx and the reason in the body, so a
// rejection arrives as a thrown error. Either outcome renders in one banner.
type PostOutcome = { ok: true; balanceAfter: unknown } | { ok: false; reason: string };

export function AccountDetail({
  session,
  accountId,
  onBack,
  autoReject = false,
}: {
  session: LoginResponse;
  accountId: number;
  onBack: () => void;
  autoReject?: boolean;
}) {
  const role = session.role;
  const canWrite = role !== "viewer";
  const isSupervisor = role === "supervisor";

  const [detail, setDetail] = useState<AccountDetailT | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [postOutcome, setPostOutcome] = useState<PostOutcome | null>(null);
  const [direction, setDirection] = useState("debit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [posting, setPosting] = useState(false);

  const [holdAmount, setHoldAmount] = useState("");
  const [holdReason, setHoldReason] = useState("");
  const [placing, setPlacing] = useState(false);
  const [busyHoldId, setBusyHoldId] = useState<number | null>(null);
  const [freezing, setFreezing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDetail(await getAccount(accountId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the account.");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    void load();
  }, [load]);

  // For the demo deep link: post one over-limit debit so the rejection banner is
  // visible without a click. Runs once, only for a role that may post.
  const autoRan = useRef(false);
  useEffect(() => {
    if (!autoReject || autoRan.current || !detail || !detail.account || !canWrite) return;
    autoRan.current = true;
    const over = num(detail.available) + num(detail.account.overdraft_limit) + 250;
    void (async () => {
      try {
        const r = await postTransaction({
          account_id: accountId,
          direction: "debit",
          amount: over,
          description: "Attempted large withdrawal",
        });
        setPostOutcome({ ok: true, balanceAfter: r.balance_after });
      } catch (err) {
        setPostOutcome({ ok: false, reason: err instanceof Error ? err.message : "Posting rejected." });
      }
      await load();
    })();
  }, [autoReject, detail, canWrite, accountId, load]);

  const staffName = (id: unknown): string => {
    const s = (detail?.staff ?? []).find((x: Staff) => Number(x.id) === Number(id));
    return s?.name ?? "—";
  };

  async function submitPost(ev: React.FormEvent) {
    ev.preventDefault();
    setPosting(true);
    setActionError(null);
    setPostOutcome(null);
    try {
      const r = await postTransaction({
        account_id: accountId,
        direction: direction as "debit" | "credit",
        amount: Number(amount),
        description: description || undefined,
      });
      setPostOutcome({ ok: true, balanceAfter: r.balance_after });
      setAmount("");
      setDescription("");
      await load();
    } catch (err) {
      // A rule rejection lands here with the reason as the message.
      setPostOutcome({ ok: false, reason: err instanceof Error ? err.message : "Posting rejected." });
      await load();
    } finally {
      setPosting(false);
    }
  }

  async function submitHold(ev: React.FormEvent) {
    ev.preventDefault();
    setPlacing(true);
    setActionError(null);
    try {
      await placeHold({ account_id: accountId, amount: Number(holdAmount), reason: holdReason });
      setHoldAmount("");
      setHoldReason("");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not place the hold.");
    } finally {
      setPlacing(false);
    }
  }

  async function doRelease(holdId: number) {
    setBusyHoldId(holdId);
    setActionError(null);
    try {
      await releaseHold({ hold_id: holdId });
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not release the hold.");
    } finally {
      setBusyHoldId(null);
    }
  }

  async function doFreeze() {
    setFreezing(true);
    setActionError(null);
    try {
      await freezeAccount({ account_id: accountId });
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not change the status.");
    } finally {
      setFreezing(false);
    }
  }

  if (loading && !detail) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" /> Accounts
        </Button>
        <p className="text-muted-foreground py-16 text-center text-sm">Loading account…</p>
      </main>
    );
  }

  if (error || !detail || !detail.account) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" /> Accounts
        </Button>
        <p className="text-destructive py-16 text-center text-sm">{error ?? "Account not found."}</p>
      </main>
    );
  }

  const acct = detail.account;
  const frozen = String(acct.status) === "frozen";
  const closed = String(acct.status) === "closed";
  const activeHolds = detail.holds.filter((h) => String(h.status) === "active");

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" /> Accounts
        </Button>
        <RoleBadge role={role} />
      </div>

      {/* Header + balances */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl">{acct.account_number}</CardTitle>
              <StatusBadge status={String(acct.status)} />
              <Badge variant="secondary">{titleCase(acct.type)}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {detail.customer?.name ?? "Unknown customer"}
            </p>
          </div>
          {isSupervisor && !closed && (
            <Button variant={frozen ? "default" : "outline"} size="sm" onClick={() => void doFreeze()} disabled={freezing}>
              {frozen ? <Sun className="size-4" /> : <Snowflake className="size-4" />}
              {frozen ? "Unfreeze" : "Freeze"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Stat label="Posted balance" value={money(acct.balance)} />
          <Stat label="On hold" value={money(detail.held)} tone="muted" />
          <Stat label="Available balance" value={money(detail.available)} tone="primary" />
        </CardContent>
      </Card>

      {/* Governed outcome banner */}
      {postOutcome && (
        <div
          role="status"
          className={
            postOutcome.ok
              ? "border-primary/40 bg-primary/10 text-foreground flex items-start gap-3 rounded-lg border p-4"
              : "border-destructive/50 bg-destructive/10 text-foreground flex items-start gap-3 rounded-lg border p-4"
          }
        >
          {postOutcome.ok ? (
            <Check className="text-primary mt-0.5 size-5 shrink-0" />
          ) : (
            <Ban className="text-destructive mt-0.5 size-5 shrink-0" />
          )}
          <div className="text-sm">
            <p className="font-medium">
              {postOutcome.ok
                ? `Posted. New balance ${money(postOutcome.balanceAfter)}.`
                : "Posting rejected by the rule layer."}
            </p>
            {!postOutcome.ok && <p className="text-muted-foreground">{postOutcome.reason}</p>}
          </div>
        </div>
      )}

      {actionError && (
        <div className="border-destructive/50 bg-destructive/10 text-foreground flex items-center gap-2 rounded-lg border p-3 text-sm">
          <Lock className="text-destructive size-4" /> {actionError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Actions */}
        <div className="space-y-6">
          {canWrite ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Post a transaction</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submitPost} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Direction</Label>
                        <Select value={direction} onValueChange={setDirection}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="debit">Debit</SelectItem>
                            <SelectItem value="credit">Credit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Amount</Label>
                        <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Description</Label>
                      <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Supplier payment" />
                    </div>
                    <Button type="submit" disabled={posting || !amount}>
                      <Plus className="size-4" /> {posting ? "Posting…" : "Post transaction"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Place a hold</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submitHold} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Amount</Label>
                        <Input type="number" min="0" step="0.01" value={holdAmount} onChange={(e) => setHoldAmount(e.target.value)} placeholder="0.00" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Reason</Label>
                        <Input value={holdReason} onChange={(e) => setHoldReason(e.target.value)} placeholder="e.g. Wire review" />
                      </div>
                    </div>
                    <Button type="submit" variant="outline" disabled={placing || !holdAmount || !holdReason}>
                      {placing ? "Placing…" : "Place hold"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
                <Lock className="size-4" /> A viewer can read this account but cannot post, hold, or freeze.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Active holds */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active holds</CardTitle>
          </CardHeader>
          <CardContent>
            {activeHolds.length === 0 ? (
              <p className="text-muted-foreground text-sm">No active holds. Available equals the posted balance.</p>
            ) : (
              <ul className="space-y-3">
                {activeHolds.map((h) => (
                  <li key={String(h.id)} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div>
                      <p className="font-medium tabular-nums">{money(h.amount)}</p>
                      <p className="text-muted-foreground text-xs">{h.reason}</p>
                      <p className="text-muted-foreground text-xs">Placed by {staffName(h.placed_by)}</p>
                    </div>
                    {isSupervisor && (
                      <Button variant="outline" size="sm" onClick={() => void doRelease(Number(h.id))} disabled={busyHoldId === Number(h.id)}>
                        <X className="size-4" /> Release
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Immutable ledger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ledger</CardTitle>
          <p className="text-muted-foreground text-sm">Append only. Every accepted posting is recorded here and never edited.</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Direction</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance after</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Posted by</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.ledger.map((t) => (
                <TableRow key={String(t.id)}>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      {String(t.direction) === "credit" ? (
                        <ArrowUpRight className="size-4 text-primary" />
                      ) : (
                        <ArrowDownLeft className="text-muted-foreground size-4" />
                      )}
                      {titleCase(t.direction)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(t.amount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(t.balance_after)}</TableCell>
                  <TableCell className="text-muted-foreground">{t.description || "—"}</TableCell>
                  <TableCell>{staffName(t.posted_by)}</TableCell>
                  <TableCell className="text-muted-foreground">{when(t.created_at)}</TableCell>
                </TableRow>
              ))}
              {detail.ledger.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground text-center">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Audit trail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Servicing audit trail</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {detail.events.map((e) => (
              <li key={String(e.id)} className="flex items-start gap-3">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full bg-current ${eventTone(String(e.event_type))}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`text-sm font-medium ${eventTone(String(e.event_type))}`}>
                      {titleCase(e.event_type)}
                    </span>
                    <span className="text-muted-foreground text-xs">{when(e.created_at)}</span>
                  </div>
                  <p className="text-muted-foreground text-sm">{e.detail}</p>
                  <p className="text-muted-foreground text-xs">by {staffName(e.actor)}</p>
                </div>
              </li>
            ))}
            {detail.events.length === 0 && (
              <li className="text-muted-foreground text-sm">No servicing events yet.</li>
            )}
          </ol>
        </CardContent>
      </Card>

      <Separator />
      <p className="text-muted-foreground pb-6 text-center text-xs">
        Balance is derived from the append only ledger. Available balance and every posting rule live once in
        the API layer, enforced the same way for every caller.
      </p>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "primary" | "muted" }) {
  return (
    <div
      className={
        tone === "primary"
          ? "border-primary/40 bg-primary/5 rounded-lg border p-4"
          : "bg-muted/40 rounded-lg border p-4"
      }
    >
      <p className="text-muted-foreground text-xs uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone === "primary" ? "text-primary" : ""}`}>
        {value}
      </p>
    </div>
  );
}
