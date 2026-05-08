export type Bookmark = {
  id: string
  title: string
  url: string
  favicon: string
}

export type Board = {
  id: string
  title: string
  bookmarks: Bookmark[]
}

export type Page = {
  id: string
  title: string
  boards: Board[]
}

const favicon = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=32`

export const mockPages: Page[] = [
  {
    id: 'page-1',
    title: 'Home',
    boards: [
      {
        id: 'board-1',
        title: 'AI Tools',
        bookmarks: [
          { id: 'bm-1', title: 'ChatGPT', url: 'https://chat.openai.com', favicon: favicon('chat.openai.com') },
          { id: 'bm-2', title: 'Claude', url: 'https://claude.ai', favicon: favicon('claude.ai') },
          { id: 'bm-3', title: 'Perplexity', url: 'https://perplexity.ai', favicon: favicon('perplexity.ai') },
          { id: 'bm-4', title: 'Midjourney', url: 'https://midjourney.com', favicon: favicon('midjourney.com') },
        ],
      },
      {
        id: 'board-2',
        title: 'Social Media',
        bookmarks: [
          { id: 'bm-5', title: 'Twitter / X', url: 'https://x.com', favicon: favicon('x.com') },
          { id: 'bm-6', title: 'LinkedIn', url: 'https://linkedin.com', favicon: favicon('linkedin.com') },
          { id: 'bm-7', title: 'Reddit', url: 'https://reddit.com', favicon: favicon('reddit.com') },
        ],
      },
      {
        id: 'board-3',
        title: 'Dev Tools',
        bookmarks: [
          { id: 'bm-8', title: 'GitHub', url: 'https://github.com', favicon: favicon('github.com') },
          { id: 'bm-9', title: 'Vercel', url: 'https://vercel.com', favicon: favicon('vercel.com') },
          { id: 'bm-10', title: 'Railway', url: 'https://railway.app', favicon: favicon('railway.app') },
          { id: 'bm-11', title: 'Supabase', url: 'https://supabase.com', favicon: favicon('supabase.com') },
        ],
      },
      {
        id: 'board-4',
        title: 'Design',
        bookmarks: [
          { id: 'bm-12', title: 'Figma', url: 'https://figma.com', favicon: favicon('figma.com') },
          { id: 'bm-13', title: 'Dribbble', url: 'https://dribbble.com', favicon: favicon('dribbble.com') },
          { id: 'bm-14', title: 'Behance', url: 'https://behance.net', favicon: favicon('behance.net') },
        ],
      },
      {
        id: 'board-5',
        title: 'Cloud Storage',
        bookmarks: [
          { id: 'bm-15', title: 'Google Drive', url: 'https://drive.google.com', favicon: favicon('drive.google.com') },
          { id: 'bm-16', title: 'Dropbox', url: 'https://dropbox.com', favicon: favicon('dropbox.com') },
        ],
      },
    ],
  },
  {
    id: 'page-2',
    title: 'Work',
    boards: [
      {
        id: 'board-6',
        title: 'Communication',
        bookmarks: [
          { id: 'bm-17', title: 'Slack', url: 'https://slack.com', favicon: favicon('slack.com') },
          { id: 'bm-18', title: 'Notion', url: 'https://notion.so', favicon: favicon('notion.so') },
          { id: 'bm-19', title: 'Linear', url: 'https://linear.app', favicon: favicon('linear.app') },
        ],
      },
      {
        id: 'board-7',
        title: 'Finance',
        bookmarks: [
          { id: 'bm-20', title: 'Stripe', url: 'https://stripe.com', favicon: favicon('stripe.com') },
          { id: 'bm-21', title: 'Mercury', url: 'https://mercury.com', favicon: favicon('mercury.com') },
        ],
      },
    ],
  },
  {
    id: 'page-3',
    title: 'Learning',
    boards: [
      {
        id: 'board-8',
        title: 'Courses',
        bookmarks: [
          { id: 'bm-22', title: 'Udemy', url: 'https://udemy.com', favicon: favicon('udemy.com') },
          { id: 'bm-23', title: 'Coursera', url: 'https://coursera.org', favicon: favicon('coursera.org') },
        ],
      },
    ],
  },
]