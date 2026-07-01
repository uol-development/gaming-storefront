import Link from "next/link";

import { ContentPage, Prose, Section } from "@/components/content/content-page";

export const metadata = { title: "Shipping & Delivery" };

const inlineLink =
  "rounded font-medium text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const listClass = "ml-5 list-disc space-y-2 marker:text-primary";

/**
 * Shipping & Delivery policy page. Server Component built on the shared
 * ContentPage shell. Cross-links only to valid internal routes.
 */
export default function ShippingPage() {
  return (
    <ContentPage
      title="Shipping & Delivery"
      lede="Fast, tracked delivery across Bangladesh, with cash on delivery available nationwide. Here's exactly when your gear leaves the warehouse and when it lands at your door."
    >
      <Section heading="Delivery zones & fees">
        <Prose>
          We deliver nationwide across Bangladesh. Your delivery fee is set by zone and
          shown at checkout before you pay, with no surprises.
        </Prose>
        <ul className={listClass}>
          <li>
            <strong className="text-foreground">Inside Dhaka</strong> — ৳60, delivered
            in 1 to 2 days.
          </li>
          <li>
            <strong className="text-foreground">Dhaka sub-area</strong> — ৳100, delivered
            in 2 to 3 days. Covers Narayanganj, Gazipur, Savar, Keraniganj, Tongi and
            nearby areas.
          </li>
          <li>
            <strong className="text-foreground">Outside Dhaka</strong> — ৳130, delivered
            in 3 to 5 days.
          </li>
          <li>
            <strong className="text-foreground">Free delivery</strong> — automatically
            applied to every order over ৳1,50,000.
          </li>
        </ul>
      </Section>

      <Section heading="Cash on delivery">
        <Prose>
          Prefer to pay when your gear arrives? Cash on delivery is available nationwide.
          You can also pay with bKash, Nagad, Rocket, or a Visa/Mastercard at checkout —
          whatever suits you best.
        </Prose>
      </Section>

      <Section heading="Order processing">
        <Prose>
          In-stock orders are picked, packed, and handed to the courier within 1
          business day. Orders placed on weekends or public holidays begin processing
          the next business day. Larger items such as desktops and chairs may need an
          extra day for protective packing.
        </Prose>
        <Prose>
          You'll receive an order confirmation by email the moment your payment clears,
          followed by a dispatch notice once your package is on its way.
        </Prose>
      </Section>

      <Section heading="Tracking your order">
        <Prose>
          Every shipment includes end-to-end tracking. Your dispatch email contains a
          tracking number and a link to follow your package in real time. If tracking
          hasn't updated within 48 hours of dispatch, reach out via our{" "}
          <Link href="/contact" className={inlineLink}>
            contact page
          </Link>{" "}
          and we'll chase it down for you.
        </Prose>
      </Section>

      <Section heading="Nationwide coverage">
        <Prose>
          We deliver to every district across Bangladesh. Delivery to areas outside
          Dhaka typically takes 3 to 5 days depending on your location and courier
          schedules. Your exact fee and estimated timeframe are confirmed at checkout
          once you enter your address.
        </Prose>
      </Section>

      <Section heading="Need a hand?">
        <Prose>
          Questions about a delivery, a missed package, or a specific address? Visit our{" "}
          <Link href="/support" className={inlineLink}>
            support center
          </Link>{" "}
          for quick answers, or{" "}
          <Link href="/contact" className={inlineLink}>
            get in touch
          </Link>{" "}
          and a real person will help you out.
        </Prose>
      </Section>
    </ContentPage>
  );
}
