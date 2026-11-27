import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { APIRoute, GetStaticPaths } from 'astro';
import { publishedProjects } from '../../../features/portfolio/data';
import { isSlug, videoAssetPattern } from '../../../features/portfolio/routes';

export const getStaticPaths = (async () => {
  const projects = await publishedProjects();
  return projects.flatMap(({ slug, video }) => video && 'asset' in video
    ? [{ params: { slug, file: video.asset } }]
    : []);
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params: { slug, file } }) => {
  if (!slug || !isSlug(slug) || !file || !videoAssetPattern.test(file)) {
    return new Response(null, { status: 404 });
  }
  const clip = await readFile(join('src', 'assets', 'projects', slug, file));
  return new Response(new Uint8Array(clip), {
    headers: {
      'Content-Type': file.endsWith('.webm') ? 'video/webm' : 'video/mp4',
      'Content-Length': String(clip.length),
    },
  });
};
