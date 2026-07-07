"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Variant {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  price: string;
  stock: number;
}

interface Product {
  id: string;
  title: string;
  published: boolean;
  images: { url: string }[];
  variants: Variant[];
}

function imgSrc(url: string) {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function MyProductsPage() {
  const { user, loading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (user?.role === "MANUFACTURER") {
      api<{ items: Product[] }>("/api/products/mine").then((r) => setProducts(r.items));
    }
  }, [user]);

  async function togglePublish(p: Product) {
    await api(`/api/products/${p.id}`, { method: "PATCH", body: { published: !p.published } });
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, published: !x.published } : x)));
  }

  async function remove(p: Product) {
    if (!confirm(`Delete "${p.title}"?`)) return;
    await api(`/api/products/${p.id}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
  }

  if (loading) return null;
  if (user?.role !== "MANUFACTURER") return <div className="mx-auto max-w-4xl px-4 py-8">Manufacturer account required.</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Products</h1>
        <Link href="/dashboard/products/new" className="rounded-md bg-orange-600 text-white px-4 py-2 text-sm font-medium">
          + New product
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-4 rounded-lg border border-black/10 dark:border-white/10 p-3">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-900 rounded overflow-hidden shrink-0">
              {p.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgSrc(p.images[0].url)} alt={p.title} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium">{p.title}</p>
              <p className="text-xs opacity-60">{p.variants.length} variant(s)</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${p.published ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-neutral-200 dark:bg-neutral-800"}`}>
              {p.published ? "Published" : "Draft"}
            </span>
            <button onClick={() => togglePublish(p)} className="text-xs underline">
              {p.published ? "Unpublish" : "Publish"}
            </button>
            <button onClick={() => remove(p)} className="text-xs text-red-600 underline">
              Delete
            </button>
          </div>
        ))}
        {products.length === 0 && <p className="text-sm opacity-60">No products yet. Create your first one!</p>}
      </div>
    </div>
  );
}
