// Shared Supabase client config for GTDIB news
// Loaded via ESM from the supabase-js CDN.
export const SUPABASE_URL = 'https://glfizcgayqecnvtfihgy.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZml6Y2dheXFlY252dGZpaGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTAzMDUsImV4cCI6MjEwMzU4NjMwNX0.V9MiUESH7Xu1TG4tadkj9a7_wi-pouLPtv3yYTSEn0I';
export const NEWS_BUCKET = 'news-images';

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

// Build the public URL for an object in the news-images bucket.
// Also supports external URLs (for auto-news articles that reference original images).
export function publicImageUrl(path) {
  if (!path) return '';
  // If it's already a full URL (http/https), return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${NEWS_BUCKET}/${path}`;
}

// Format an ISO date for display.
export function formatDate(iso, locale = 'az-AZ') {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}
