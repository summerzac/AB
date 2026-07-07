"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface VariantForm {
  sku: string;
  attributesText: string;
  price: string;
  stock: string;
  weightOz: string;
  lengthIn: string;
  widthIn: string;
  heightIn: string;
}

function emptyVariant(): VariantForm {
  return { sku: "", attributesText: "color: Black", price: "", stock: "100", weightOz: "16", lengthIn: "6", widthIn: "6", heightIn: "6" };
}

function parseAttributes(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of text.split(",")) {
    const [k, v] = pair.split(":").map((s) => s.trim());
    if (k && v) out[k] = v;
  }
  return out;
}

export default function NewProductPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [minOrderQty, setMinOrderQty] = useState("100");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [variants, setVariants] = useState<VariantForm[]>([emptyVariant()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api<{ categories: { id: string; name: string }[] }>("/api/categories", { auth: false }).then((r) => setCategories(r.categories));
  }, []);

  if (loading) return null;
  if (user?.role !== "MANUFACTURER") return <div className="mx-auto max-w-2xl px-4 py-8">Manufacturer account required.</div>;

  function updateVariant(idx: number, field: keyof VariantForm, value: string) {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      let images: string[] = [];
      if (files && files.length > 0) {
        const formData = new FormData();
        Array.from(files).forEach((f) => formData.append("files", f));
        const uploadRes = await api<{ urls: string[] }>("/api/uploads", { method: "POST", formData });
        images = uploadRes.urls;
      }

      await api("/api/products", {
        method: "POST",
        body: {
          title,
          description,
          categoryId: categoryId || undefined,
          minOrderQty: Number(minOrderQty),
          images,
          variants: variants.map((v) => ({
            sku: v.sku,
            attributes: parseAttributes(v.attributesText),
            price: Number(v.price),
            stock: Number(v.stock),
            weightOz: Number(v.weightOz),
            lengthIn: Number(v.lengthIn),
            widthIn: Number(v.widthIn),
            heightIn: Number(v.heightIn),
          })),
        },
      });
      router.push("/dashboard/products");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">New Product</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input
          required
          placeholder="Product title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2"
        />
        <textarea
          required
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2"
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="text-sm font-medium">
          Minimum order quantity
          <input
            type="number"
            min={1}
            value={minOrderQty}
            onChange={(e) => setMinOrderQty(e.target.value)}
            className="w-full mt-1 rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium">
          Product images
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setFiles(e.target.files)}
            className="w-full mt-1 text-sm"
          />
        </label>

        <div className="border-t border-black/10 dark:border-white/10 pt-4">
          <h2 className="font-medium mb-2">Variants</h2>
          {variants.map((v, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-2 mb-3 rounded-md border border-black/10 dark:border-white/10 p-3">
              <input
                required
                placeholder="SKU"
                value={v.sku}
                onChange={(e) => updateVariant(idx, "sku", e.target.value)}
                className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-2 py-1.5 text-sm col-span-2"
              />
              <input
                placeholder="Attributes (e.g. color: Red, size: L)"
                value={v.attributesText}
                onChange={(e) => updateVariant(idx, "attributesText", e.target.value)}
                className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-2 py-1.5 text-sm col-span-2"
              />
              <input
                required
                type="number"
                step="0.01"
                placeholder="Price (USD)"
                value={v.price}
                onChange={(e) => updateVariant(idx, "price", e.target.value)}
                className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                placeholder="Stock"
                value={v.stock}
                onChange={(e) => updateVariant(idx, "stock", e.target.value)}
                className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                placeholder="Weight (oz)"
                value={v.weightOz}
                onChange={(e) => updateVariant(idx, "weightOz", e.target.value)}
                className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-2 py-1.5 text-sm"
              />
              <div className="grid grid-cols-3 gap-1">
                <input
                  type="number"
                  placeholder="L (in)"
                  value={v.lengthIn}
                  onChange={(e) => updateVariant(idx, "lengthIn", e.target.value)}
                  className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-1 py-1.5 text-xs"
                />
                <input
                  type="number"
                  placeholder="W (in)"
                  value={v.widthIn}
                  onChange={(e) => updateVariant(idx, "widthIn", e.target.value)}
                  className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-1 py-1.5 text-xs"
                />
                <input
                  type="number"
                  placeholder="H (in)"
                  value={v.heightIn}
                  onChange={(e) => updateVariant(idx, "heightIn", e.target.value)}
                  className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-1 py-1.5 text-xs"
                />
              </div>
              {variants.length > 1 && (
                <button
                  type="button"
                  onClick={() => setVariants((prev) => prev.filter((_, i) => i !== idx))}
                  className="col-span-2 text-xs text-red-600 justify-self-start"
                >
                  Remove variant
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setVariants((prev) => [...prev, emptyVariant()])}
            className="text-sm text-orange-600"
          >
            + Add another variant
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-orange-600 text-white py-2.5 font-medium hover:bg-orange-700 disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create product"}
        </button>
      </form>
    </div>
  );
}
