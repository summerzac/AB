"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Order {
  id: string;
  status: string;
  subtotal: string;
  shippingCost: string | null;
  total: string | null;
  createdAt: string;
  items: { quantity: number; unitPrice: string; variant: { sku: string; attributes: Record<string, string>; product: { title: string } } }[];
  shipment: { carrier: string | null; service: string | null; trackingCode: string | null; trackingUrl: string | null; status: string } | null;
  manufacturer: { companyName: string };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tracking, setTracking] = useState<Record<string, string>>({});

  useEffect(() => {
    api<{ orders: Order[] }>("/api/orders").then((r) => setOrders(r.orders));
  }, []);

  async function refreshTracking(orderId: string) {
    const res = await api<{ status: string }>(`/api/orders/${orderId}/tracking`);
    setTracking((prev) => ({ ...prev, [orderId]: res.status }));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>
      {orders.length === 0 && <p className="opacity-70 text-sm">No orders yet.</p>}
      <div className="flex flex-col gap-4">
        {orders.map((o) => (
          <div key={o.id} className="rounded-lg border border-black/10 dark:border-white/10 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{o.manufacturer.companyName}</p>
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
            <p className="mt-2 text-sm">
              Subtotal ${Number(o.subtotal).toFixed(2)} + Shipping ${Number(o.shippingCost ?? 0).toFixed(2)} = <strong>${Number(o.total ?? 0).toFixed(2)}</strong>
            </p>
            {o.shipment && (
              <div className="mt-3 text-sm bg-neutral-50 dark:bg-neutral-900 rounded-md p-3">
                <p>
                  {o.shipment.carrier} {o.shipment.service} — tracking <span className="font-mono">{o.shipment.trackingCode}</span>
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <a href={o.shipment.trackingUrl ?? "#"} target="_blank" rel="noreferrer" className="text-orange-600 text-xs">
                    Track package
                  </a>
                  <button onClick={() => refreshTracking(o.id)} className="text-xs underline">
                    Refresh status
                  </button>
                  {tracking[o.id] && <span className="text-xs opacity-70">Status: {tracking[o.id]}</span>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
