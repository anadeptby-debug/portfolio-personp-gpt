export const categories = {
  web: 'Сайты и магазины',
  bots: 'Боты и Mini Apps',
  ai: 'ИИ и LLM',
  automation: 'Автоматизация',
  integrations: 'CRM и интеграции',
  data: 'Парсинг и аналитика',
} as const;

export const projectKinds = {
  commercial: 'Коммерческий проект',
  personal: 'Личный проект',
  demo: 'Демонстрационный проект',
} as const;

export type Category = keyof typeof categories;
export const slugPattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
export const videoAssetPattern = /^[a-z0-9_-]+\.(?:mp4|webm)$/;
const maxSlug = 64;

export function isSlug(value: string) {
  return value.length <= maxSlug && slugPattern.test(value);
}

export function isCategory(value: string): value is Category {
  return Object.hasOwn(categories, value);
}

export function categoryFromUrl(url: URL): Category | undefined {
  const values = url.searchParams.getAll('category');
  return values.length === 1 && isCategory(values[0]) ? values[0] : undefined;
}

export function projectPath(slug: string) {
  return '/projects/' + encodeURIComponent(slug);
}

export function projectVideoPath(slug: string, file: string) {
  return '/project-media/' + encodeURIComponent(slug) + '/' + encodeURIComponent(file);
}

export function catalogPath(category?: Category) {
  return category ? '/projects?category=' + category : '/projects';
}

export type ProjectRoute = { slug: string; aliases: readonly string[] };

export function resolveStart(start: string | undefined, projects: readonly ProjectRoute[]) {
  if (!start) return '/';
  if (start.startsWith('cat_')) {
    const category = start.slice(4);
    if (isCategory(category)) return catalogPath(category);
  }
  if (start.startsWith('case_')) {
    const slug = start.slice(5);
    if (isSlug(slug)) {
      const project = projects.find((entry) => entry.slug === slug || entry.aliases.includes(slug));
      if (project) return projectPath(project.slug);
    }
  }
  return '/projects?status=unavailable';
}
