import Link from "next/link";

import { ContentPage, Prose, Section } from "@/components/content/content-page";

export const metadata = { title: "Terms of Service" };

const inlineLink =
  "rounded font-medium text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Terms of Service. Static Server Component rendered through the shared
 * <ContentPage> shell. Cross-references to shipping, returns, and warranty use
 * valid in-app routes only.
 */
export default function TermsPage() {
  return (
    <ContentPage
      title="Terms of Service"
      lede="These terms govern your use of the NEXUS store and the purchases you make with us. Please read them carefully before placing an order."
    >
      <p className="text-sm text-muted-foreground">Last updated: June 1, 2026</p>

      <Section heading="Acceptance of terms">
        <Prose>
          By browsing NEXUS, creating an account, or placing an order, you agree
          to these Terms of Service and to our policies referenced within them.
          If you do not agree, please do not use the store. We may update these
          terms from time to time, and continued use after changes take effect
          means you accept the revised version.
        </Prose>
      </Section>

      <Section heading="Your account">
        <Prose>
          You are responsible for keeping your login credentials confidential and
          for all activity that happens under your account. Please give accurate,
          current information and let us know promptly of any unauthorized use.
          We may suspend or close accounts that violate these terms or are used
          for fraudulent activity.
        </Prose>
      </Section>

      <Section heading="Orders and pricing">
        <Prose>
          All orders are offers to buy and are subject to acceptance and stock
          availability. We work hard to keep pricing and product details
          accurate, but errors can occur. If a product is listed at an incorrect
          price, we may cancel the order and refund any payment made. Prices are
          shown in Bangladeshi Taka (৳) and exclude any taxes or duties unless
          stated at checkout.
        </Prose>
      </Section>

      <Section heading="Shipping and returns">
        <Prose>
          Delivery timelines, carriers, and costs are described on our{" "}
          <Link href="/shipping" className={inlineLink}>
            shipping
          </Link>{" "}
          page. If something is not right, our{" "}
          <Link href="/returns" className={inlineLink}>
            returns
          </Link>{" "}
          policy explains how to send eligible items back and how refunds are
          handled. Those pages form part of these terms.
        </Prose>
      </Section>

      <Section heading="Warranty">
        <Prose>
          Hardware sold by NEXUS is covered as set out on our{" "}
          <Link href="/warranty" className={inlineLink}>
            warranty
          </Link>{" "}
          page. Manufacturer warranties may also apply and are honored alongside
          our own coverage. Warranties do not cover damage caused by misuse,
          accidents, or unauthorized modifications.
        </Prose>
      </Section>

      <Section heading="Acceptable use">
        <Prose>
          You agree not to misuse the store — including attempting to disrupt our
          systems, scrape data at scale, resell products fraudulently, or
          infringe the intellectual property of NEXUS or others. All store
          content, branding, and design remain our property or that of our
          licensors.
        </Prose>
      </Section>

      <Section heading="Limitation of liability">
        <Prose>
          To the fullest extent permitted by law, NEXUS is not liable for
          indirect, incidental, or consequential damages arising from your use of
          the store or any product purchased through it. Our total liability for
          any claim is limited to the amount you paid for the product giving rise
          to that claim. Nothing in these terms limits rights that cannot be
          excluded under applicable law.
        </Prose>
      </Section>

      <Section heading="Governing law">
        <Prose>
          These terms are governed by the laws of Bangladesh, without regard to
          conflict-of-law principles. Any disputes will be handled by the courts of
          Dhaka, Bangladesh. If any provision is found unenforceable, the remaining
          provisions stay in full effect.
        </Prose>
      </Section>

      <Section heading="Questions">
        <Prose>
          If anything here is unclear, reach out through our{" "}
          <Link href="/contact" className={inlineLink}>
            contact page
          </Link>{" "}
          and we will be glad to help.
        </Prose>
      </Section>
    </ContentPage>
  );
}
