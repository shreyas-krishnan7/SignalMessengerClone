"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { uploadFile } from "@/lib/api";
import { Avatar } from "./Avatar";

// Bada avatar + camera button: click karke photo upload karo
export function AvatarPicker({
  name,
  color,
  url,
  onChange,
  isGroup = false,
}: {
  name: string;
  color: string;
  url: string | null;
  onChange: (url: string) => void;
  isGroup?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // same file dobara choose ho sake
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadFile(file);
      onChange(uploaded.url);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative mx-auto w-fit">
      <div className={uploading ? "opacity-50" : ""}>
        <Avatar name={name} color={color} url={url} size={88} isGroup={isGroup} />
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="absolute right-0 bottom-0 flex h-8 w-8 items-center justify-center rounded-full bg-input text-primary shadow ring-2 ring-panel hover:bg-selected"
        aria-label="Change photo"
      >
        <Camera size={16} />
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
    </div>
  );
}
