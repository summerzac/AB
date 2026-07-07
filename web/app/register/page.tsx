"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<"BUYER" | "MANUFACTURER">("BUYER");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await register({ email, password, name, role, companyName: companyName || undefined });
      router.push(user.role === "MANUFACTURER" ? "/dashboard/products" : "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold mb-6">Create an account</h1>

      <div className="flex mb-6 rounded-md overflow-hidden border border-black/15 dark:border-white/15">
        <button
          type="button"
          onClick={() => setRole("BUYER")}
          className={`flex-1 py-2 text-sm font-medium ${role === "BUYER" ? "bg-orange-600 text-white" : ""}`}
        >
          I&apos;m a buyer
        </button>
        <button
          type="button"
          onClick={() => setRole("MANUFACTURER")}
          className={`flex-1 py-2 text-sm font-medium ${role === "MANUFACTURER" ? "bg-orange-600 text-white" : ""}`}
        >
          I&apos;m a manufacturer
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input
          required
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2"
        />
        {role === "MANUFACTURER" && (
          <input
            required
            placeholder="Company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2"
          />
        )}
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-orange-600 text-white py-2 font-medium hover:bg-orange-700 disabled:opacity-50"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="text-sm mt-4 opacity-70">
        Already have an account? <Link href="/login" className="text-orange-600">Log in</Link>
      </p>
    </div>
  );
}
