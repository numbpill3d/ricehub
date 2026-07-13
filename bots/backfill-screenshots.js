#!/usr/bin/env node

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { screenshotFor } from './screenshot-catalog.js';

function serviceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
  }
  throw new Error('Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS');
}

const db = getFirestore(initializeApp({ credential: cert(serviceAccount()) }));
const snapshot = await db.collection('posts').get();
const batch = db.batch();
let updated = 0;

for (const doc of snapshot.docs) {
  const post = doc.data();
  let screenshot;
  try {
    screenshot = screenshotFor(post.title);
  } catch {
    continue;
  }

  batch.update(doc.ref, {
    image: screenshot.url,
    imageSource: screenshot.source,
    links: [...new Set([...(post.links || []), screenshot.source])],
    attachments: [{
      id: randomUUID(),
      name: screenshot.filename,
      type: 'image/webp',
      kind: 'image',
      url: screenshot.url,
      source: screenshot.source,
    }],
    updatedAt: Timestamp.now(),
  });
  updated += 1;
}

if (updated) await batch.commit();
console.log(JSON.stringify({ scanned: snapshot.size, updated }));
