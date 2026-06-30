import Link from "next/link";
import {
  ChevronRight,
  Heart,
  RotateCcw,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";

import { ContentPage, Section, Prose } from "@/components/content/content-page";

export const metadata = { title: "Help Center" };

interface HelpTopic {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const HELP_TOPICS: HelpTopic[] = [
  {
    title: "Orders & shipping",
    description: "Track a package, change a delivery address, or learn how fast we dispatch.",
    href: "/shipping",
    icon: Truck,
  },
  {
    title: "Returns & refunds",
    description: "Start a return, check eligibility, and see when your refund lands.",
    href: "/returns",
    icon: RotateCcw,
  },
  {
    title: "Warranty & repairs",
    description: "Register a product, file a claim, or read what your coverage includes.",
    href: "/warranty",
    icon: ShieldCheck,
  },
  {
    title: "Account & wishlist",
    description: "Manage saved items and pick up where you left off on your next build.",
    href: "/wishlist",
    icon: Heart,
  },
];

interface Faq {
  question: string;
  answer: string;
}

const FAQS: Faq[] = [
  {
    question: "How long does delivery take?",
    answer:
      "In-stock orders ship within one business day. Standard delivery lands in 3–5 business days, and express options are offered at checkout. See our shipping page for full timelines and rates.",
  },
  {
    question: "Can I return something I changed my mind about?",
    answer:
      "Yes. You have 30 days from delivery to return unused gear in its original packaging for a full refund. Start the process from our returns page — no questions asked.",
  },
  {
    question: "What does the NEXUS warranty cover?",
    answer:
      "Every product carries at least a two-year limited warranty against manufacturing defects, with select rigs and monitors covered for longer. Coverage details and claim steps live on the warranty page.",
  },
  {
    question: "How do I find the gear I saved earlier?",
    answer:
      "Anything you tap the heart on is kept in your wishlist, ready to move to the cart whenever you are. It stays in sync across the storefront on this device.",
  },
];

const cardLinkClass =
  "group flex items-start gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function SupportPage() {
  return (
    <ContentPage
      title="Help Center"
      lede="Answers, guides, and a fast line to a human when you need one. Pick a topic to get going."
    >
      <Section heading="Browse help topics">
        <ul className="grid gap-4 sm:grid-cols-2">
          {HELP_TOPICS.map(({ title, description, href, icon: Icon }) => (
            <li key={title}>
              <Link href={href} className={cardLinkClass}>
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="space-y-1">
                  <span className="flex items-center gap-1 font-display font-semibold text-foreground">
                    {title}
                    <ChevronRight
                      className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                  <span className="block text-sm text-muted-foreground">{description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section heading="Frequently asked questions">
        <dl className="space-y-5">
          {FAQS.map(({ question, answer }) => (
            <div key={question} className="space-y-1.5">
              <dt className="font-medium text-foreground">{question}</dt>
              <dd className="leading-relaxed text-foreground/85">{answer}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section heading="Still need help?">
        <Prose>
          Can&apos;t find what you&apos;re after? Our support crew is made up of players who know
          the gear inside out, and they&apos;re happy to dig in with you.
        </Prose>
        <div>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Contact us
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
      </Section>
    </ContentPage>
  );
}
