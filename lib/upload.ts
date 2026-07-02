import { readAsStringAsync } from 'expo-file-system/legacy';

import { supabase } from './supabase';

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function randomSuffix(): string {
  return `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/**
 * Uploads a local image to Supabase Storage. Only this module should call storage APIs;
 * swap internals when moving to Oracle Cloud — keep this signature.
 */
export async function uploadPhoto(
  localUri: string,
  folder: 'profile-photos' | 'chat-media'
): Promise<string> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message || 'Could not verify your account. Please sign in again.');
  }
  if (!user) {
    throw new Error('You must be signed in to upload photos.');
  }

  let base64: string;
  try {
    base64 = await readAsStringAsync(localUri, {
      encoding: 'base64',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not read the image file.';
    throw new Error(`Failed to read image: ${message}`);
  }

  const filename = `${user.id}/${Date.now()}-${randomSuffix()}.jpg`;
  const bytes = base64ToUint8Array(base64);

  const { error: uploadError } = await supabase.storage.from(folder).upload(filename, bytes, {
    contentType: 'image/jpeg',
    upsert: false,
  });

  if (uploadError) {
    throw new Error(
      uploadError.message || 'Upload failed. Check your connection and try again.'
    );
  }

  const { data: urlData } = supabase.storage.from(folder).getPublicUrl(filename);
  const publicUrl = urlData.publicUrl;
  if (!publicUrl) {
    throw new Error('Upload succeeded but public URL was not available.');
  }

  return publicUrl;
}
