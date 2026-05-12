export type DomainCategory =
  | "work"
  | "learning"
  | "social"
  | "entertainment"
  | "tools"
  | "other";

export const DOMAIN_CATEGORY_RULES: Record<
  Exclude<DomainCategory, "other">,
  string[]
> = {
  work: [
    "github.com",
    "vercel.com",
    "supabase.com",
    "notion.so",
    "slack.com",
    "linear.app",
    "docs.google.com",
    "drive.google.com",
  ],
  learning: [
    "stackoverflow.com",
    "developer.mozilla.org",
    "freecodecamp.org",
    "w3schools.com",
    "coursera.org",
    "udemy.com",
    "dev.to",
    "hashnode.com",
  ],
  social: [
    "x.com",
    "twitter.com",
    "instagram.com",
    "facebook.com",
    "linkedin.com",
    "reddit.com",
    "discord.com",
  ],
  entertainment: [
    "youtube.com",
    "netflix.com",
    "spotify.com",
    "twitch.tv",
    "primevideo.com",
    "hotstar.com",
  ],
  tools: [
    "figma.com",
    "canva.com",
    "chatgpt.com",
    "chat.openai.com",
    "claude.ai",
    "perplexity.ai",
  ],
};

export function categorizeDomain(domain: string): DomainCategory {
  const normalized = domain.toLowerCase();
  for (const [category, rules] of Object.entries(DOMAIN_CATEGORY_RULES)) {
    if (
      rules.some(
        (rule) => normalized === rule || normalized.endsWith(`.${rule}`),
      )
    ) {
      return category as DomainCategory;
    }
  }
  return "other";
}
