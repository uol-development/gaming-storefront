import { Clock, LifeBuoy, Mail, Timer, type LucideIcon } from "lucide-react";

import { ContentPage, Section, Prose } from "@/components/content/content-page";

import { ContactForm } from "./contact-form";

export const metadata = { title: "Contact Us" };

interface ContactDetail {
  label: string;
  value: string;
  icon: LucideIcon;
}

const CONTACT_DETAILS: ContactDetail[] = [
  {
    label: "Email us",
    value: "support@nexus.gg",
    icon: Mail,
  },
  {
    label: "Support hours",
    value: "Mon–Fri, 9am–7pm ET",
    icon: Clock,
  },
  {
    label: "Typical response time",
    value: "Within 1 business day",
    icon: Timer,
  },
  {
    label: "Live help",
    value: "Chat available during support hours",
    icon: LifeBuoy,
  },
];

export default function ContactPage() {
  return (
    <ContentPage
      title="Contact Us"
      lede="Questions about an order, a build, or which GPU fits your case? Reach the NEXUS crew and we'll sort it out."
    >
      <Section heading="Ways to reach us">
        <ul className="grid gap-4 sm:grid-cols-2">
          {CONTACT_DETAILS.map(({ label, value, icon: Icon }) => (
            <li
              key={label}
              className="flex items-start gap-4 rounded-xl border border-border bg-card p-5"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="space-y-0.5">
                <span className="block text-sm font-medium text-foreground">{label}</span>
                <span className="block text-sm text-muted-foreground">{value}</span>
              </span>
            </li>
          ))}
        </ul>
        <Prose>
          Already browsing our guides? The Help Center covers shipping, returns, and warranty
          questions, often faster than waiting on a reply.
        </Prose>
      </Section>

      <Section heading="Send us a message">
        <Prose>
          Fill in the form below and the right person on our team will follow up by email. The more
          detail you share, the faster we can help.
        </Prose>
        <ContactForm />
      </Section>
    </ContentPage>
  );
}
