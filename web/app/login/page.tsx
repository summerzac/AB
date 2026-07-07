"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      router.push(user.role === "MANUFACTURER" ? "/dashboard/products" : "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold mb-6">Log in</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
          placeholder="Password"
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
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className="text-sm mt-4 opacity-70">
        No account? <Link href="/register" className="text-orange-600">Sign up</Link>
      </p>
      <div className="mt-8 text-xs opacity-60 border-t border-black/10 dark:border-white/10 pt-4">
        <p>Demo accounts:</p>
        <p>Manufacturer: demo-manufacturer@example.com / password123</p>
        <p>Buyer: demo-buyer@example.com / password123</p>
      </div>
    </div>
  );
}
