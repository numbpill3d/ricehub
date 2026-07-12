/**
 * Firebase service layer for ricehub
 * Handles all Firestore and Storage operations
 */

import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, onSnapshot, writeBatch, runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

import { getFirestoreInstance, getStorageInstance, getAuthInstance, onAuthChange } from './firebase-init.js';

const POSTS_COLLECTION = 'posts';
const LIKES_COLLECTION = 'post_likes';
const SAVES_COLLECTION = 'post_saves';
const COMMENTS_COLLECTION = 'comments';
const USERS_COLLECTION = 'users';
const FOLLOWS_COLLECTION = 'follows';
const NOTIFICATIONS_COLLECTION = 'notifications';

let db = null;
let storage = null;
let auth = null;
let currentUser = null;
let authUnsub = null;

export async function initFirebaseService(useEmulator = false) {
  const init = await import('./firebase-init.js');
  const instances = await init.initFirebase(useEmulator);
  db = init.getFirestoreInstance();
  storage = init.getStorageInstance();
  auth = init.getAuthInstance();
  
  if (auth) {
    authUnsub = init.onAuthChange((user) => {
      currentUser = user;
    });
  }
  
  return { db, storage, auth, currentUser };
}

export function getCurrentUser() {
  return currentUser;
}

export function onAuthStateChanged(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthChange(callback);
}

export function cleanup() {
  if (authUnsub) authUnsub();
}

export function getUserHandle() {
  return currentUser?.displayName || currentUser?.uid || 'anonymous';
}

// ========== POSTS ==========

export async function createPost(postData) {
  if (!db || !currentUser) throw new Error('Not authenticated');
  
  const postRef = doc(collection(db, POSTS_COLLECTION));
  const post = {
    ...postData,
    id: postRef.id,
    handle: currentUser.uid,
    author: currentUser.displayName || currentUser.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    likesCount: 0,
    savesCount: 0,
    commentsCount: 0
  };
  
  await setDoc(postRef, post);
  return postRef.id;
}

export async function getPost(postId) {
  if (!db) throw new Error('Firestore not initialized');
  const postDoc = await getDoc(doc(db, POSTS_COLLECTION, postId));
  return postDoc.exists() ? { id: postDoc.id, ...postDoc.data() } : null;
}

export async function updatePost(postId, updates) {
  if (!db || !currentUser) throw new Error('Not authenticated');
  const postRef = doc(db, POSTS_COLLECTION, postId);
  const postDoc = await getDoc(postRef);
  if (!postDoc.exists()) throw new Error('Post not found');
  if (postDoc.data().handle !== currentUser.uid) throw new Error('Not authorized');
  
  await updateDoc(postRef, { ...updates, updatedAt: serverTimestamp() });
}

export async function deletePost(postId) {
  if (!db || !currentUser) throw new Error('Not authenticated');
  const postRef = doc(db, POSTS_COLLECTION, postId);
  const postDoc = await getDoc(postRef);
  if (!postDoc.exists()) throw new Error('Post not found');
  if (postDoc.data().handle !== currentUser.uid) throw new Error('Not authorized');
  
  // Delete subcollections in batch
  const batch = writeBatch(db);
  
  // Delete likes
  const likesSnap = await getDocs(query(collection(db, LIKES_COLLECTION), where('postId', '==', postId)));
  likesSnap.docs.forEach(d => batch.delete(d.ref));
  
  // Delete saves
  const savesSnap = await getDocs(query(collection(db, SAVES_COLLECTION), where('postId', '==', postId)));
  savesSnap.docs.forEach(d => batch.delete(d.ref));
  
  // Delete comments
  const commentsSnap = await getDocs(query(collection(db, COMMENTS_COLLECTION), where('postId', '==', postId)));
  commentsSnap.docs.forEach(d => batch.delete(d.ref));
  
  // Delete post
  batch.delete(postRef);
  
  await batch.commit();
}

export function subscribeToPosts(options = {}, callback) {
  if (!db) {
    callback([]);
    return () => {};
  }
  
  const { component, sort = 'hot', queryText, limitCount = 50 } = options;
  let q = query(collection(db, POSTS_COLLECTION), orderBy('createdAt', 'desc'), limit(limitCount));
  
  if (component && component !== 'all') {
    q = query(collection(db, POSTS_COLLECTION), where('component', '==', component), orderBy('createdAt', 'desc'), limit(limitCount));
  }
  
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(posts);
  });
}

// ========== LIKES ==========

export async function toggleLike(postId) {
  if (!db || !currentUser) throw new Error('Not authenticated');
  
  const likeRef = doc(db, LIKES_COLLECTION, `${currentUser.uid}_${postId}`);
  const likeDoc = await getDoc(likeRef);
  const postRef = doc(db, POSTS_COLLECTION, postId);
  
  await runTransaction(db, async (transaction) => {
    const postDoc = await transaction.get(postRef);
    if (!postDoc.exists()) throw new Error('Post not found');
    
    const postData = postDoc.data();
    const currentLikes = postData.likesCount || 0;
    
    if (likeDoc.exists()) {
      transaction.delete(likeRef);
      transaction.update(postRef, { likesCount: currentLikes - 1 });
    } else {
      transaction.set(likeRef, {
        postId,
        handle: currentUser.uid,
        createdAt: serverTimestamp()
      });
      transaction.update(postRef, { likesCount: currentLikes + 1 });
    }
  });
}

