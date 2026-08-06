import { Suspense } from 'react';
import { Heart } from 'lucide-react';
import ProfileContent from './ProfileContent';
import '@/styles/dashboard-header.css';

function ProfileLoadingFallback() {
  return (
    <div className="hc-loading">
      <div className="hc-loading__mark"><Heart size={26} /></div>
      <div className="hc-loading__brand">
        <span className="hc-loading__name">HealthConnect</span>
        <span className="hc-loading__sub">Navigator</span>
      </div>
      <div className="hc-loading__dots"><span /><span /><span /></div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileLoadingFallback />}>
      <ProfileContent />
    </Suspense>
  );
}