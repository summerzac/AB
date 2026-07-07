"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Order {
  id: string;
  status: string;
  subtotal: string;
  shippingCost: string | null;
  total: string | null;
  createdAt: string;
  buyer: { name: string; email: string };
  shippingAddress: { name: string; street1: string; city: string; state: string; zip: string; country: string };
  items: { quantity: number; unitPrice: string; variant: { sku: string; attributes: Record<string, string>; product: { title: string } } }[];
  shipment: { carrier: string | null; service: string | null; trackingCode: string | null; labelUrl: string | null } | null;
}

export default function ManufacturerOrdersPage() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (user?.role === "MANUFACTURER") {
      api<{ orders: Order[] }>("/api/orders").then((r) => setOrders(r.orders));
    }
  }, [user]);

  if (loading) return null;
  if (user?.role !== "MANUFACTURER") return <div className="mx-auto max-w-4xl px-4 py-8">Manufacturer account required.</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Incoming Orders</h1>
      {orders.length === 0 && <p className="text-sm opacity-60">No orders yet.</p>}
      <div className="flex flex-col gap-4">
        {orders.map((o) => (
          <div key={o.id} className="rounded-lg border border-black/10 dark:border-white/10 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{o.buyer.name} ({o.buyer.email})</p>
                <p className="text-xs opacity-60">{new Date(o.createdAt).toLocaleString()}</p>
              </div>
              <span className="text-xs rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-1">{o.status}</span>
            </div>
            <ul className="mt-2 text-sm">
              {o.items.map((it, idx) => (
                <li key={idx}>
                  {it.quantity}× {it.variant.product.title} ({Object.values(it.variant.attributes).join(", ")}) — ${Number(it.unitPrice).toFixed(2)}/unit
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm opacity-80">
              Ship to: {o.shippingAddress.name}, {o.shippingAddress.street1}, {o.shippingAddress.city}, {o.shippingAddress.state} {o.shippingAddress.zip}, {o.shippingAddress.country}
            </p>
            <p className="mt-1 text-sm">
              Total: <strong>${Number(o.total ?? 0).toFixed(2)}</strong> (incl. ${Number(o.shippingCost ?? 0).toFixed(2)} shipping)
            </p>
            {o.shipment && (
              <div className="mt-2 text-sm bg-neutral-50 dark:bg-neutral-900 rounded-md p-3">
                <p>{o.shipment.carrier} {o.shipment.service} — {o.shipment.trackingCode}</p>
                {o.shipment.labelUrl && (
                  <a href={o.shipment.labelUrl} target="_blank" rel="noreferrer" className="text-orange-600 text-xs">
                    Download shipping label
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
