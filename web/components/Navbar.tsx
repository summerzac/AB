"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3 gap-4">
        <Link href="/" className="font-bold text-xl tracking-tight text-orange-600">
          AB Marketplace
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:text-orange-600">
            Browse
          </Link>
          {user && (
            <Link href="/chat" className="hover:text-orange-600">
              Messages
            </Link>
          )}
          {user?.role === "BUYER" && (
            <Link href="/orders" className="hover:text-orange-600">
              My Orders
            </Link>
          )}
          {user?.role === "MANUFACTURER" && (
            <>
              <Link href="/dashboard/products" className="hover:text-orange-600">
                My Products
              </Link>
              <Link href="/dashboard/orders" className="hover:text-orange-600">
                Incoming Orders
              </Link>
              <Link href="/profile" className="hover:text-orange-600">
                Company Profile
              </Link>
            </>
          )}
          {user ? (
            <button
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="rounded-md bg-neutral-800 text-white px-3 py-1.5 hover:bg-neutral-700"
            >
              Log out
            </button>
          ) : (
            <>
              <Link href="/login" className="hover:text-orange-600">
                Log in
              </Link>
              <Link href="/register" className="rounded-md bg-orange-600 text-white px-3 py-1.5 hover:bg-orange-700">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
