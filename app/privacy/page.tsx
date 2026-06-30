import Link from "next/link";

import { ContentPage, Prose, Section } from "@/components/content/content-page";

export const metadata = { title: "Privacy Policy" };

const inlineLink =
  "rounded font-medium text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Privacy Policy. Static Server Component rendered through the shared
 * <ContentPage> shell so it stays visually consistent with the other legal and
 * content pages. All internal references point to valid in-app routes.
 */
export default function PrivacyPage() {
  return (
    <ContentPage
      title="Privacy Policy"
      lede="Your trust matters to us. This policy explains what information NEXUS collects, how we use it, and the choices you have over your data."
    >
      <p className="text-sm text-muted-foreground">Last updated: June 1, 2026</p>

      <Section heading="Information we collect">
        <Prose>
          When you shop, create an account, or contact us, we collect the
          information you provide directly — your name, email address, shipping
          and billing details, and order history. We also collect technical data
          automatically, such as your device type, browser, IP address, and how
          you navigate the store, so we can keep NEXUS fast, secure, and
          relevant.
        </Prose>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Account details you give us at sign-up or checkout.</li>
          <li>Order, payment, and delivery information needed to fulfil purchases.</li>
          <li>Wishlist and browsing activity used to personalize recommendations.</li>
          <li>Support messages and survey responses you choose to share.</li>
        </ul>
      </Section>

      <Section heading="How we use your information">
        <Prose>
          We use your information to process orders, deliver products, provide
          customer support, and keep your account secure. With your consent, we
          send updates on restocks, new arrivals, and deals — you can opt out at
          any time. We also analyze aggregated usage to improve our catalog,
          site performance, and the overall shopping experience.
        </Prose>
        <Prose>
          We never sell your personal data. We process it only for the purposes
          described here or where we have a legitimate business or legal reason
          to do so.
        </Prose>
      </Section>

      <Section heading="Cookies and tracking">
        <Prose>
          NEXUS uses cookies and similar technologies to keep you signed in,
          remember your cart and preferences, and understand how the store is
          used. You control these through your browser and our preference
          tools. For a full breakdown of the cookies we set and how to manage
          them, see our{" "}
          <Link href="/cookies" className={inlineLink}>
            Cookie Policy
          </Link>
          .
        </Prose>
      </Section>

      <Section heading="When we share data">
        <Prose>
          We share information only with the partners that help us run NEXUS —
          payment processors, shipping carriers, fraud-prevention services, and
          analytics providers — and only what each needs to do its job. These
          partners are bound by contract to protect your data. We may also
          disclose information where required by law or to protect the rights and
          safety of our customers and our business.
        </Prose>
      </Section>

      <Section heading="Your rights and choices">
        <Prose>
          Depending on where you live, you may have the right to access,
          correct, export, or delete the personal data we hold about you, and to
          object to or restrict certain processing. You can update most details
          directly from your account, and you can unsubscribe from marketing
          email using the link in any message.
        </Prose>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Request a copy of the data associated with your account.</li>
          <li>Ask us to correct inaccurate or incomplete information.</li>
          <li>Request deletion of your data, subject to legal retention rules.</li>
          <li>Withdraw consent for marketing communications at any time.</li>
        </ul>
      </Section>

      <Section heading="Data security and retention">
        <Prose>
          We protect your information with encryption in transit, access
          controls, and regular security reviews. We keep personal data only as
          long as needed to provide our services and meet legal, tax, and
          accounting obligations, after which it is securely deleted or
          anonymized.
        </Prose>
      </Section>

      <Section heading="Contact us">
        <Prose>
          Questions about this policy or your data? Reach our team through the{" "}
          <Link href="/contact" className={inlineLink}>
            contact page
          </Link>{" "}
          and we will respond as quickly as we can.
        </Prose>
      </Section>
    </ContentPage>
  );
}
