"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, API_URL, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Variant {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  price: string;
  currency: string;
  stock: number;
}

interface ProductDetail {
  id: string;
  title: string;
  description: string;
  minOrderQty: number;
  images: { url: string }[];
  variants: Variant[];
  category: { name: string } | null;
  manufacturer: {
    id: string;
    companyName: string;
    description: string | null;
    verified: boolean;
    country: string | null;
  };
}

function imgSrc(url: string) {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [variantId, setVariantId] = useState("");
  const [qty, setQty] = useState(1);
  const [contactMsg, setContactMsg] = useState("");
  const [contactStatus, setContactStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api<{ product: ProductDetail }>(`/api/products/${id}`, { auth: false }).then((r) => {
      setProduct(r.product);
      setVariantId(r.product.variants[0]?.id ?? "");
      setQty(r.product.minOrderQty || 1);
    });
  }, [id]);

  if (!product) return <div className="mx-auto max-w-5xl px-4 py-8">Loading...</div>;

  const variant = product.variants.find((v) => v.id === variantId);

  async function sendContact() {
    if (!user) return router.push("/login");
    if (user.role !== "BUYER") return;
    setSending(true);
    setContactStatus(null);
    try {
      await api("/api/conversations", {
        method: "POST",
        body: {
          manufacturerId: product!.manufacturer.id,
          productId: product!.id,
          message: contactMsg || `Hi, I'm interested in ${product!.title}.`,
        },
      });
      setContactStatus("Message sent! Check your Messages inbox.");
      setContactMsg("");
    } catch (err) {
      setContactStatus(err instanceof ApiError ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  function goToCheckout() {
    if (!user) return router.push("/login");
    if (!variant) return;
    router.push(`/checkout/${variant.id}?qty=${qty}`);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 grid md:grid-cols-2 gap-8">
      <div>
        <div className="aspect-square bg-neutral-100 dark:bg-neutral-900 rounded-lg overflow-hidden">
          {product.images[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgSrc(product.images[0].url)} alt={product.title} className="w-full h-full object-cover" />
          )}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide opacity-60">{product.category?.name}</p>
        <h1 className="text-2xl font-bold mt-1">{product.title}</h1>
        <p className="text-sm mt-2 opacity-80">{product.description}</p>
        <p className="text-sm mt-2 opacity-70">Min. order: {product.minOrderQty} units</p>

        <div className="mt-4 rounded-md border border-black/10 dark:border-white/10 p-3">
          <p className="text-sm font-medium">{product.manufacturer.companyName}{product.manufacturer.verified && " ✓ Verified"}</p>
          <p className="text-xs opacity-60">{product.manufacturer.country}</p>
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium block mb-1">Variant</label>
          <select
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2"
          >
            {product.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(", ")} — ${Number(v.price).toFixed(2)} ({v.stock} in stock)
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <label className="text-sm font-medium">Quantity</label>
          <input
            type="number"
            min={product.minOrderQty}
            max={variant?.stock ?? undefined}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="w-28 rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2"
          />
        </div>

        {variant && (
          <p className="mt-2 text-lg font-semibold text-orange-600">
            Subtotal: ${(Number(variant.price) * qty).toFixed(2)}
          </p>
        )}

        <button
          onClick={goToCheckout}
          disabled={!variant || qty < 1 || qty > (variant?.stock ?? 0)}
          className="mt-4 w-full rounded-md bg-orange-600 text-white py-2.5 font-medium hover:bg-orange-700 disabled:opacity-50"
        >
          Buy now &amp; get shipping quote
        </button>

        <div className="mt-8 border-t border-black/10 dark:border-white/10 pt-4">
          <h2 className="font-medium mb-2">Contact this manufacturer</h2>
          <textarea
            value={contactMsg}
            onChange={(e) => setContactMsg(e.target.value)}
            placeholder={`Hi, I'm interested in ${product.title}...`}
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
            rows={3}
          />
          <button
            onClick={sendContact}
            disabled={sending}
            className="mt-2 rounded-md bg-neutral-800 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-700 disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send message"}
          </button>
          {contactStatus && <p className="text-sm mt-2 opacity-80">{contactStatus}</p>}
        </div>
      </div>
    </div>
  );
}
