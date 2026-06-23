import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function formatMB(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const intervals = [
    { label: 'year', secs: 31536000 },
    { label: 'month', secs: 2592000 },
    { label: 'day', secs: 86400 },
    { label: 'hour', secs: 3600 },
    { label: 'minute', secs: 60 },
  ];
  for (const { label, secs } of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

export function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function getAccountTypeColor(type: string): string {
  const map: Record<string, string> = {
    CLOUDINARY: 'bg-blue-500',
    IMAGEKIT: 'bg-purple-500',
    GOOGLE_PHOTOS: 'bg-red-500',
    BACKBLAZE: 'bg-orange-500',
    OTHER: 'bg-gray-500',
  };
  return map[type] || 'bg-gray-500';
}

export function getAccountTypeLabel(type: string): string {
  const map: Record<string, string> = {
    CLOUDINARY: 'Cloudinary',
    IMAGEKIT: 'ImageKit',
    GOOGLE_PHOTOS: 'Google Photos',
    BACKBLAZE: 'Backblaze B2',
    OTHER: 'Other',
  };
  return map[type] || type;
}
