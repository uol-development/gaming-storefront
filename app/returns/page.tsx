import Link from "next/link";

import { ContentPage, Prose, Section } from "@/components/content/content-page";

export const metadata = { title: "Returns & Refunds" };

const inlineLink =
  "rounded font-medium text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const listClass = "ml-5 list-disc space-y-2 marker:text-primary";

/**
 * Returns & Refunds policy page. Server Component built on the shared
 * ContentPage shell. Cross-links only to valid internal routes.
 */
export default function ReturnsPage() {
  return (
    <ContentPage
      title="Returns & Refunds"
      lede="Changed your mind or got the wrong fit? You have 30 days to send it back — here's how it works."
    >
      <Section heading="Our 30-day return window">
        <Prose>
          You can return most items within 30 days of delivery for a full refund. The
          window starts the day your order arrives, so you have plenty of time to make
          sure your new gear is right for you.
        </Prose>
      </Section>

      <Section heading="Condition requirements">
        <Prose>
          To qualify for a refund, items must come back to us in resalable condition.
          Please make sure your return is:
        </Prose>
        <ul className={listClass}>
          <li>Unused or only gently tested, with no signs of wear or damage.</li>
          <li>Returned in the original packaging, including all cables and accessories.</li>
          <li>Complete with any free gifts or bundled items that came with it.</li>
          <li>
            Free of personalization — custom-built or engraved items can't be returned
            unless faulty.
          </li>
        </ul>
      </Section>

      <Section heading="How to start a return">
        <Prose>
          Starting a return is simple. Head to our{" "}
          <Link href="/contact" className={inlineLink}>
            contact page
          </Link>{" "}
          with your order number and the item you'd like to send back. Our team will
          confirm your eligibility and arrange a courier pickup along with step-by-step
          instructions. Just pack the item securely and hand it to the courier.
        </Prose>
      </Section>

      <Section heading="Refund timing">
        <Prose>
          Once your return reaches our warehouse, we inspect it within 2 business days.
          Approved refunds are issued to your original payment method — bKash, Nagad,
          Rocket, or your card — and typically appear within 5 to 10 business days,
          depending on your provider. Paid cash on delivery? We'll refund via bKash,
          Nagad, or Rocket to a number you choose. We'll message you the moment your
          refund is on its way.
        </Prose>
      </Section>

      <Section heading="Exchanges">
        <Prose>
          Want a different model, size, or color instead of a refund? Let us know when
          you start your return and we'll reserve the replacement where stock allows.
          If you'd rather pick something new yourself, browse the full lineup on the{" "}
          <Link href="/products" className={inlineLink}>
            products page
          </Link>{" "}
          and place a fresh order — we'll refund the original once it's back with us.
        </Prose>
      </Section>

      <Section heading="Faulty or damaged items">
        <Prose>
          If something arrives damaged or develops a fault, don't worry about the return
          window — reach out through our{" "}
          <Link href="/support" className={inlineLink}>
            support center
          </Link>{" "}
          and we'll make it right. Manufacturing defects are also covered by our{" "}
          <Link href="/warranty" className={inlineLink}>
            warranty
          </Link>
          .
        </Prose>
      </Section>
    </ContentPage>
  );
}
