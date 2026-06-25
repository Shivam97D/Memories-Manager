import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, CheckCircle, AlertCircle, Camera, FolderOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import axios from 'axios';

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

interface Props {
  accountId: string;
  accountType: string;
  currentPath: string;
  shareId?: string;
  onUploadComplete?: () => void;
}

// Label-button: renders as a styled button but activates a nested <input type="file">.
// This is the only 100%-reliable way to open the file picker on all mobile browsers
// (Android Chrome, Samsung Internet, WebView) without any JS .click() tricks.
function FileTrigger({
  multiple,
  capture,
  accept,
  onChange,
  children,
  className,
}: {
  multiple?: boolean;
  capture?: 'environment' | 'user';
  accept: string;
  onChange: (files: File[]) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('cursor-pointer', className)}>
      <input
        type="file"
        multiple={multiple}
        accept={accept}
        capture={capture}
        // Inline style: opacity:0 + absolute positioning keeps the input
        // participatory in layout without clipping, which sr-only's clip/overflow
        // can interfere with on some Android WebViews
        style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }}
        onChange={(e) => {
          const picked = Array.from(e.target.files || []);
          if (picked.length) onChange(picked);
          // Reset so the same file can be re-picked after an error
          e.target.value = '';
        }}
        aria-hidden
        tabIndex={-1}
      />
      {children}
    </label>
  );
}

