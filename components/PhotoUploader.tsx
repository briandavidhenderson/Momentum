"use client"

import React, { useState, useRef } from "react"
import { Camera, Upload, X, FileImage } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface PhotoUploaderProps {
  onPhotoSelected: (imageFile: File) => void
  onCancel?: () => void
  acceptedFormats?: string // e.g., "image/jpeg,image/png"
  maxSizeMB?: number
}

/**
 * Photo Uploader Component
 * Handles image upload via file picker or camera
 * Shows preview with metadata
 */
export function PhotoUploader({
  onPhotoSelected,
  onCancel,
  acceptedFormats = "image/jpeg,image/png,image/jpg",
  maxSizeMB = 10,
}: PhotoUploaderProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewURL, setPreviewURL] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isHandwritten, setIsHandwritten] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!acceptedFormats.split(",").some((format) => file.type.includes(format.trim()))) {
      setError(`Invalid file type. Please upload ${acceptedFormats}`)
      return
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > maxSizeMB) {
      setError(`File too large. Maximum size is ${maxSizeMB}MB`)
      return
    }

    setError(null)
    setSelectedImage(file)

    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewURL(url)
  }

  // Open file picker
  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  // Open camera
  const openCamera = () => {
    cameraInputRef.current?.click()
  }

  // Clear selection
  const clearSelection = () => {
    if (previewURL) {
      URL.revokeObjectURL(previewURL)
    }
    setSelectedImage(null)
    setPreviewURL(null)
    setError(null)
    setIsHandwritten(false)

    // Reset file inputs
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }

  // Submit photo
  const submitPhoto = () => {
    if (selectedImage) {
      onPhotoSelected(selectedImage)
    }
  }

  // Calculate estimated cost
  const estimatedCost = isHandwritten ? "$0.03" : "$0.01"

  // Format file size
  const formatSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024)
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
    return `${mb.toFixed(2)} MB`
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4 max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Upload Photo</h3>
        {selectedImage && (
          <button
            onClick={clearSelection}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear selection"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Upload Area */}
      {!selectedImage ? (
        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-brand-500 transition-colors cursor-pointer"
            onClick={openFilePicker}
          >
            <FileImage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-700 font-medium mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-sm text-gray-500">
              JPEG, PNG up to {maxSizeMB}MB
            </p>
          </div>

          {/* Button Options */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={openFilePicker}
              variant="outline"
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose File
            </Button>
            <Button
              onClick={openCamera}
              variant="outline"
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats}
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
            {previewURL && (
              <Image
                src={previewURL}
                alt="Preview"
                fill
                className="object-contain"
              />
            )}
          </div>

          {/* Image Metadata */}
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>File Name:</span>
              <span className="font-medium text-gray-900 truncate max-w-[200px]">
                {selectedImage.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span>File Size:</span>
              <span className="font-medium text-gray-900">
                {formatSize(selectedImage.size)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Type:</span>
              <span className="font-medium text-gray-900">
                {selectedImage.type.split("/")[1].toUpperCase()}
              </span>
            </div>
          </div>

          {/* Handwritten Toggle */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
            <input
              type="checkbox"
              id="handwritten"
              checked={isHandwritten}
              onChange={(e) => setIsHandwritten(e.target.checked)}
              className="w-4 h-4 text-brand-500 rounded"
            />
            <label htmlFor="handwritten" className="text-sm text-gray-700 cursor-pointer">
              This is handwritten text (uses high-detail OCR)
            </label>
          </div>

          {/* Cost Estimate */}
          <div className="flex justify-between text-sm text-gray-600 px-1">
            <span>Estimated Cost:</span>
            <span className="font-medium text-gray-900">{estimatedCost}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {onCancel && (
              <Button onClick={onCancel} variant="outline" className="flex-1">
                Cancel
              </Button>
            )}
            <Button
              onClick={submitPhoto}
              className="flex-1 bg-brand-500 hover:bg-brand-600 text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Extract & Structure
            </Button>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!selectedImage && (
        <div className="text-sm text-gray-500 text-center space-y-1 pt-2">
          <p>Upload photos of lab notes, protocols, or equipment displays</p>
          <p className="text-xs">
            Works with typed text, handwriting, and equipment screens
          </p>
        </div>
      )}
    </div>
  )
}
