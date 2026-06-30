import Link from "next/link";

import { ContentPage, Prose, Section } from "@/components/content/content-page";

export const metadata = { title: "Warranty" };

const inlineLink =
  "rounded font-medium text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const listClass = "ml-5 list-disc space-y-2 marker:text-primary";

/**
 * Warranty policy page. Server Component built on the shared ContentPage shell.
 * Cross-links only to valid internal routes.
 */
export default function WarrantyPage() {
  return (
    <ContentPage
      title="Warranty"
      lede="Every product we sell is backed by a 2-year limited warranty, so you can play with confidence."
    >
      <Section heading="2-year limited coverage">
        <Prose>
          NEXUS stands behind the gear we ship. All products come with a 2-year limited
          warranty against defects in materials and workmanship, starting from the date
          of delivery. If a covered fault appears within that period, we'll repair,
          replace, or refund the item at our discretion.
        </Prose>
      </Section>

      <Section heading="What's covered">
        <ul className={listClass}>
          <li>Manufacturing defects in components and assembly.</li>
          <li>Hardware failures that occur under normal, intended use.</li>
          <li>Faulty ports, switches, panels, or internal parts.</li>
          <li>Premature failure of included cables and power supplies.</li>
        </ul>
      </Section>

      <Section heading="What's not covered">
        <ul className={listClass}>
          <li>Accidental damage, drops, spills, or liquid ingress.</li>
          <li>Normal wear and tear, including cosmetic scuffs and keycap shine.</li>
          <li>Damage from misuse, modification, or unauthorized repair.</li>
          <li>Consumable parts such as batteries past their expected lifespan.</li>
          <li>Issues caused by power surges where no surge protection was used.</li>
        </ul>
      </Section>

      <Section heading="How to make a claim">
        <Prose>
          To start a warranty claim, contact us through our{" "}
          <Link href="/contact" className={inlineLink}>
            contact page
          </Link>{" "}
          with your order number and a short description of the fault — photos or a
          quick video help us diagnose faster. Our team will confirm coverage and
          arrange a repair, replacement, or prepaid return as needed. Most claims are
          assessed within 2 business days.
        </Prose>
      </Section>

      <Section heading="Manufacturer warranties">
        <Prose>
          Some products — particularly GPUs, laptops, and branded peripherals — also
          carry a separate manufacturer warranty that may extend beyond our 2-year
          term. These run alongside your NEXUS coverage, and you're free to claim
          through whichever applies. If you're unsure which route is best, our{" "}
          <Link href="/support" className={inlineLink}>
            support center
          </Link>{" "}
          can point you in the right direction.
        </Prose>
      </Section>
    </ContentPage>
  );
}
