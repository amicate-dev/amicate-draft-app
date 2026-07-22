import { use } from "react";
import { supabase  } from "./supabase";

function randomSuffix(): string {
  return `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export async function uploadPhoto(
  localUri: string,
  folder: 'profile-photos' | 'chat-media'
): Promise<string> {
  const { data: {user}, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('You must be signed in to upload photos.');
  }

  // Use fetch arrayBuffer instead of Base64 to prevent high memory usage
  let buffer: ArrayBuffer;
  try {
    const response = await fetch(localUri);
    buffer = await response.arrayBuffer();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not read the image file.';
    throw new Error(`Failed to read image: ${message}`);
  }

  const filename = `${user.id}/${Date.now()}-${randomSuffix()}.jpg`;

  const { error: uploadError } = await supabase.storage.from(folder).upload(filename, buffer, {
    contentType: 'image/jpeg',
    upsert: false,
  });

  if (uploadError) {
    throw new Error(uploadError.message || 'Upload failed. Check your connection and try again.');
  }

  const { data: urlData } = supabase.storage.from(folder).getPublicUrl(filename);
  if (!urlData.publicUrl) {
    throw new Error('Upload succeeded but public URL was not available.');
  }

  return urlData.publicUrl;
}

/**
 * Parses a Supabase public URL and removes the file from the storage bucket.
 * Call this whenever a photo is replaced or deleted in the UI.
 */
export async function deletePhoto(publicUrl: string, folder: 'profile-photos' | 'chat-media'): Promise<void> {
  try {
    const urlParts = publicUrl.split(`${folder}/`);
    if (urlParts.length !== 2) return;
    
    const path = urlParts[1];
    await supabase.storage.from(folder).remove([path]);
  } catch (e) {
    console.warn('Failed to clean up old photo from storage:', e);
  }
}