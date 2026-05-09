import type { ArcalistState } from '../types'

const favicon = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=32`

export const defaultState: ArcalistState = {
  activePageId: 'page-1',
  pages: [
    {
      id: 'page-1',
      title: 'Home',
      order: 0,
      boards: [
        {
          id: 'board-1',
          title: 'AI Tools',
          order: 0,
          bookmarks: [
            { id: 'bm-1', title: 'ChatGPT', url: 'https://chat.openai.com', favicon: favicon('chat.openai.com'), createdAt: Date.now() },
            { id: 'bm-2', title: 'Claude', url: 'https://claude.ai', favicon: favicon('claude.ai'), createdAt: Date.now() },
            { id: 'bm-3', title: 'Perplexity', url: 'https://perplexity.ai', favicon: favicon('perplexity.ai'), createdAt: Date.now() },
          ],
        },
        {
          id: 'board-2',
          title: 'Dev Tools',
          order: 1,
          bookmarks: [
            { id: 'bm-4', title: 'GitHub', url: 'https://github.com', favicon: favicon('github.com'), createdAt: Date.now() },
            { id: 'bm-5', title: 'Vercel', url: 'https://vercel.com', favicon: favicon('vercel.com'), createdAt: Date.now() },
            { id: 'bm-6', title: 'Supabase', url: 'https://supabase.com', favicon: favicon('supabase.com'), createdAt: Date.now() },
          ],
        },
        {
          id: 'board-3',
          title: 'Design',
          order: 2,
          bookmarks: [
            { id: 'bm-7', title: 'Figma', url: 'https://figma.com', favicon: favicon('figma.com'), createdAt: Date.now() },
            { id: 'bm-8', title: 'Dribbble', url: 'https://dribbble.com', favicon: favicon('dribbble.com'), createdAt: Date.now() },
          ],
        },
      ],
    },
    {
      id: 'page-2',
      title: 'Work',
      order: 1,
      boards: [
        {
          id: 'board-4',
          title: 'Communication',
          order: 0,
          bookmarks: [
            { id: 'bm-9', title: 'Slack', url: 'https://slack.com', favicon: favicon('slack.com'), createdAt: Date.now() },
            { id: 'bm-10', title: 'Notion', url: 'https://notion.so', favicon: favicon('notion.so'), createdAt: Date.now() },
            { id: 'bm-11', title: 'Linear', url: 'https://linear.app', favicon: favicon('linear.app'), createdAt: Date.now() },
          ],
        },
      ],
    },
  ],
}