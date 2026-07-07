"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, API_URL } from "@/lib/api";

interface ProductListItem {
  id: string;
  title: string;
  description: string;
  images: { url: string }[];
  variants: { price: string; currency: string }[];
  category: { name: string } | null;
  manufacturer: { companyName: string; verified: boolean; country: string | null };
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

function imgSrc(url: string) {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function HomePage() {
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ categories: Category[] }>("/api/categories", { auth: false }).then((r) => setCategories(r.categories));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoryId) params.set("categoryId", categoryId);
    api<{ items: ProductListItem[] }>(`/api/products?${params.toString()}`, { auth: false })
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [q, categoryId]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="mb-8 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white p-8">
        <h1 className="text-3xl font-bold mb-2">Source directly from manufacturers</h1>
        <p className="text-white/90 max-w-2xl">
          Browse verified manufacturers, chat directly about custom orders, and check out with
          real-time shipping rates and tracking.
        </p>
      </section>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products..."
          className="flex-1 rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm opacity-70">Loading products...</p>
      ) : items.length === 0 ? (
        <p className="text-sm opacity-70">No products found.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="rounded-lg border border-black/10 dark:border-white/10 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-square bg-neutral-100 dark:bg-neutral-900">
                {p.images[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imgSrc(p.images[0].url)} alt={p.title} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-3">
                <p className="font-medium text-sm line-clamp-2">{p.title}</p>
                <p className="text-orange-600 font-semibold mt-1">
                  {p.variants[0] ? `from $${Number(p.variants[0].price).toFixed(2)}` : ""}
                </p>
                <p className="text-xs opacity-70 mt-1">
                  {p.manufacturer.companyName}
                  {p.manufacturer.verified && " ✓"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
