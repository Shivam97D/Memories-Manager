import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
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

export function UploadZone({ accountId, accountType, currentPath, shareId, onUploadComplete }: Props) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...accepted.map((file) => ({ file, progress: 0, status: 'pending' as const })),
    ]);
    setIsOpen(true);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [], 'application/pdf': [] },
    maxSize: 100 * 1024 * 1024,
  });

  const uploadFile = async (index: number) => {
    const entry = files[index];
    setFiles((prev) => prev.map((f, i) => i === index ? { ...f, status: 'uploading' } : f));

    try {
      // Get signed params from our server
      const paramsUrl = shareId
        ? `/proxy/${shareId}/upload-params?folder=${encodeURIComponent(currentPath)}&fileName=${encodeURIComponent(entry.file.name)}`
        : `/storage/${accountId}/upload-params?folder=${encodeURIComponent(currentPath)}&fileName=${encodeURIComponent(entry.file.name)}`;

      const { data: params } = await api.get(paramsUrl);

      if (accountType === 'CLOUDINARY') {
        const formData = new FormData();
        formData.append('file', entry.file);
        Object.entries(params).forEach(([k, v]) => formData.append(k, v as string));

        await axios.post(
          `https://api.cloudinary.com/v1_1/${params.cloud_name}/auto/upload`,
          formData,
          { onUploadProgress: (e) => {
            const pct = Math.round((e.loaded / (e.total || 1)) * 100);
            setFiles((prev) => prev.map((f, i) => i === index ? { ...f, progress: pct } : f));
          }}
        );
      } else if (accountType === 'IMAGEKIT') {
        const formData = new FormData();
        formData.append('file', entry.file);
        formData.append('fileName', entry.file.name);
        formData.append('folder', params.folder);
        formData.append('token', params.token);
        formData.append('expire', params.expire);
        formData.append('signature', params.signature);

        await axios.post('https://upload.imagekit.io/api/v1/files/upload', formData, {
          headers: { Authorization: `Basic ${btoa(params.publicKey + ':')}` },
          onUploadProgress: (e) => {
            const pct = Math.round((e.loaded / (e.total || 1)) * 100);
            setFiles((prev) => prev.map((f, i) => i === index ? { ...f, progress: pct } : f));
          },
        });
      }

      setFiles((prev) => prev.map((f, i) => i === index ? { ...f, status: 'done', progress: 100 } : f));
    } catch (err) {
      setFiles((prev) => prev.map((f, i) => i === index ? { ...f, status: 'error', error: 'Upload failed' } : f));
    }
  };

  const handleUploadAll = async () => {
    const pending = files.map((f, i) => ({ ...f, index: i })).filter((f) => f.status === 'pending');
    await Promise.all(pending.map((f) => uploadFile(f.index)));
    const allDone = files.every((f) => f.status === 'done' || f.status === 'error');
    if (allDone) {
      const successes = files.filter((f) => f.status === 'done').length;
      toast.success(`${successes} file(s) uploaded`);
      onUploadComplete?.();
      setTimeout(() => { setFiles([]); setIsOpen(false); }, 1500);
    }
  };

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-accent' : 'border-border hover:border-primary/50 hover:bg-secondary/50'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">Drop files here or click to upload</p>
        <p className="text-xs text-muted-foreground mt-1">Images, videos, PDFs up to 100 MB</p>
      </div>

      {isOpen && files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              {f.status === 'done' && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
              {f.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
              {(f.status === 'pending' || f.status === 'uploading') && (
                <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{f.file.name}</p>
                {f.status === 'uploading' && <Progress value={f.progress} className="mt-1" />}
                {f.status === 'error' && <p className="text-xs text-red-500">{f.error}</p>}
              </div>
              {f.status === 'pending' && (
                <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          ))}
          {files.some((f) => f.status === 'pending') && (
            <Button size="sm" onClick={handleUploadAll} className="w-full">
              Upload {files.filter((f) => f.status === 'pending').length} file(s)
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
