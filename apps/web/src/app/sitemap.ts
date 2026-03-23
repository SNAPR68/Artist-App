import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://artist-booking-web.vercel.app';

  // Static pages
  const staticPages = ['', '/search', '/about', '/privacy', '/terms'].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // Dynamic artist pages
  let artistPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/search/artists?per_page=200`, {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    artistPages = (data?.data?.artists || data?.data || []).map((a: any) => ({
      url: `${baseUrl}/artists/${a.id}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }));
  } catch {
    // Silently fail — sitemap will just have static pages
  }

  return [...staticPages, ...artistPages];
}