export function UploadZone({ accountId, accountType, currentPath, shareId, onUploadComplete }: Props) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const addFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...incoming.map((f) => ({ file: f, progress: 0, status: 'pending' as const })),
    ]);
  }, []);

  // Dropzone for desktop drag-and-drop; noClick because labels handle picking
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: addFiles,
    accept: { 'image/*': [], 'video/*': [], 'application/pdf': [] },
    maxSize: 100 * 1024 * 1024,
    noClick: true,
    noKeyboard: true,
    useFsAccessApi: false,
  });

  const uploadOne = async (index: number, entry: UploadFile): Promise<boolean> => {
    setFiles((prev) => prev.map((f, i) => i === index ? { ...f, status: 'uploading', progress: 0 } : f));

    try {
      const paramsUrl = shareId
        ? `/proxy/${shareId}/upload-params?folder=${encodeURIComponent(currentPath)}&fileName=${encodeURIComponent(entry.file.name)}`
        : `/storage/${accountId}/upload-params?folder=${encodeURIComponent(currentPath)}&fileName=${encodeURIComponent(entry.file.name)}`;

      const { data: params } = await api.get(paramsUrl);

      const onProgress = (e: { loaded: number; total?: number }) => {
        const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
        setFiles((prev) => prev.map((f, i) => i === index ? { ...f, progress: pct } : f));
      };

      if (accountType === 'CLOUDINARY') {
        const form = new FormData();
        form.append('file', entry.file);
        form.append('signature', params.signature as string);
        form.append('timestamp', String(params.timestamp));
        form.append('folder', params.folder as string);
        form.append('api_key', params.api_key as string);

        await axios.post(
          `https://api.cloudinary.com/v1_1/${params.cloud_name as string}/auto/upload`,
          form,
          { onUploadProgress: onProgress, timeout: 0 }
        );
      } else if (accountType === 'IMAGEKIT') {
        const form = new FormData();
        form.append('file', entry.file);
        form.append('fileName', entry.file.name);
        form.append('folder', params.folder as string);
        form.append('token', params.token as string);
        form.append('expire', String(params.expire));
        form.append('signature', params.signature as string);

        await axios.post('https://upload.imagekit.io/api/v1/files/upload', form, {
          headers: { Authorization: `Basic ${btoa(`${params.publicKey as string}:`)}` },
          onUploadProgress: onProgress,
          timeout: 0,
        });
      }

      setFiles((prev) => prev.map((f, i) => i === index ? { ...f, status: 'done', progress: 100 } : f));
      return true;
    } catch (err) {
      const errData = (err as { response?: { data?: unknown } })?.response?.data;
      let msg = 'Upload failed';
      if (errData && typeof errData === 'object') {
        const d = errData as Record<string, unknown>;
        if (typeof d.error === 'string') msg = d.error;
        else if (d.error && typeof (d.error as Record<string, unknown>).message === 'string')
          msg = (d.error as Record<string, unknown>).message as string;
      }
      setFiles((prev) => prev.map((f, i) => i === index ? { ...f, status: 'error', error: msg } : f));
      return false;
    }
  };

  const handleUploadAll = async () => {
    const pending = files.map((f, i) => ({ ...f, index: i })).filter((f) => f.status === 'pending');
    if (!pending.length) return;
    setUploading(true);
    try {
      // Sequential — avoids memory pressure on mobile with multiple large files
      let ok = 0;
      for (const f of pending) {
        if (await uploadOne(f.index, f)) ok++;
      }

      if (ok === pending.length) {
        toast.success(`${ok} file${ok !== 1 ? 's' : ''} uploaded`);
        onUploadComplete?.();
        setTimeout(() => setFiles([]), 1500);
      } else if (ok > 0) {
        toast.success(`${ok} of ${pending.length} uploaded`);
        onUploadComplete?.();
      } else {
        toast.error('Upload failed — see errors below');
      }
    } finally {
      setUploading(false);
    }
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return (
    <div className="space-y-3">
      {/* Drop zone (drag target on desktop; just visual on mobile) */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl transition-colors',
          isDragActive ? 'border-primary bg-accent' : 'border-border bg-secondary/30',
        )}
      >
        <input {...getInputProps()} />

        <div className="p-5 flex flex-col items-center gap-4">
          <Upload className={cn('h-8 w-8', isDragActive ? 'text-primary' : 'text-muted-foreground')} />

          {isDragActive ? (
            <p className="text-sm font-medium text-primary">Drop to add files</p>
          ) : (
            <>
              <div className="text-center">
                <p className="text-sm font-medium hidden sm:block">Drag files here, or:</p>
                <p className="text-sm font-medium sm:hidden">Choose files from your device:</p>
                <p className="text-xs text-muted-foreground mt-0.5">Images · Videos · PDFs · max 100 MB</p>
              </div>

              {/* FileTrigger wraps a real <input> inside a <label> — the label click
                  directly activates the input with no JS .click() call needed.
                  This is the only approach that works reliably on all Android browsers. */}
              <div className="flex flex-wrap gap-2 justify-center w-full">
                <FileTrigger
                  multiple
                  accept="image/*,video/*,application/pdf"
                  onChange={addFiles}
                  className="flex-1 sm:flex-none"
                >
                  <span className={cn(
                    'inline-flex items-center justify-center gap-1.5 w-full',
                    'h-9 px-4 rounded-md border border-input bg-background text-sm font-medium',
                    'hover:bg-accent hover:text-accent-foreground transition-colors',
                    'min-w-[130px]',
                  )}>
                    <FolderOpen className="h-4 w-4" />
                    Choose files
                  </span>
                </FileTrigger>

                {/* Camera — Android/iOS only; hidden on desktop */}
                <FileTrigger
                  accept="image/*,video/*"
                  capture="environment"
                  onChange={addFiles}
                  className="flex-1 sm:hidden"
                >
                  <span className={cn(
                    'inline-flex items-center justify-center gap-1.5 w-full',
                    'h-9 px-4 rounded-md border border-input bg-background text-sm font-medium',
                    'hover:bg-accent hover:text-accent-foreground transition-colors',
                    'min-w-[130px]',
                  )}>
                    <Camera className="h-4 w-4" />
                    Camera
                  </span>
                </FileTrigger>
              </div>
            </>
          )}
        </div>
      </div>

      {/* File queue */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-secondary rounded-lg">
              {f.status === 'done'     && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
              {f.status === 'error'    && <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
              {f.status === 'uploading'&& <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />}
              {f.status === 'pending'  && <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />}

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{f.file.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {(f.file.size / (1024 * 1024)).toFixed(1)} MB
                </p>
                {f.status === 'uploading' && <Progress value={f.progress} className="mt-1.5 h-1" />}
                {f.status === 'error'     && <p className="text-xs text-red-500 mt-0.5">{f.error}</p>}
              </div>

              {(f.status === 'pending' || f.status === 'error') && !uploading && (
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  className="p-1 rounded hover:bg-border transition-colors flex-shrink-0"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          ))}

          {pendingCount > 0 && (
            <Button
              size="sm"
              className="w-full"
              onClick={handleUploadAll}
              loading={uploading}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : `Upload ${pendingCount} file${pendingCount !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
