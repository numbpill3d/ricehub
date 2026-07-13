#!/usr/bin/env node
/**
 * ricehub sitemap generator
 * Generates sitemap.xml, sitemap-posts.xml, sitemap-profiles.xml
 * Run after build: node scripts/generate-sitemap.js
 */

import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://numbpill3d.github.io/ricehub';
const OUTPUT_DIR = path.join(process.cwd(), 'dist');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Current date for lastmod
const TODAY = new Date().toISOString().split('T')[0];

// Static pages
const STATIC_PAGES = [
  { url: '/', changefreq: 'daily', priority: 1.0, lastmod: TODAY },
  { url: '/#feed', changefreq: 'hourly', priority: 0.9, lastmod: TODAY },
  { url: '/#composer', changefreq: 'weekly', priority: 0.5, lastmod: TODAY },
  { url: '/#profile', changefreq: 'weekly', priority: 0.6, lastmod: TODAY },
  { url: '/rss.xml', changefreq: 'hourly', priority: 0.8, lastmod: TODAY },
  { url: '/atom.xml', changefreq: 'hourly', priority: 0.8, lastmod: TODAY },
];

// Component categories for theme sitemap
const COMPONENTS = [
  'sddm', 'plasma', 'aurorae', 'kvantum', 'gtk', 'icons', 'cursors',
  'colorscheme', 'wallpaper', 'eww', 'waybar', 'rofi', 'conky', 'terminal',
  'hyprland', 'sway', 'dotfiles', 'full-rice'
];

// Generate sitemap XML
function generateSitemap(urls, filename) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${urls.map(url => `  <url>
    <loc>${BASE_URL}${url.url}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), xml);
  console.log(`✅ Generated ${filename} with ${urls.length} URLs`);
}

// Generate main sitemap
function generateMainSitemap() {
  generateSitemap(STATIC_PAGES, 'sitemap.xml');
}

// Generate posts sitemap (hash-based routes for feed filters)
function generatePostsSitemap() {
  const postsUrls = COMPONENTS.map(comp => ({
    url: `/#feed?component=${comp}`,
    changefreq: 'daily',
    priority: 0.8,
    lastmod: TODAY
  }));
  
  // Sort options
  const sortUrls = ['hot', 'new', 'saved'].map(sort => ({
    url: `/#feed?sort=${sort}`,
    changefreq: 'hourly',
    priority: 0.7,
    lastmod: TODAY
  }));
  
  const allUrls = [...postsUrls, ...sortUrls];
  generateSitemap(allUrls, 'sitemap-posts.xml');
}

// Generate profiles sitemap
function generateProfilesSitemap() {
  // This would be populated from actual user data in production
  // For now, generate template URLs for profile routes
  const profileUrls = [
    { url: '/#profile/voidmaintainer', changefreq: 'weekly', priority: 0.6, lastmod: TODAY },
    { url: '/#profile/plasma_tinkerer', changefreq: 'weekly', priority: 0.6, lastmod: TODAY },
    { url: '/#profile/cursor_hoarder', changefreq: 'weekly', priority: 0.6, lastmod: TODAY },
  ];
  
  generateSitemap(profileUrls, 'sitemap-profiles.xml');
}

// Generate sitemap index
function generateSitemapIndex() {
  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap.xml</loc>
    <lastmod>${TODAY}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-posts.xml</loc>
    <lastmod>${TODAY}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-profiles.xml</loc>
    <lastmod>${TODAY}</lastmod>
  </sitemap>
</sitemapindex>`;
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap-index.xml'), indexXml);
  console.log('✅ Generated sitemap-index.xml');
}

// Main
function main() {
  console.log('🗺️  Generating ricehub sitemaps...\n');
  
  generateMainSitemap();
  generatePostsSitemap();
  generateProfilesSitemap();
  generateSitemapIndex();
  
  console.log('\n✨ All sitemaps generated in dist/');
  console.log('\nNext steps:');
  console.log('  1. Submit sitemap-index.xml to Google Search Console');
  console.log('  2. Submit sitemap-index.xml to Bing Webmaster Tools');
  console.log('  3. Add robots.txt to dist/ (already exists)');
}

main();