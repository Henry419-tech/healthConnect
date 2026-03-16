import { Suspense } from 'react';
import ProfileContent from './ProfileContent';

export default function ProfilePage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>Loading…</div>}>
      <ProfileContent />
    </Suspense>
  );
}