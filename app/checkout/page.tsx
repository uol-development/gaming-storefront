import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { getStoreSettings } from "@/lib/data/settings-read";
import { enabledPaymentMethods, toShippingConfig } from "@/lib/data/settings";

export const metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const settings = await getStoreSettings();
  const shipping = toShippingConfig(settings);
  const enabledPayments = enabledPaymentMethods(settings);

  return (
    <div className="container mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Checkout
      </h1>
      <div className="mt-8">
        <CheckoutFlow shipping={shipping} enabledPayments={enabledPayments} />
      </div>
    </div>
  );
}
