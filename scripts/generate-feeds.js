#!/usr/bin/env node
/**
 * ricehub feed generator
 * Generates RSS 2.0 and Atom 1.0 feeds from posts data
 * Run after build: node scripts/generate-feeds.js
 */

import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://numbpill3d.github.io/ricehub';
const OUTPUT_DIR = path.join(process.cwd(), 'dist');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Current date
const NOW = new Date();
const RFC822_DATE = NOW.toUTCString();
const ISO_DATE = NOW.toISOString();

// Component categories for theme of the day / categories
const COMPONENTS = [
  'sddm', 'plasma', 'aurorae', 'kvantum', 'gtk', 'icons', 'cursors',
  'colorscheme', 'wallpaper', 'eww', 'waybar', 'rofi', 'conky', 'terminal',
  'hyprland', 'sway', 'dotfiles', 'full-rice'
];

// Seed posts for feed generation (in production, this would come from Firestore/localStorage)
const SEED_POSTS = [
  {
    id: 'seed-1',
    title: 'black terminal rice index skeleton',
    author: 'voidmaintainer',
    handle: 'voidmaintainer',
    component: 'full-rice',
    distro: 'arch',
    wm: 'sway',
    license: 'mit',
    summary: 'starter specimen showing the expected shape: screenshots, config notes, component tags, comments, saves. replace this with real public submissions when backend lands.',
    tags: ['terminal', 'red-black', 'pixel-font', 'prototype'],
    links: ['https://store.kde.org/', 'https://www.gnome-look.org/'],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    likesCount: 3,
    savesCount: 1,
    commentsCount: 2,
  },
  {
    id: 'seed-2',
    title: 'nordic-kde plasma theme + kvantum',
    author: 'plasma_tinkerer',
    handle: 'plasma_tinkerer',
    component: 'plasma',
    distro: 'fedora',
    wm: 'kde plasma',
    license: 'gpl-3.0',
    summary: 'complete nord-themed plasma desktop. includes color scheme, window decorations (kvantum), sddm theme, and matching wallpaper. tested on plasma 6.1.',
    tags: ['nord', 'kde', 'plasma', 'kvantum', 'blue'],
    links: ['https://store.kde.org/p/1234567/'],
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172800000,
    likesCount: 12,
    savesCount: 5,
    commentsCount: 3,
  },
  {
    id: 'seed-3',
    title: 'material-you cursors for linux',
    author: 'cursor_hoarder',
    handle: 'cursor_hoarder',
    component: 'cursors',
    distro: 'nixos',
    wm: 'hyprland',
    license: 'cc-by-4.0',
    summary: 'ported google material you cursor theme to x11/wayland. 48 cursors, all states animated. works on hyprland, sway, kde, gnome.',
    tags: ['material', 'google', 'animated', 'wayland', 'x11'],
    links: ['https://www.rw-designer.com/cursor-set/material-you'],
    createdAt: Date.now() - 259200000,
    updatedAt: Date.now() - 259200000,
    likesCount: 8,
    savesCount: 3,
    commentsCount: 1,
  }
];

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&apos;');
}

function formatRfc822(date) {
  return new Date(date).toUTCString();
}

function formatIso(date) {
  return new Date(date).toISOString();
}