export async function isPostLiked(postId) {
  if (!db || !currentUser) return false;
  const likeDoc = await getDoc(doc(db, LIKES_COLLECTION, `${currentUser.uid}_${postId}`));
  return likeDoc.exists();
}

// ========== SAVES ==========

export async function toggleSave(postId) {
  if (!db || !currentUser) throw new Error('Not authenticated');
  
  const saveRef = doc(db, SAVES_COLLECTION, `${currentUser.uid}_${postId}`);
  const saveDoc = await getDoc(saveRef);
  const postRef = doc(db, POSTS_COLLECTION, postId);
  
  await runTransaction(db, async (transaction) => {
    const postDoc = await transaction.get(postRef);
    if (!postDoc.exists()) throw new Error('Post not found');
    
    const postData = postDoc.data();
    const currentSaves = postData.savesCount || 0;
    
    if (saveDoc.exists()) {
      transaction.delete(saveRef);
      transaction.update(postRef, { savesCount: currentSaves - 1 });
    } else {
      transaction.set(saveRef, {
        postId,
        handle: currentUser.uid,
        createdAt: serverTimestamp()
      });
      transaction.update(postRef, { savesCount: currentSaves + 1 });
    }
  });
}

export async function isPostSaved(postId) {
  if (!db || !currentUser) return false;
  const saveDoc = await getDoc(doc(db, SAVES_COLLECTION, `${currentUser.uid}_${postId}`));
  return saveDoc.exists();
}

// ========== COMMENTS ==========

export async function addComment(postId, text) {
  if (!db || !currentUser) throw new Error('Not authenticated');
  
  const commentRef = doc(collection(db, COMMENTS_COLLECTION));
  const comment = {
    id: commentRef.id,
    postId,
    handle: currentUser.uid,
    author: currentUser.displayName || currentUser.uid,
    text,
    createdAt: serverTimestamp()
  };
  
  const postRef = doc(db, POSTS_COLLECTION, postId);
  
  await runTransaction(db, async (transaction) => {
    const postDoc = await transaction.get(postRef);
    if (!postDoc.exists()) throw new Error('Post not found');
    
    const currentComments = postDoc.data().commentsCount || 0;
    transaction.set(commentRef, comment);
    transaction.update(postRef, { commentsCount: currentComments + 1 });
  });
  
  return commentRef.id;
}

export async function deleteComment(commentId) {
  if (!db || !currentUser) throw new Error('Not authenticated');
  
  const commentRef = doc(db, COMMENTS_COLLECTION, commentId);
  const commentDoc = await getDoc(commentRef);
  if (!commentDoc.exists()) throw new Error('Comment not found');
  if (commentDoc.data().handle !== currentUser.uid) throw new Error('Not authorized');
  
  const postRef = doc(db, POSTS_COLLECTION, commentDoc.data().postId);
  
  await runTransaction(db, async (transaction) => {
    const postDoc = await transaction.get(postRef);
    if (postDoc.exists()) {
      const currentComments = postDoc.data().commentsCount || 0;
      transaction.update(postRef, { commentsCount: Math.max(0, currentComments - 1) });
    }
    transaction.delete(commentRef);
  });
}

export function subscribeToComments(postId, callback) {
  if (!db) {
    callback([]);
    return () => {};
  }
  
  const q = query(
    collection(db, COMMENTS_COLLECTION),
    where('postId', '==', postId),
    orderBy('createdAt', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(comments);
  });
}

// ========== STORAGE ==========

export async function uploadAttachment(postId, file) {
  if (!storage || !currentUser) throw new Error('Not authenticated');
  
  const ext = file.name.split('.').pop();
  const filename = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const storageRef = ref(storage, `posts/${postId}/${filename}`);
  
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    url: downloadURL,
    path: snapshot.ref.fullPath
  };
}

export async function deleteAttachment(path) {
  if (!storage || !currentUser) throw new Error('Not authenticated');
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

// ========== USERS ==========

export async function createUserProfile(profileData) {
  if (!db || !currentUser) throw new Error('Not authenticated');
  
  const userRef = doc(db, USERS_COLLECTION, currentUser.uid);
  const user = {
    handle: profileData.handle || currentUser.displayName || currentUser.uid,
    bio: profileData.bio || '',
    avatarUrl: profileData.avatarUrl || '',
    links: profileData.links || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  await setDoc(userRef, user);
  return user;
}

export async function getUserProfile(userId) {
  if (!db) throw new Error('Firestore not initialized');
  const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
  return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;
}

export async function updateUserProfile(updates) {
  if (!db || !currentUser) throw new Error('Not authenticated');
  const userRef = doc(db, USERS_COLLECTION, currentUser.uid);
  await updateDoc(userRef, { ...updates, updatedAt: serverTimestamp() });
}

export async function uploadAvatar(file) {
  if (!storage || !currentUser) throw new Error('Not authenticated');
  
  const ext = file.name.split('.').pop();
  const filename = `avatar_${Date.now()}.${ext}`;
  const storageRef = ref(storage, `avatars/${currentUser.uid}/${filename}`);
  
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
}