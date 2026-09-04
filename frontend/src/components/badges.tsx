import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/lib/format";

type Variant = "default" | "secondary" | "destructive" | "outline";

const ACCOUNT_STATUS: Record<string, Variant> = {
  active: "default",
  frozen: "destructive",
  closed: "secondary",
};

const HOLD_STATUS: Record<string, Variant> = {
  active: "default",
  released: "secondary",
};

export function StatusBadge({ status }: { status: string }) {
  const variant = ACCOUNT_STATUS[status] ?? HOLD_STATUS[status] ?? "outline";
  return <Badge variant={variant}>{titleCase(status)}</Badge>;
}

export function RoleBadge({ role }: { role: string | null | undefined }) {
  return (
    <Badge variant="outline" className="capitalize">
      {role ?? "unknown"}
    </Badge>
  );
}

const EVENT_TONE: Record<string, string> = {
  account_opened: "text-primary",
  frozen: "text-destructive",
  unfrozen: "text-primary",
  hold_placed: "text-amber-500",
  hold_released: "text-primary",
  posting_rejected: "text-destructive",
};

export function eventTone(eventType: string): string {
  return EVENT_TONE[eventType] ?? "text-muted-foreground";
}
