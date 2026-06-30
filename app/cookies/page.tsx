import Link from "next/link";

import { ContentPage, Prose, Section } from "@/components/content/content-page";

export const metadata = { title: "Cookie Policy" };

const inlineLink =
  "rounded font-medium text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Cookie Policy. Static Server Component rendered through the shared
 * <ContentPage> shell. Links back to the Privacy Policy for the broader data
 * picture; all references stay on valid in-app routes.
 */
export default function CookiesPage() {
  return (
    <ContentPage
      title="Cookie Policy"
      lede="This policy explains the cookies NEXUS uses, why we use them, and how you can stay in control of them."
    >
      <p className="text-sm text-muted-foreground">Last updated: June 1, 2026</p>

      <Section heading="What cookies are">
        <Prose>
          Cookies are small text files that a website stores on your device when
          you visit. They let the store remember things between pages and visits
          — like keeping you signed in or holding the items in your cart — and
          help us understand how NEXUS is used so we can keep improving it. We
          also use similar technologies such as local storage and pixels, all
          covered by this policy.
        </Prose>
      </Section>

      <Section heading="Types of cookies we use">
        <Prose>
          We group the cookies we set into three categories, based on what they
          do:
        </Prose>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="font-medium text-foreground">Essential</span> —
            required for the store to work: signing in, securing your session,
            and remembering your cart through checkout. These cannot be switched
            off.
          </li>
          <li>
            <span className="font-medium text-foreground">Analytics</span> —
            help us understand which products and pages are popular and where the
            experience can be faster or clearer. This data is aggregated and used
            to improve the store.
          </li>
          <li>
            <span className="font-medium text-foreground">Preferences</span> —
            remember your choices, such as region, recently viewed gear, and
            display settings, so the store feels tailored to you.
          </li>
        </ul>
      </Section>

      <Section heading="Managing cookies">
        <Prose>
          You can accept or decline non-essential cookies and change your choice
          at any time. Most browsers also let you block or delete cookies through
          their settings — though disabling essential cookies may stop parts of
          the store, like checkout, from working correctly. Clearing cookies will
          reset preferences such as your saved region and recently viewed items.
        </Prose>
      </Section>

      <Section heading="Third-party cookies">
        <Prose>
          Some cookies are set by trusted partners that help us run NEXUS, such
          as analytics and payment providers. These partners may use cookies to
          deliver and measure their services, and their use is governed by their
          own policies in addition to ours.
        </Prose>
      </Section>

      <Section heading="More information">
        <Prose>
          Cookies are one part of how we handle your information. For the full
          picture of what we collect and how we use it, see our{" "}
          <Link href="/privacy" className={inlineLink}>
            Privacy Policy
          </Link>
          .
        </Prose>
      </Section>
    </ContentPage>
  );
}
