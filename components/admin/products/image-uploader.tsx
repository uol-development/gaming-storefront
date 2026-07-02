"use client";

import { useId, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export interface ImageUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}

const BUCKET = "product-media";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function ImageUploader({ value, onChange, label = "Image" }: ImageUploaderProps) {
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File): Promise<void> {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image is too large (max 10 MB).");
      return;
    }

    setUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const path = `products/${crypto.randomUUID()}-${sanitizeName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });

      if (uploadError) {
        setError(uploadError.message || "Upload failed. Please try again.");
        return;
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const url = data.publicUrl;
      if (!url) {
        setError("Could not resolve the uploaded image URL.");
        return;
      }
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error during upload.");
    } finally {
      setUploading(false);
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file) void uploadFile(file);
    // Allow re-selecting the same file later.
    event.target.value = "";
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>): void {
    event.preventDefault();
    setDragOver(false);
    if (uploading) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  function handleRemove(): void {
    setError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
        {label}
      </label>

      {value ? (
        <div className="group relative overflow-hidden rounded-xl border border-border bg-card">
          <img
            src={value}
            alt="Selected product image preview"
            className="aspect-video w-full object-contain bg-secondary/40"
          />
          <div className="flex items-center justify-between gap-2 border-t border-border p-2">
            <span className="truncate text-xs text-muted-foreground" title={value}>
              {value}
            </span>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card px-4 py-8 text-center transition-colors",
            "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring",
            dragOver && "border-primary bg-primary/5",
            uploading && "pointer-events-none opacity-80",
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="size-7 animate-spin text-primary" aria-hidden="true" />
              <span className="text-sm font-medium text-foreground">Uploading…</span>
              <span className="text-xs text-muted-foreground">Please wait</span>
            </>
          ) : (
            <>
              <span className="grid size-11 place-items-center rounded-full bg-secondary text-muted-foreground">
                {dragOver ? (
                  <UploadCloud className="size-5" aria-hidden="true" />
                ) : (
                  <ImagePlus className="size-5" aria-hidden="true" />
                )}
              </span>
              <span className="text-sm font-medium text-foreground">Click or drop an image</span>
              <span className="text-xs text-muted-foreground">PNG, JPG, WEBP or GIF · up to 10 MB</span>
            </>
          )}
        </label>
      )}

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={uploading}
        onChange={handleInputChange}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
      />

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
