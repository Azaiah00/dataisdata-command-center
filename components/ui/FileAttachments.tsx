"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Loader2 } from "lucide-react";
import { uploadAttachment } from "@/lib/storage";
import { toast } from "sonner";

interface FileAttachmentsProps {
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
  label?: string;
}

export function FileAttachments({ value, onChange, disabled, label = "Attachments" }: FileAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const url = await uploadAttachment(files[i]);
        onChange([...value, url]);
      }
      toast.success("File(s) added");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.csv"
          onChange={handleFileSelect}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4 mr-1.5" />}
          {uploading ? "Uploading..." : "Add file(s)"}
        </Button>
      </div>
      {value.length > 0 && (
        <ul className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/50 p-2">
          {value.map((url) => (
            <li key={url} className="flex items-center justify-between gap-2 text-sm">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-blue-600 hover:underline flex-1 min-w-0"
              >
                {decodeURIComponent(url.split("/").pop() || "file")}
              </a>
              {!disabled && (
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => remove(url)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
