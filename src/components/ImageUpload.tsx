'use client'

import { useState, useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'

type UploadedImage = {
  file: File
  preview: string
  caption: string
}

export default function ImageUpload({
  images,
  onChange,
  label,
}: {
  images: UploadedImage[]
  onChange: (images: UploadedImage[]) => void
  label?: string
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return

    const newImages: UploadedImage[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      newImages.push({
        file,
        preview: URL.createObjectURL(file),
        caption: '',
      })
    }
    onChange([...images, ...newImages])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(images[index].preview)
    onChange(images.filter((_, i) => i !== index))
  }

  function updateCaption(index: number, caption: string) {
    const updated = [...images]
    updated[index] = { ...updated[index], caption }
    onChange(updated)
  }

  return (
    <div>
      {label && (
        <label className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2 block">
          {label} <span className="text-surface-400 font-normal normal-case">(optional)</span>
        </label>
      )}

      {/* Image previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {images.map((img, idx) => (
            <div key={idx} className="relative group overflow-hidden border border-surface-200">
              <img
                src={img.preview}
                alt={img.caption || `Upload ${idx + 1}`}
                className="w-full h-32 object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-2 right-2 w-7 h-7 bg-surface-900/60 hover:bg-surface-900/80 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
              <input
                type="text"
                placeholder="Add a caption..."
                value={img.caption}
                onChange={(e) => updateCaption(idx, e.target.value)}
                className="w-full px-2 py-1.5 text-xs border-t border-surface-200 focus:outline-none focus:bg-surface-50 transition-colors duration-150"
              />
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 text-sm text-surface-500 hover:text-brand-orange bg-surface-50 hover:bg-primary-50 px-3 py-2.5 border border-dashed border-surface-300 hover:border-brand-orange/40 transition-colors duration-150 w-full justify-center cursor-pointer"
      >
        <ImagePlus className="w-4 h-4" />
        Add Screenshot
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
