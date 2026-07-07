"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Address {
  id: string;
  name: string;
  street1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface Rate {
  id: string;
  carrier: string;
  service: string;
  rate: number;
  currency: string;
  deliveryDays: number | null;
}

export default function CheckoutPage() {
  const { variantId } = useParams<{ variantId: string }>();
  const searchParams = useSearchParams();
  const qty = Number(searchParams.get("qty") || "1");
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: "",
    street1: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });

  const [subtotal, setSubtotal] = useState<number | null>(null);
  const [shipmentId, setShipmentId] = useState<string | null>(null);
  const [rates, setRates] = useState<Rate[]>([]);
  const [rateId, setRateId] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    api<{ addresses: Address[] }>("/api/addresses").then((r) => {
      setAddresses(r.addresses);
      if (r.addresses[0]) setAddressId(r.addresses[0].id);
      else setShowNewAddress(true);
    });
  }, [user]);

  async function saveAddress() {
    const res = await api<{ address: Address }>("/api/addresses", { method: "POST", body: newAddress });
    setAddresses((prev) => [res.address, ...prev]);
    setAddressId(res.address.id);
    setShowNewAddress(false);
  }

  async function getQuote() {
    setError(null);
    setQuoting(true);
    setRates([]);
    setRateId("");
    try {
      const res = await api<{ subtotal: number; quote: { shipmentId: string; rates: Rate[] } }>("/api/orders/quote", {
        method: "POST",
        body: { variantId, quantity: qty, shippingAddressId: addressId },
      });
      setSubtotal(res.subtotal);
      setShipmentId(res.quote.shipmentId);
      setRates(res.quote.rates);
      if (res.quote.rates[0]) setRateId(res.quote.rates[0].id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to get shipping quote");
    } finally {
      setQuoting(false);
    }
  }

  async function placeOrder() {
    if (!shipmentId || !rateId) return;
    setPlacing(true);
    setError(null);
    try {
      const res = await api<{ order: { id: string } }>("/api/orders", {
        method: "POST",
        body: { variantId, quantity: qty, shippingAddressId: addressId, shipmentId, rateId },
      });
      setOrderId(res.order.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to place order");
    } finally {
      setPlacing(false);
    }
  }

  const selectedRate = rates.find((r) => r.id === rateId);

  if (orderId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Order placed!</h1>
        <p className="opacity-80 mb-6">Your shipping label has been purchased and the order is on its way.</p>
        <button
          onClick={() => router.push("/orders")}
          className="rounded-md bg-orange-600 text-white px-5 py-2.5 font-medium hover:bg-orange-700"
        >
          View my orders
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <section className="mb-6">
        <h2 className="font-medium mb-2">Shipping address</h2>
        {addresses.length > 0 && !showNewAddress && (
          <select
            value={addressId}
            onChange={(e) => setAddressId(e.target.value)}
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 mb-2"
          >
            {addresses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.street1}, {a.city}, {a.state} {a.zip}
              </option>
            ))}
          </select>
        )}
        {!showNewAddress && (
          <button onClick={() => setShowNewAddress(true)} className="text-sm text-orange-600">
            + Use a new address
          </button>
        )}
        {showNewAddress && (
          <div className="flex flex-col gap-2 mt-2">
            {(["name", "street1", "city", "state", "zip"] as const).map((field) => (
              <input
                key={field}
                placeholder={field}
                value={(newAddress as any)[field]}
                onChange={(e) => setNewAddress({ ...newAddress, [field]: e.target.value })}
                className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
              />
            ))}
            <button onClick={saveAddress} className="self-start text-sm rounded-md bg-neutral-800 text-white px-3 py-1.5">
              Save address
            </button>
          </div>
        )}
      </section>

      <button
        onClick={getQuote}
        disabled={!addressId || quoting}
        className="w-full rounded-md bg-neutral-800 text-white py-2.5 font-medium hover:bg-neutral-700 disabled:opacity-50"
      >
        {quoting ? "Getting shipping rates..." : "Get shipping rates"}
      </button>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      {rates.length > 0 && (
        <section className="mt-6">
          <h2 className="font-medium mb-2">Choose a shipping option</h2>
          <div className="flex flex-col gap-2">
            {rates.map((r) => (
              <label
                key={r.id}
                className={`flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer ${
                  rateId === r.id ? "border-orange-600" : "border-black/15 dark:border-white/15"
                }`}
              >
                <span className="flex items-center gap-2 text-sm">
                  <input type="radio" name="rate" checked={rateId === r.id} onChange={() => setRateId(r.id)} />
                  {r.carrier} {r.service} {r.deliveryDays ? `(${r.deliveryDays} days)` : ""}
                </span>
                <span className="font-medium">${r.rate.toFixed(2)}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 flex justify-between text-sm">
            <span>Subtotal</span>
            <span>${subtotal?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Shipping</span>
            <span>${selectedRate?.rate.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold mt-1 text-lg">
            <span>Total</span>
            <span>${((subtotal ?? 0) + (selectedRate?.rate ?? 0)).toFixed(2)}</span>
          </div>

          <button
            onClick={placeOrder}
            disabled={placing || !rateId}
            className="mt-4 w-full rounded-md bg-orange-600 text-white py-2.5 font-medium hover:bg-orange-700 disabled:opacity-50"
          >
            {placing ? "Placing order..." : "Confirm & purchase shipping label"}
          </button>
        </section>
      )}
    </div>
  );
}
