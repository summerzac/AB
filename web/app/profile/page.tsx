"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface FullProfile {
  companyName: string;
  description: string | null;
  country: string | null;
  logoUrl: string | null;
  shipFromAddress: {
    name: string;
    street1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone: string | null;
  } | null;
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState({ name: "", street1: "", city: "", state: "", zip: "", country: "US", phone: "" });

  useEffect(() => {
    if (user?.role !== "MANUFACTURER") return;
    api<{ manufacturer: FullProfile }>("/api/manufacturers/me/full").then((r) => {
      setProfile(r.manufacturer);
      setCompanyName(r.manufacturer.companyName);
      setDescription(r.manufacturer.description ?? "");
      setCountry(r.manufacturer.country ?? "");
      const a = r.manufacturer.shipFromAddress;
      if (a) {
        setAddress({
          name: a.name,
          street1: a.street1,
          city: a.city,
          state: a.state,
          zip: a.zip,
          country: a.country,
          phone: a.phone ?? "",
        });
      }
    });
  }, [user]);

  if (loading) return null;
  if (user?.role !== "MANUFACTURER") return <div className="mx-auto max-w-2xl px-4 py-8">Manufacturer account required.</div>;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      await api("/api/manufacturers/me", {
        method: "PATCH",
        body: { companyName, description, country, shipFromAddress: address },
      });
      setStatus("Saved!");
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return <div className="mx-auto max-w-2xl px-4 py-8">Loading...</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Company Profile</h1>
      <form onSubmit={save} className="flex flex-col gap-4">
        <label className="text-sm font-medium">
          Company name
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full mt-1 rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full mt-1 rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium">
          Country
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full mt-1 rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2"
          />
        </label>

        <div className="border-t border-black/10 dark:border-white/10 pt-4">
          <h2 className="font-medium mb-2">Ship-from address (used for shipping quotes)</h2>
          <div className="grid grid-cols-2 gap-2">
            {(["name", "street1", "city", "state", "zip", "country", "phone"] as const).map((field) => (
              <input
                key={field}
                placeholder={field}
                value={(address as any)[field]}
                onChange={(e) => setAddress({ ...address, [field]: e.target.value })}
                className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-2 py-1.5 text-sm"
              />
            ))}
          </div>
        </div>

        {status && <p className="text-sm opacity-80">{status}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-orange-600 text-white py-2.5 font-medium hover:bg-orange-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>
    </div>
  );
}
