'use client';

import { useEffect } from "react";
import AppNavbar from "@/components/layout/app-navbar";
import AdmobBanner from "@/components/admob-banner";
import { CurrencyProvider } from "@/context/currency-context";
import { ProductProvider } from "@/context/product-context";
import { RecipeProvider } from "@/context/recipe-context";
import { SubscriptionProvider } from "@/context/subscription-context";

// Radix's Dialog/DropdownMenu/AlertDialog primitives each lock
// `body.style.pointerEvents = "none"` while open and restore it on close.
// When one of these is opened from inside another (e.g. a DropdownMenuItem
// that triggers a Dialog or AlertDialog), their close order can race and the
// lock is left stuck on `none`, freezing every click on the page until reload.
// This watches for that stuck state and clears it once no overlay is open.
function useRadixPointerEventsFix() {
  useEffect(() => {
    const clearIfStuck = () => {
      if (document.body.style.pointerEvents !== 'none') return;
      const hasOpenOverlay = document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"]'
      );
      if (!hasOpenOverlay) {
        document.body.style.pointerEvents = '';
      }
    };
    const observer = new MutationObserver(() => {
      // Defer so any overlay element the same mutation is opening has time to mount.
      setTimeout(clearIfStuck, 50);
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, []);
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  useRadixPointerEventsFix();
  return (
    <SubscriptionProvider>
      <ProductProvider>
        <RecipeProvider>
          <CurrencyProvider>
            <main
              className="p-4 sm:p-6 lg:p-8 pb-20"
              style={{ paddingBottom: 'calc(5rem + var(--admob-banner-offset, 0px))' }}
            >
              {children}
            </main>
            <AppNavbar />
            <AdmobBanner />
          </CurrencyProvider>
        </RecipeProvider>
      </ProductProvider>
    </SubscriptionProvider>
  );
}
