/**
 * Firebase Storage Helper Functions
 * Handles file uploads to Firebase Storage
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from './firebase'
import { logger } from './logger'

/**
 * Upload a file to Firebase Storage
 * Returns the download URL
 */
export async function uploadFile(
  file: File,
  path: string
): Promise<{
  url: string
  path: string
  size: number
  type: string
}> {
  const storageRef = ref(storage, path)

  try {
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file)

    // Get the download URL
    const url = await getDownloadURL(snapshot.ref)

    return {
      url,
      path: snapshot.ref.fullPath,
      size: file.size,
      type: file.type
    }
  } catch (error) {
    logger.error('Failed to upload file', error)
    throw new Error(`Failed to upload file: ${error}`)
  }
}

/**
 * Delete a file from Firebase Storage
 */
export async function deleteFile(path: string): Promise<void> {
  try {
    const storageRef = ref(storage, path)
    await deleteObject(storageRef)
  } catch (error) {
    logger.error('Failed to delete file', error)
    // Don't throw - file might not exist
  }
}

/**
 * Upload ELN item file to storage
 * Path format: eln/{labId}/{experimentId}/{itemId}/{filename}
 */
export async function uploadELNFile(
  file: File,
  labId: string,
  experimentId: string,
  itemId: string
): Promise<{
  url: string
  storagePath: string
  size: number
  type: string
}> {
  // Sanitize filename
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const timestamp = Date.now()
  const path = `eln/${labId}/${experimentId}/${itemId}/${timestamp}_${sanitizedFilename}`

  const result = await uploadFile(file, path)

  return {
    url: result.url,
    storagePath: result.path,
    size: result.size,
    type: result.type
  }
}

/**
 * Delete ELN item file from storage
 */
export async function deleteELNFile(storagePath: string): Promise<void> {
  return deleteFile(storagePath)
}
