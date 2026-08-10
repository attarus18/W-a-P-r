'use client';

import AppNavbar from "@/components/layout/app-navbar";
import { CurrencyProvider } from "@/context/currency-context";
import { ProductProvider } from "@/context/product-context";
import { SubscriptionProvider } from "@/context/subscription-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SubscriptionProvider>
      <ProductProvider>
        <CurrencyProvider>
          <main className="p-4 sm:p-6 lg:p-8 pb-20">{children}</main>
          <AppNavbar />
        </CurrencyProvider>
      </ProductProvider>
    </SubscriptionProvider>
  );
}
