/**
 * /artists — redirects to /search (the real listing surface).
 * Added 2026-04-22 so typing /artists in the URL bar doesn't 404.
 */
import { redirect } from 'next/navigation';

export default function ArtistsIndexPage() {
  redirect('/search');
}
