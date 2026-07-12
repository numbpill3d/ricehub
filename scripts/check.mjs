import { access, readFile } from 'node:fs/promises';

const required = ['index.html', 'src/main.js', 'src/styles.css', 'src/firebase-init.js', 'src/firebase-service.js'];
for (const file of required) {
  await access(file);
}

const html = await readFile('index.html', 'utf8');
if (!html.includes('/src/main.js')) throw new Error('index.html does not load /src/main.js');

const mainJs = await readFile('src/main.js', 'utf8');
for (const token of ['firebase', 'auth', 'localStorage', 'post-form', 'comment-form', 'toggleLike', 'toggleSave', 'addComment', 'exportDb', 'importDb']) {
  if (!mainJs.includes(token)) throw new Error(`missing expected main.js token: ${token}`);
}

const svc = await readFile('src/firebase-service.js', 'utf8');
for (const token of ['firestore', 'runTransaction', 'serverTimestamp', 'collection', 'doc', 'getDoc', 'getDocs', 'setDoc', 'updateDoc', 'deleteDoc', 'writeBatch', 'query', 'where', 'orderBy', 'limit', 'onSnapshot', 'uploadBytes', 'getDownloadURL', 'deleteObject', 'ref']) {
  if (!svc.includes(token)) throw new Error(`missing expected firebase-service token: ${token}`);
}

const init = await readFile('src/firebase-init.js', 'utf8');
for (const token of ['initializeApp', 'getAuth', 'getFirestore', 'getStorage', 'onAuthStateChanged', 'VITE_FIREBASE']) {
  if (!init.includes(token)) throw new Error(`missing expected firebase-init token: ${token}`);
}

console.log('ricehub check ok');