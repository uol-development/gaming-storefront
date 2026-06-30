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
      lede="Fast, tracked delivery on every order. Here's exactly when your gear leaves the warehouse and when it lands at your door."
    >
      <Section heading="Delivery options & timeframes">
        <Prose>
          We ship from regional warehouses to keep transit times short. Choose the
          speed that suits you at checkout — pricing is shown before you pay, with no
          surprises.
        </Prose>
        <ul className={listClass}>
          <li>
            <strong className="text-foreground">Standard delivery</strong> — 3 to 5
            business days. Flat rate, calculated at checkout by destination.
          </li>
          <li>
            <strong className="text-foreground">Express delivery</strong> — 1 to 2
            business days for orders placed before 1pm local time.
          </li>
          <li>
            <strong className="text-foreground">Free shipping</strong> — automatically
            applied to every order over $99 (standard speed).
          </li>
        </ul>
      </Section>

      <Section heading="Order processing">
        <Prose>
          In-stock orders are picked, packed, and handed to the carrier within 1
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

      <Section heading="International shipping">
        <Prose>
          We currently ship to a growing list of countries. International delivery
          typically takes 7 to 14 business days depending on destination and customs
          clearance. Import duties and taxes, where applicable, are the responsibility
          of the recipient and are not included in the order total. Available
          destinations and rates are confirmed at checkout once you enter your address.
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