function generateRss(posts) {
  const items = posts.map(post => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${BASE_URL}/#post/${post.id}</link>
      <guid isPermaLink="false">${BASE_URL}/#post/${post.id}</guid>
      <pubDate>${formatRfc822(post.createdAt)}</pubDate>
      <dc:creator>${escapeXml(post.author)}</dc:creator>
      <category>${escapeXml(post.component)}</category>
      ${post.tags.map(t => `<category>${escapeXml(t)}</category>`).join('\n      ')}
      <description><![CDATA[${post.summary}]]></description>
      <content:encoded><![CDATA[
        <p><strong>Component:</strong> ${escapeXml(post.component)} | <strong>Distro:</strong> ${escapeXml(post.distro || 'unknown')} | <strong>WM:</strong> ${escapeXml(post.wm || 'unknown')}</p>
        <p><strong>License:</strong> ${escapeXml(post.license)}</p>
        <p>${escapeXml(post.summary)}</p>
        ${post.tags.length ? `<p>Tags: ${post.tags.map(t => `<code>${escapeXml(t)}</code>`).join(', ')}</p>` : ''}
        ${post.links.length ? `<p>Links: ${post.links.map(l => `<a href="${escapeXml(l)}">${escapeXml(l)}</a>`).join(' | ')}</p>` : ''}
        <p><small>👍 ${post.likesCount} likes · 💾 ${post.savesCount} saves · 💬 ${post.commentsCount} comments</small></p>
      ]]></content:encoded>
    </item>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ricehub // linux theming social index</title>
    <link>${BASE_URL}</link>
    <description>discover and share kde plasma, gtk, hyprland, sway, waybar, rofi, terminal rice themes. a social index for linux ricing.</description>
    <language>en-US</language>
    <copyright>CC-BY-SA 4.0 ricehub contributors</copyright>
    <managingEditor>noreply@ricehub.local (ricehub)</managingEditor>
    <webMaster>noreply@ricehub.local (ricehub)</webMaster>
    <lastBuildDate>${RFC822_DATE}</lastBuildDate>
    <pubDate>${RFC822_DATE}</pubDate>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${BASE_URL}/icon-144.png</url>
      <title>ricehub</title>
      <link>${BASE_URL}</link>
      <width>144</width>
      <height>144</height>
    </image>
    <ttl>60</ttl>
    ${items}
  </channel>
</rss>`;
}

function generateAtom(posts) {
  const entries = posts.map(post => `
    <entry>
      <id>${BASE_URL}/#post/${post.id}</id>
      <title type="text">${escapeXml(post.title)}</title>
      <link rel="alternate" type="text/html" href="${BASE_URL}/#post/${post.id}"/>
      <updated>${formatIso(post.updatedAt)}</updated>
      <published>${formatIso(post.createdAt)}</published>
      <author>
        <name>${escapeXml(post.author)}</name>
        <uri>${BASE_URL}/#profile/${post.handle}</uri>
      </author>
      <category term="${escapeXml(post.component)}" scheme="${BASE_URL}/components"/>
      ${post.tags.map(t => `<category term="${escapeXml(t)}" scheme="${BASE_URL}/tags"/>`).join('\n      ')}
      <summary type="html"><![CDATA[${post.summary}]]></summary>
      <content type="html"><![CDATA[
        <p><strong>Component:</strong> ${escapeXml(post.component)} | <strong>Distro:</strong> ${escapeXml(post.distro || 'unknown')} | <strong>WM:</strong> ${escapeXml(post.wm || 'unknown')}</p>
        <p><strong>License:</strong> ${escapeXml(post.license)}</p>
        <p>${escapeXml(post.summary)}</p>
        ${post.tags.length ? `<p>Tags: ${post.tags.map(t => `<code>${escapeXml(t)}</code>`).join(', ')}</p>` : ''}
        ${post.links.length ? `<p>Links: ${post.links.map(l => `<a href="${escapeXml(l)}">${escapeXml(l)}</a>`).join(' | ')}</p>` : ''}
        <p><small>👍 ${post.likesCount} likes · 💾 ${post.savesCount} saves · 💬 ${post.commentsCount} comments</small></p>
      ]]></content>
    </entry>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${BASE_URL}/</id>
  <title>ricehub // linux theming social index</title>
  <subtitle>discover and share kde plasma, gtk, hyprland, sway, waybar, rofi, terminal rice themes</subtitle>
  <link rel="self" type="application/atom+xml" href="${BASE_URL}/atom.xml"/>
  <link rel="alternate" type="text/html" href="${BASE_URL}"/>
  <updated>${ISO_DATE}</updated>
  <author>
    <name>ricehub</name>
    <uri>${BASE_URL}</uri>
  </author>
  <generator uri="https://github.com/numbpill3d/ricehub">ricehub feed generator</generator>
  <rights>CC-BY-SA 4.0 ricehub contributors</rights>
  <icon>${BASE_URL}/icon-192.png</icon>
  <logo>${BASE_URL}/icon-512.png</logo>
  ${entries}
</feed>`;
}

function generateJsonFeed(posts) {
  const items = posts.map(post => ({
    id: `${BASE_URL}/#post/${post.id}`,
    url: `${BASE_URL}/#post/${post.id}`,
    title: post.title,
    content_html: `
      <p><strong>Component:</strong> ${escapeXml(post.component)} | <strong>Distro:</strong> ${escapeXml(post.distro || 'unknown')} | <strong>WM:</strong> ${escapeXml(post.wm || 'unknown')}</p>
      <p><strong>License:</strong> ${escapeXml(post.license)}</p>
      <p>${escapeXml(post.summary)}</p>
      ${post.tags.length ? `<p>Tags: ${post.tags.map(t => `<code>${escapeXml(t)}</code>`).join(', ')}</p>` : ''}
      ${post.links.length ? `<p>Links: ${post.links.map(l => `<a href="${escapeXml(l)}">${escapeXml(l)}</a>`).join(' | ')}</p>` : ''}
      <p><small>👍 ${post.likesCount} likes · 💾 ${post.savesCount} saves · 💬 ${post.commentsCount} comments</small></p>
    `,
    summary: post.summary,
    date_published: new Date(post.createdAt).toISOString(),
    date_modified: new Date(post.updatedAt).toISOString(),
    authors: [{ name: post.author, url: `${BASE_URL}/#profile/${post.handle}` }],
    tags: [post.component, ...post.tags],
    _ricehub: {
      component: post.component,
      distro: post.distro,
      wm: post.wm,
      license: post.license,
      stats: { likes: post.likesCount, saves: post.savesCount, comments: post.commentsCount }
    }
  }));

  return JSON.stringify({
    version: 'https://jsonfeed.org/version/1.1',
    title: 'ricehub // linux theming social index',
    home_page_url: BASE_URL,
    feed_url: `${BASE_URL}/feed.json`,
    description: 'discover and share kde plasma, gtk, hyprland, sway, waybar, rofi, terminal rice themes',
    author: { name: 'ricehub', url: BASE_URL },
    items
  }, null, 2);
}

function main() {
  console.log('📡 Generating ricehub feeds...\n');
  
  // In production, load from localStorage export or Firestore
  // For now, use seed posts
  const posts = SEED_POSTS.sort((a, b) => b.createdAt - a.createdAt);
  
  // Generate feeds
  const rss = generateRss(posts);
  const atom = generateAtom(posts);
  const jsonFeed = generateJsonFeed(posts);
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'rss.xml'), rss);
  console.log('✅ Generated rss.xml');
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'atom.xml'), atom);
  console.log('✅ Generated atom.xml');
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'feed.json'), jsonFeed);
  console.log('✅ Generated feed.json');
  
  console.log('\n✨ All feeds generated in dist/');
  console.log('   - rss.xml (RSS 2.0)');
  console.log('   - atom.xml (Atom 1.0)');
  console.log('   - feed.json (JSON Feed 1.1)');
}

main();