import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { isCategory, isSlug, videoAssetPattern } from './features/portfolio/routes';

const text = (max: number) => z.string().trim().min(1).max(max);
const slug = z.string().refine(isSlug, 'Используйте до 64 символов: латиница в нижнем регистре, цифры и одиночные подчёркивания.');
const https = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}, 'Укажите HTTPS URL без учётных данных.');
const mediaUrl = z.union([https, z.string().regex(/^\/media\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/)]);

const projects = defineCollection({
  loader: glob({
    base: process.env.PORTFOLIO_TEST_FIXTURES === '1' ? './tests/fixtures/projects' : './src/content/projects',
    pattern: '*.md',
  }),
  schema: ({ image }) => {
    const visual = z.object({ image: image(), alt: text(180) });
    const videoDetails = {
      captions: mediaUrl.optional(),
      orientation: z.enum(['landscape', 'portrait']).default('landscape'),
      poster: image().optional(),
    };
    return z.object({
      id: slug,
      slug,
      aliases: z.array(slug).default([]),
      title: text(110),
      summary: text(200),
      kind: z.enum(['commercial', 'personal', 'demo', 'scenario']),
      context: text(200).optional(),
      status: z.enum(['draft', 'published']).default('draft'),
      categories: z.array(z.string().refine(isCategory)).min(1).max(6),
      tags: z.array(text(30)).min(2).max(4),
      featured: z.boolean().default(false),
      sortOrder: z.number().int().nonnegative().default(100),
      problem: text(2000),
      solution: text(3000),
      features: z.array(text(200)).min(3).max(6),
      technologies: z.array(text(42)).default([]),
      cover: visual.optional(),
      gallery: z.array(visual).default([]),
      video: z.union([
        z.strictObject({ src: mediaUrl, ...videoDetails }),
        z.strictObject({ asset: z.string().regex(videoAssetPattern), ...videoDetails }),
      ]).optional(),
      demoUrl: z.union([https, z.string().regex(/^\/demo\/[a-z0-9]+(?:-[a-z0-9]+)*$/)]).optional(),
      repositoryUrl: https.optional(),
      results: z.array(z.object({ label: text(100), value: text(100), evidenceNote: text(500) })).default([]),
      comparison: z.array(z.object({ label: text(100), before: text(120), after: text(120) })).max(8).default([]),
      fit: text(600).optional(),
    });
  },
});

export const collections = { projects };
