import { useEffect, useState } from "react";
import { Landmark, LogOut, Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  listAccounts,
  openAccount,
  type Account,
  type Customer,
  type LoginResponse,
} from "@/lib/api";
import { money, titleCase } from "@/lib/format";
import { RoleBadge, StatusBadge } from "./badges";

export function AccountsList({
  session,
  onOpen,
  onSignOut,
}: {
  session: LoginResponse;
  onOpen: (id: number) => void;
  onSignOut: () => void;
}) {
  const role = session.role;
  const canWrite = role !== "viewer";

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showNew, setShowNew] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [number, setNumber] = useState("");
  const [type, setType] = useState("checking");
  const [overdraft, setOverdraft] = useState("0");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listAccounts();
      setAccounts(data.accounts as Account[]);
      setCustomers(data.customers as Customer[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load accounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const customerName = (id: unknown) =>
    customers.find((c) => Number(c.id) === Number(id))?.name ?? "Unknown";

  async function submitNew(ev: React.FormEvent) {
    ev.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await openAccount({
        customer_id: Number(customerId),
        account_number: number,
        type: type as "checking" | "savings",
        overdraft_limit: Number(overdraft),
      });
      setShowNew(false);
      setNumber("");
      setOverdraft("0");
      setCustomerId("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg">
            <Landmark className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Deposit Account Servicing</h1>
            <p className="text-muted-foreground text-sm">Signed in as {session.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RoleBadge role={role} />
          <Button variant="outline" size="sm" onClick={onSignOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Accounts</CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => void refresh()}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
            {canWrite && (
              <Button size="sm" onClick={() => setShowNew((s) => !s)}>
                <Plus className="size-4" /> New account
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showNew && canWrite && (
            <form
              onSubmit={submitNew}
              className="bg-muted/40 mb-5 grid gap-3 rounded-lg border p-4 sm:grid-cols-5 sm:items-end"
            >
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={String(c.id)} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Number</Label>
                <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="CHK-1005" />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Overdraft</Label>
                <Input
                  type="number"
                  value={overdraft}
                  onChange={(e) => setOverdraft(e.target.value)}
                  min="0"
                />
              </div>
              <div className="sm:col-span-5">
                <Button type="submit" disabled={saving || !customerId || !number}>
                  {saving ? "Opening…" : "Open account"}
                </Button>
              </div>
            </form>
          )}

          {loading ? (
            <p className="text-muted-foreground py-8 text-center text-sm">Loading accounts…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow
                    key={String(a.id)}
                    className="cursor-pointer"
                    onClick={() => onOpen(Number(a.id))}
                  >
                    <TableCell className="font-medium">{a.account_number}</TableCell>
                    <TableCell>{customerName(a.customer_id)}</TableCell>
                    <TableCell>{titleCase(a.type)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(a.balance)}</TableCell>
                    <TableCell>
                      <StatusBadge status={String(a.status)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="text-destructive mt-4 text-sm" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
