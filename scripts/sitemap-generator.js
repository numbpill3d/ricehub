#!/usr/bin/env node
/**
 * sitemap-generator.js
 * Generates dynamic sitemap.xml with all posts and profiles
 * Run during build: node scripts/sitemap-generator.js
 */

import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://numbpill3d.github.io/ricehub';
const OUTPUT_PATH = path.join(process.cwd(), 'sitemap.xml');

const STATIC_URLS = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/#feed', changefreq: 'hourly', priority: 0.9 },
  { url: '/#profile/', changefreq: 'weekly', priority: 0.8 },
  { url: '/#auth', changefreq: 'monthly', priority: 0.5 },
  { url: '/#about', changefreq: 'monthly', priority: 0.6 },
  { url: '/#stats', changefreq: 'daily', priority: 0.7 },
];

function generateStaticSitemap() {
  const today = new Date().toISOString().split('T')[0];
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n';
  xml += '        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"\n';
  xml += '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"\n';
  xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n';
  xml += '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n';
  
  for (const page of STATIC_URLS) {
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}${page.url}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="en" href="${BASE_URL}${page.url}" />\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${page.url}" />\n`;
    xml += '  </url>\n';
  }
  
  xml += '</urlset>';
  
  fs.writeFileSync(OUTPUT_PATH, xml, 'utf8');
  console.log(`[sitemap] Generated static sitemap at ${OUTPUT_PATH}`);
  console.log(`[sitemap] ${STATIC_URLS.length} static URLs included`);
}

// If run directly, generate static sitemap
if (import.meta.url === `file://${process.argv[1]}`) {
  generateStaticSitemap();
}

export { generateStaticSitemap, BASE_URL, STATIC_URLS };