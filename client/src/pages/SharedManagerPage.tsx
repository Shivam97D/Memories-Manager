import { useParams, useSearchParams } from 'react-router-dom';
import { StorageManagerPage } from './StorageManagerPage';
import { Permission } from '@/types';

export function SharedManagerPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [searchParams] = useSearchParams();
  const permissions = (searchParams.get('permissions') || 'VIEW').split(',') as Permission[];
  const sharedRootPath = searchParams.get('path') || '';

  return (
    <StorageManagerPage
      shareId={shareId}
      permissions={permissions}
      sharedRootPath={sharedRootPath}
    />
  );
}
