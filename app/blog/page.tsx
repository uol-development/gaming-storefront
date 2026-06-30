import Link from "next/link";

import { ContentPage, Prose, Section } from "@/components/content/content-page";

export const metadata = { title: "Blog" };

interface Post {
  title: string;
  date: string;
  category: string;
  excerpt: string;
}

const POSTS: Post[] = [
  {
    title: "1080p, 1440p, or 4K? Picking the right resolution for your GPU",
    date: "June 18, 2026",
    category: "Buying guide",
    excerpt:
      "Resolution decides how hard your graphics card has to work every frame. We break down which pairing keeps you above your target refresh rate — and where spending more stops paying off.",
  },
  {
    title: "Mechanical switches, decoded: linear vs tactile vs clicky",
    date: "June 4, 2026",
    category: "Peripherals",
    excerpt:
      "Reds, browns, blues — the colours hide what actually matters for your hands. Here is how switch type changes feel, speed, and noise, and how to choose for fast-paced ranked play.",
  },
  {
    title: "Stop blaming your aim: why polling rate and latency matter",
    date: "May 21, 2026",
    category: "Performance",
    excerpt:
      "Sometimes it really is the gear. We measured real input latency across mice and monitors so you can see exactly where the milliseconds go — and which upgrades you will actually feel.",
  },
  {
    title: "Building a quiet rig that still hits 240 FPS",
    date: "May 7, 2026",
    category: "Builds",
    excerpt:
      "High frame rates and a whisper-quiet case are not mutually exclusive. Our parts picks and airflow tips keep temperatures — and noise — down without throttling performance.",
  },
];

/**
 * Blog index. Server Component on the shared ContentPage shell. Shows a short
 * intro and a list of sample post previews as cards. There are no per-post
 * routes, so previews are intentionally non-clickable (no /blog/[slug] links);
 * the only navigation points at valid internal routes.
 */
export default function BlogPage() {
  return (
    <ContentPage
      title="Blog"
      lede="Guides, gear breakdowns, and performance deep-dives from the players behind NEXUS — written to help you spend smart and play better."
    >
      <Section heading="Latest posts">
        <Prose>
          A sample of what we have been writing lately. New articles land here
          regularly — and most end with concrete picks you can grab over on{" "}
          <Link
            href="/products"
            className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            our shop
          </Link>
          .
        </Prose>

        <ul className="space-y-4">
          {POSTS.map((post) => (
            <li
              key={post.title}
              className="rounded-xl border border-border bg-card p-4 sm:p-5"
            >
              <article className="space-y-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="rounded-md bg-primary/15 px-2 py-0.5 font-medium text-primary">
                    {post.category}
                  </span>
                  <time className="text-muted-foreground">{post.date}</time>
                </div>
                <h3 className="font-display text-lg font-semibold tracking-tight">
                  {post.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {post.excerpt}
                </p>
              </article>
            </li>
          ))}
        </ul>
      </Section>

      <Section heading="Want a topic covered?">
        <Prose>
          Got a build question or a piece of gear you want us to dig into? Send it
          our way through the{" "}
          <Link
            href="/contact"
            className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            contact page
          </Link>{" "}
          — reader questions shape a lot of what we publish.
        </Prose>
      </Section>
    </ContentPage>
  );
}
