import { CheckoutFlow } from "@/components/checkout/checkout-flow";

export const metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <div className="container mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Checkout
      </h1>
      <div className="mt-8">
        <CheckoutFlow />
      </div>
    </div>
  );
}
