import { useState, useCallback, useRef } from 'react';
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

const ACCEPT_TYPES = 'image/*,video/*,application/pdf';

export function UploadZone({ accountId, accountType, currentPath, shareId, onUploadComplete }: Props) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Direct refs — most reliable way to open file picker on mobile
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: File[]) => {
    if (!incoming.length) return;
    setFiles((prev) => [
      ...prev,
      ...incoming.map((file) => ({ file, progress: 0, status: 'pending' as const })),
    ]);
  }, []);

  // react-dropzone — disabled on touch devices, drag-and-drop only on desktop
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: addFiles,
    accept: { 'image/*': [], 'video/*': [], 'application/pdf': [] },
    maxSize: 100 * 1024 * 1024,
    noClick: true,          // we handle click ourselves via refs
    noKeyboard: true,
    useFsAccessApi: false,  // File System Access API breaks on iOS Safari
  });

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    addFiles(picked);
    // Reset input so same file can be re-selected after an error
    e.target.value = '';
  };

  const uploadOne = async (index: number, entry: UploadFile): Promise<boolean> => {
    setFiles((prev) => prev.map((f, i) => i === index ? { ...f, status: 'uploading', progress: 0 } : f));

    try {
      const paramsUrl = shareId
        ? `/proxy/${shareId}/upload-params?folder=${encodeURIComponent(currentPath)}&fileName=${encodeURIComponent(entry.file.name)}`
        : `/storage/${accountId}/upload-params?folder=${encodeURIComponent(currentPath)}&fileName=${encodeURIComponent(entry.file.name)}`;

      const { data: params } = await api.get(paramsUrl);

      const onProgress = (e: { loaded: number; total?: number }) => {
        const pct = Math.round((e.loaded / (e.total || e.loaded || 1)) * 100);
        setFiles((prev) => prev.map((f, i) => i === index ? { ...f, progress: pct } : f));
      };

      if (accountType === 'CLOUDINARY') {
        const form = new FormData();
        form.append('file', entry.file);
        form.append('signature', params.signature);
        form.append('timestamp', params.timestamp);
        form.append('folder', params.folder);
        form.append('api_key', params.api_key);

        await axios.post(
          `https://api.cloudinary.com/v1_1/${params.cloud_name}/auto/upload`,
          form,
          { onUploadProgress: onProgress, timeout: 0 }  // no timeout for large files on slow mobile
        );
      } else if (accountType === 'IMAGEKIT') {
        const form = new FormData();
        form.append('file', entry.file);
        form.append('fileName', entry.file.name);
        form.append('folder', params.folder);
        form.append('token', params.token);
        form.append('expire', String(params.expire));
        form.append('signature', params.signature);

        // btoa can fail on special chars — use a safe version
        const b64 = typeof btoa !== 'undefined'
          ? btoa(`${params.publicKey}:`)
          : Buffer.from(`${params.publicKey}:`).toString('base64');

        await axios.post('https://upload.imagekit.io/api/v1/files/upload', form, {
          headers: { Authorization: `Basic ${b64}` },
          onUploadProgress: onProgress,
          timeout: 0,
        });
      }

      setFiles((prev) => prev.map((f, i) => i === index ? { ...f, status: 'done', progress: 100 } : f));
      return true;
    } catch (err) {
      const apiMsg = (err as {
        response?: { data?: { error?: { message?: string } | string } };
        message?: string;
      })?.response?.data;

      const msg =
        typeof apiMsg === 'object' && apiMsg !== null && 'error' in apiMsg
          ? (typeof (apiMsg as { error: unknown }).error === 'string'
              ? (apiMsg as { error: string }).error
              : ((apiMsg as { error?: { message?: string } }).error?.message ?? 'Upload failed'))
          : 'Upload failed';

      setFiles((prev) => prev.map((f, i) => i === index ? { ...f, status: 'error', error: msg } : f));
      return false;
    }
  };

  const handleUploadAll = async () => {
    const pending = files.map((f, i) => ({ ...f, index: i })).filter((f) => f.status === 'pending');
    if (!pending.length) return;
    setUploading(true);
    try {
      // Upload one at a time on mobile to avoid memory pressure; fine on desktop too
      let ok = 0;
      for (const f of pending) {
        const success = await uploadOne(f.index, f);
        if (success) ok++;
      }
      if (ok === pending.length) {
        toast.success(`${ok} file${ok !== 1 ? 's' : ''} uploaded`);
        onUploadComplete?.();
        setTimeout(() => setFiles([]), 1500);
      } else if (ok > 0) {
        toast.success(`${ok} of ${pending.length} uploaded`);
        onUploadComplete?.();
      } else {
        toast.error('Upload failed — check the error details below');
      }
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (i: number) =>
    setFiles((prev) => prev.filter((_, j) => j !== i));

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const hasFiles = files.length > 0;

  return (
    <div className="space-y-3">
      {/* Hidden native inputs — most reliable on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPT_TYPES}
        className="sr-only"
        onChange={handleFileInput}
        aria-hidden
      />
      {/* Camera input — only shown on devices that support capture */}
      <input
        ref={cameraInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileInput}
        aria-hidden
      />

      {/* Drop zone — drag target on desktop, just visual on mobile */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl transition-colors',
          isDragActive ? 'border-primary bg-accent' : 'border-border',
        )}
      >
        {/* Hidden dropzone input (for drag-and-drop only) */}
        <input {...getInputProps()} />

        <div className="p-5 flex flex-col items-center gap-3">
          <Upload className={cn('h-8 w-8', isDragActive ? 'text-primary' : 'text-muted-foreground')} />

          {isDragActive ? (
            <p className="text-sm font-medium text-primary">Drop to add files</p>
          ) : (
            <>
              <p className="text-sm font-medium text-muted-foreground hidden sm:block">
                Drag files here, or choose below
              </p>
              <p className="text-sm font-medium text-muted-foreground sm:hidden">
                Tap to choose files from your device
              </p>

              {/* Prominent tap buttons — work reliably on mobile */}
              <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 flex-1 sm:flex-none min-w-[120px]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FolderOpen className="h-4 w-4" />
                  Choose files
                </Button>

                {/* Camera button — only useful on mobile, hidden on desktop */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 sm:hidden flex-1 min-w-[120px]"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                  Camera
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">Images, videos, PDFs · max 100 MB each</p>
            </>
          )}
        </div>
      </div>

      {/* File queue */}
      {hasFiles && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-secondary rounded-lg">
              {f.status === 'done' && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
              {f.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
              {f.status === 'uploading' && <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />}
              {f.status === 'pending' && <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />}

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{f.file.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {(f.file.size / (1024 * 1024)).toFixed(1)} MB
                </p>
                {f.status === 'uploading' && (
                  <Progress value={f.progress} className="mt-1.5 h-1" />
                )}
                {f.status === 'error' && (
                  <p className="text-xs text-red-500 mt-0.5">{f.error}</p>
                )}
              </div>

              {(f.status === 'pending' || f.status === 'error') && !uploading && (
                <button
                  type="button"
                  onClick={() => removeFile(i)}
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
              {uploading
                ? 'Uploading…'
                : `Upload ${pendingCount} file${pendingCount !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
