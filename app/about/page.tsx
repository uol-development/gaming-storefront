import Link from "next/link";

import { ContentPage, Prose, Section } from "@/components/content/content-page";

export const metadata = { title: "About NEXUS" };

const STATS: { value: string; label: string }[] = [
  { value: "2014", label: "Founded by competitive players" },
  { value: "750K+", label: "Orders shipped across Bangladesh" },
  { value: "4.8/5", label: "Average customer rating" },
  { value: "48hr", label: "Typical dispatch time" },
];

const VALUES: { title: string; body: string }[] = [
  {
    title: "Performance first",
    body: "Every product on the shelf earns its place. We test under real load — long sessions, ranked matches, render queues — not just spec sheets.",
  },
  {
    title: "Honest guidance",
    body: "We would rather lose a sale than sell you the wrong rig. Our category pages and specs are written to help you decide, not to upsell.",
  },
  {
    title: "Built to last",
    body: "We back what we carry with clear warranties and real support, so your gear keeps performing long after the unboxing.",
  },
  {
    title: "Made by players",
    body: "Our team games. We obsess over the details that matter at 240Hz because we feel them too.",
  },
];

/**
 * About page. Server Component built on the shared ContentPage shell. Tells the
 * NEXUS brand story, what we sell, why players trust us, and our values. Static
 * stat highlights are plain markup. All links resolve to valid internal routes.
 */
export default function AboutPage() {
  return (
    <ContentPage
      title="About NEXUS"
      lede="We build the storefront we always wished existed — premium gaming gear, hand-picked rigs, and battle-tested peripherals, chosen by players who refuse to lose to their hardware."
    >
      <Section heading="Our story">
        <Prose>
          NEXUS started in 2014 in a cramped esports house, born out of one
          frustration: shopping for serious gaming hardware meant wading through
          padded spec sheets, fake reviews, and stores that had never run the
          gear they sold. We figured players deserved better.
        </Prose>
        <Prose>
          So we built a storefront run by people who actually game. Today we ship
          to players in every district of Bangladesh, but the mission has not changed — we
          curate the lineup, stand behind every order, and treat your next
          upgrade like it is one of ours.
        </Prose>
      </Section>

      <Section heading="By the numbers">
        <ul className="grid grid-cols-2 gap-3 sm:gap-4">
          {STATS.map((stat) => (
            <li
              key={stat.label}
              className="rounded-xl border border-border bg-card p-4 sm:p-5"
            >
              <p className="font-display text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section heading="What we sell">
        <Prose>
          We focus on the gear that decides matches. That means high-refresh{" "}
          <Link
            href="/products?category=laptops"
            className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            gaming laptops
          </Link>{" "}
          and purpose-built{" "}
          <Link
            href="/products?category=desktops"
            className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            desktops
          </Link>
          , the latest{" "}
          <Link
            href="/products?category=gpus"
            className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            GPUs
          </Link>{" "}
          and fast{" "}
          <Link
            href="/products?category=monitors"
            className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            monitors
          </Link>
          , plus the peripherals you actually touch every round —{" "}
          <Link
            href="/products?category=keyboards"
            className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            keyboards
          </Link>
          ,{" "}
          <Link
            href="/products?category=mice"
            className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            mice
          </Link>
          ,{" "}
          <Link
            href="/products?category=headsets"
            className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            headsets
          </Link>{" "}
          and{" "}
          <Link
            href="/products?category=chairs"
            className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            chairs
          </Link>
          .
        </Prose>
        <Prose>
          Want to see the full lineup?{" "}
          <Link
            href="/products"
            className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Browse all products
          </Link>{" "}
          or jump straight to{" "}
          <Link
            href="/products?sale=1"
            className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            this week&rsquo;s deals
          </Link>
          .
        </Prose>
      </Section>

      <Section heading="Why players trust NEXUS">
        <Prose>
          Trust is earned one order at a time. We hand-pick the lineup, write our
          own honest specs, and back every purchase with clear{" "}
          <Link
            href="/shipping"
            className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            shipping
          </Link>
          ,{" "}
          <Link
            href="/returns"
            className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            returns
          </Link>{" "}
          and{" "}
          <Link
            href="/warranty"
            className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            warranty
          </Link>{" "}
          policies. If something goes wrong, real humans on our{" "}
          <Link
            href="/support"
            className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            support
          </Link>{" "}
          team make it right.
        </Prose>
      </Section>

      <Section heading="What we stand for">
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {VALUES.map((value) => (
            <li
              key={value.title}
              className="rounded-xl border border-border bg-card p-4 sm:p-5"
            >
              <h3 className="font-display text-base font-semibold tracking-tight">
                {value.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {value.body}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section heading="Come say hello">
        <Prose>
          Questions about a build, an order, or a partnership? Reach the team via
          our{" "}
          <Link
            href="/contact"
            className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            contact page
          </Link>
          , or see if we are hiring on{" "}
          <Link
            href="/careers"
            className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            careers
          </Link>
          .
        </Prose>
      </Section>
    </ContentPage>
  );
}
