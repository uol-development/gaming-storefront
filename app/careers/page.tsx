import Link from "next/link";

import { ContentPage, Prose, Section } from "@/components/content/content-page";

export const metadata = { title: "Careers" };

const PERKS: string[] = [
  "Remote-first team with flexible hours across time zones",
  "Annual hardware budget for the gear you actually want",
  "Generous paid time off — and we expect you to use it",
  "Home-office and battlestation setup stipend",
  "Learning budget for courses, conferences, and certs",
  "Inclusive health coverage and parental leave",
  "Quarterly team game nights and an annual on-site meetup",
];

interface OpenRole {
  title: string;
  team: string;
  location: string;
  type: string;
  blurb: string;
}

const OPEN_ROLES: OpenRole[] = [
  {
    title: "Senior Front-End Engineer",
    team: "Storefront",
    location: "Remote",
    type: "Full-time",
    blurb:
      "Own the shopping experience end to end in our Next.js + React stack. Ship fast, accessible interfaces that make finding the right gear feel effortless.",
  },
  {
    title: "Product Curator, Peripherals",
    team: "Merchandising",
    location: "Remote",
    type: "Full-time",
    blurb:
      "Decide what earns a spot on our shelves. Test keyboards, mice, and headsets under real load and write the honest specs our players rely on.",
  },
  {
    title: "Customer Support Specialist",
    team: "Player Support",
    location: "Remote",
    type: "Full-time",
    blurb:
      "Be the human behind the help desk. Resolve orders, shipping, and warranty questions with empathy and fast, genuinely useful answers.",
  },
  {
    title: "Warehouse Operations Lead",
    team: "Fulfilment",
    location: "Austin, TX",
    type: "Full-time",
    blurb:
      "Keep dispatch tight and orders accurate. Lead a small team that gets premium hardware out the door within 48 hours, every time.",
  },
];

const applyClass =
  "inline-flex shrink-0 items-center justify-center rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Careers page. Server Component on the shared ContentPage shell. Culture blurb,
 * perks, and a few sample open roles as cards — each "Apply" routes to /contact,
 * since there is no dedicated application route. All links are valid internal
 * routes.
 */
export default function CareersPage() {
  return (
    <ContentPage
      title="Careers"
      lede="We are a small, remote-first team of players building the storefront we wish existed. If you sweat the details at 240Hz, you will fit right in."
    >
      <Section heading="Life at NEXUS">
        <Prose>
          We hire people who care — about the craft, about the customer, and
          about the games we all play after hours. There is no red tape between a
          good idea and shipping it. Everyone has a voice, ownership is real, and
          the work you do reaches hundreds of thousands of players.
        </Prose>
        <Prose>
          We move fast, but never at the expense of quality or each other. We
          value clear writing, honest feedback, and the kind of teammates who
          make Monday standup something you actually look forward to.
        </Prose>
      </Section>

      <Section heading="Perks & benefits">
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {PERKS.map((perk) => (
            <li
              key={perk}
              className="flex items-start gap-2.5 rounded-md border border-border bg-card p-3 text-sm text-foreground/85"
            >
              <span
                aria-hidden
                className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary"
              >
                +
              </span>
              <span>{perk}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section heading="Open roles">
        <ul className="space-y-4">
          {OPEN_ROLES.map((role) => (
            <li
              key={role.title}
              className="rounded-xl border border-border bg-card p-4 sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <h3 className="font-display text-base font-semibold tracking-tight">
                    {role.title}
                  </h3>
                  <ul className="flex flex-wrap items-center gap-2">
                    {[role.team, role.location, role.type].map((tag) => (
                      <li
                        key={tag}
                        className="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {role.blurb}
                  </p>
                </div>
                <Link
                  href="/contact"
                  className={applyClass}
                  aria-label={`Apply for ${role.title}`}
                >
                  Apply
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section heading="Don’t see your role?">
        <Prose>
          We are always glad to meet talented people, even when the perfect
          listing is not posted yet. Tell us what you do best and why NEXUS — head
          to our{" "}
          <Link
            href="/contact"
            className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            contact page
          </Link>{" "}
          to reach the team. Curious who we are first?{" "}
          <Link
            href="/about"
            className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Read about NEXUS
          </Link>
          .
        </Prose>
      </Section>
    </ContentPage>
  );
}
