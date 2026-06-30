"use client";

import { useId, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { scaleIn } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Interactive contact form (the only client part of the otherwise
 * server-rendered Contact page). There is no backend in this demo, so submit is
 * intercepted: empty required fields pin a static destructive ring, and a valid
 * submit swaps the form for a success confirmation.
 *
 * Only transform/opacity animate, and the success swap is reduced-motion-safe
 * via the shared variants helper. Inline error slots reserve a fixed height so
 * toggling validation never shifts layout (CLS ~ 0).
 */

interface FieldErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

// Pragmatic email shape: local-part @ domain . tld — no whitespace.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass = (invalid: boolean) =>
  cn(
    "w-full rounded-md border bg-background px-3 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    invalid ? "border-destructive ring-1 ring-destructive" : "border-border",
  );

export function ContactForm() {
  const { variants } = useReducedMotion();
  const baseId = useId();
  const ids = {
    name: `${baseId}-name`,
    email: `${baseId}-email`,
    subject: `${baseId}-subject`,
    message: `${baseId}-message`,
  };

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FieldErrors = {};
    if (!name.trim()) nextErrors.name = "Enter your name";
    if (!EMAIL_RE.test(email.trim())) nextErrors.email = "Enter a valid email";
    if (!subject.trim()) nextErrors.subject = "Add a subject";
    if (!message.trim()) nextErrors.message = "Let us know how we can help";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <motion.div
        variants={variants(scaleIn)}
        initial="hidden"
        animate="visible"
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center"
      >
        <CheckCircle2 className="size-9 text-primary" aria-hidden />
        <p className="font-display text-lg font-semibold text-foreground">
          Thanks, we&apos;ll get back to you
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your message is on its way to the NEXUS support crew. Expect a reply at the email you
          provided within one business day.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={ids.name} className="block text-sm font-medium text-foreground">
            Name
          </label>
          <input
            id={ids.name}
            type="text"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            placeholder="Your name"
            aria-invalid={Boolean(errors.name) || undefined}
            aria-describedby={`${ids.name}-error`}
            className={inputClass(Boolean(errors.name))}
          />
          <p id={`${ids.name}-error`} className="min-h-4 text-xs leading-4 text-destructive">
            {errors.name ?? ""}
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={ids.email} className="block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id={ids.email}
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email) || undefined}
            aria-describedby={`${ids.email}-error`}
            className={inputClass(Boolean(errors.email))}
          />
          <p id={`${ids.email}-error`} className="min-h-4 text-xs leading-4 text-destructive">
            {errors.email ?? ""}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={ids.subject} className="block text-sm font-medium text-foreground">
          Subject
        </label>
        <input
          id={ids.subject}
          type="text"
          name="subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="What's this about?"
          aria-invalid={Boolean(errors.subject) || undefined}
          aria-describedby={`${ids.subject}-error`}
          className={inputClass(Boolean(errors.subject))}
        />
        <p id={`${ids.subject}-error`} className="min-h-4 text-xs leading-4 text-destructive">
          {errors.subject ?? ""}
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={ids.message} className="block text-sm font-medium text-foreground">
          Message
        </label>
        <textarea
          id={ids.message}
          name="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={6}
          placeholder="Tell us what you need a hand with."
          aria-invalid={Boolean(errors.message) || undefined}
          aria-describedby={`${ids.message}-error`}
          className={cn(
            "w-full resize-y rounded-md border bg-background px-3 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            errors.message ? "border-destructive ring-1 ring-destructive" : "border-border",
          )}
        />
        <p id={`${ids.message}-error`} className="min-h-4 text-xs leading-4 text-destructive">
          {errors.message ?? ""}
        </p>
      </div>

      <Button type="submit" size="lg">
        Send message
      </Button>
    </form>
  );
}
