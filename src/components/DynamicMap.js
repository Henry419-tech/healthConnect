// components/DynamicMap.js
import dynamic from 'next/dynamic';

const DynamicMap = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => (
    <div style={{ 
      width: '100%', 
      height: '400px', 
      background: '#f0f0f0', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      borderRadius: '8px'
    }}>
      Loading map...
    </div>
  )
});

export default DynamicMap;