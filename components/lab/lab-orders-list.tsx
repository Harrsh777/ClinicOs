"use client";

import { useState, useTransition } from "react";
import { uploadLabReportAction } from "@/lib/actions/lab";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

interface LabOrder {
  id: string;
  status: string;
  created_at: string;
  patients?: { full_name: string };
  lab_order_items?: { lab_tests?: { name: string; code: string }; price: number }[];
  lab_reports?: { ai_summary: string | null }[];
}

export function LabOrdersList({ orders }: { orders: LabOrder[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [message, setMessage] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id} padding className="!p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium">{order.patients?.full_name}</p>
              <p className="text-sm text-[var(--text-muted)]">
                {(order.lab_order_items ?? []).map((i) => i.lab_tests?.name).filter(Boolean).join(", ")}
              </p>
              <div className="mt-2"><StatusBadge status={order.status} /></div>
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--text-muted)]">{new Date(order.created_at).toLocaleDateString()}</p>
              {order.status !== "completed" && (
                <Button size="sm" className="mt-2" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                  Upload Report
                </Button>
              )}
            </div>
          </div>

          {order.lab_reports?.[0]?.ai_summary && (
            <Alert variant="info" className="mt-4">
              <strong>AI Summary:</strong> {order.lab_reports[0].ai_summary}
            </Alert>
          )}

          {expanded === order.id && (
            <form
              className="mt-4 pt-4 border-t border-[var(--border)] space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  const fd = new FormData(e.currentTarget);
                  fd.set("orderId", order.id);
                  const result = await uploadLabReportAction(fd);
                  setMessage((m) => ({
                    ...m,
                    [order.id]: result?.error ?? `Report uploaded. ${result.summary ?? ""}`,
                  }));
                  if (result?.success) setExpanded(null);
                });
              }}
            >
              <Input label="Glucose (mg/dL)" name="glucose" type="number" placeholder="126" />
              <input type="hidden" name="resultValues" value="" id={`rv-${order.id}`} />
              <Input label="Upload PDF/Image" name="file" type="file" accept=".pdf,image/*" />
              <Button type="submit" loading={pending}>Upload & Analyze</Button>
              {message[order.id] && <Alert variant="success">{message[order.id]}</Alert>}
            </form>
          )}
        </Card>
      ))}
    </div>
  );
}
