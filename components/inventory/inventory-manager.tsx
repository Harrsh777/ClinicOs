"use client";

import { useState, useTransition } from "react";
import { createInventoryItemAction, recordInventoryTxAction } from "@/lib/actions/inventory";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reorder_level: number;
}

export function InventoryManager({ items }: { items: InventoryItem[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="font-semibold mb-4">Add Item</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(() => { void createInventoryItemAction(new FormData(e.currentTarget)); });
          }}
          className="space-y-3"
        >
          <Input label="Name" name="name" required placeholder="Surgical Gloves" />
          <Select
            label="Category"
            name="category"
            options={[
              { value: "supplies", label: "Supplies" },
              { value: "ppe", label: "PPE" },
              { value: "test_kits", label: "Test Kits" },
              { value: "other", label: "Other" },
            ]}
          />
          <Input label="Initial Quantity" name="quantity" type="number" defaultValue="100" />
          <Input label="Reorder Level" name="reorderLevel" type="number" defaultValue="20" />
          <Button type="submit" loading={pending}>Add Item</Button>
        </form>
      </Card>

      <Card>
        <h3 className="font-semibold mb-4">Stock Movement</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(() => { void recordInventoryTxAction(new FormData(e.currentTarget)); });
          }}
          className="space-y-3"
        >
          <Select
            label="Item"
            name="itemId"
            required
            options={[{ value: "", label: "Select..." }, ...items.map((i) => ({ value: i.id, label: i.name }))]}
          />
          <Select
            label="Type"
            name="txType"
            options={[
              { value: "in", label: "Stock In" },
              { value: "out", label: "Stock Out" },
              { value: "adjustment", label: "Adjustment" },
            ]}
          />
          <Input label="Quantity" name="quantity" type="number" required />
          <Input label="Reason" name="reason" placeholder="Purchase, usage, etc." />
          <Button type="submit" loading={pending}>Record</Button>
        </form>
      </Card>

      <div className="lg:col-span-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Reorder At</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="capitalize">{item.category}</TableCell>
                <TableCell>{item.quantity} {item.unit}</TableCell>
                <TableCell>{item.reorder_level}</TableCell>
                <TableCell>
                  <StatusBadge status={item.quantity <= item.reorder_level ? "pending" : "active"} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
