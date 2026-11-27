import { getCollection, type CollectionEntry } from 'astro:content';
import { z } from 'astro/zod';
import ownerProfile from '../../content/profile.json';
import fixtureProfile from '../../../tests/fixtures/profile.json';
import { ownerUsernamePattern } from '../sharing/links';

const optionalText = (max: number) => z.string().trim().min(1).max(max).nullable();
const publicHttps = z.url({ protocol: /^https$/ }).refine((value) => {
  const url = new URL(value);
  return !url.username && !url.password;
});
const profileSchema = z.object({
  displayName: optionalText(72),
  headline: optionalText(110),
  bio: optionalText(2000),
  avatar: z.union([publicHttps, z.string().regex(/^\/media\/[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/)]).nullable(),
  availability: z.enum(['available', 'busy', 'hidden']),
  telegramUsername: z.string().regex(ownerUsernamePattern).nullable(),
  githubUrl: publicHttps.nullable(),
  email: z.email().nullable(),
  competencies: z.array(z.string().trim().min(1).max(92)),
});

export const profile = profileSchema.parse(__PORTFOLIO_TEST_FIXTURES__ ? fixtureProfile : ownerProfile);
export type Project = Omit<CollectionEntry<'projects'>['data'], 'results'> & {
  results: { label: string; value: string }[];
};

export async function publishedProjects(): Promise<Project[]> {
  const records = await getCollection('projects');
  const ids = new Set<string>();
  const routes = new Set<string>();
  for (const { data } of records) {
    if (ids.has(data.id)) throw new Error('Повторяется ID проекта: ' + data.id);
    ids.add(data.id);
    for (const route of [data.slug, ...data.aliases]) {
      if (routes.has(route)) throw new Error('Повторяется маршрут проекта: ' + route);
      routes.add(route);
    }
  }

  return records
    .filter(({ data }) => data.status === 'published')
    .map(({ data }) => ({
      ...data,
      results: data.results.map(({ label, value }) => ({ label, value })),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug, 'en'));
}

export function relatedProjects(project: Project, projects: Project[]) {
  return projects
    .filter((other) => other.slug !== project.slug && other.categories.some((category) => project.categories.includes(category)))
    .slice(0, 3);
}
