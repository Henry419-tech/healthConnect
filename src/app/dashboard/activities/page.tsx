'use client'

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useDarkMode } from '@/contexts/DarkModeContext';
import DashboardHeader from '@/components/DashboardHeader';
import { getRelativeTime } from '@/lib/activityTracker';
import {
  ArrowLeft,
  Activity,
  Hospital,
  Bot,
  Phone,
  Heart,
  Filter,
  Search,
  Calendar,
  Loader2,
  RefreshCw,
  AlertCircle,
  MapPin,
  Stethoscope,
  Pill,
  ChevronRight
} from 'lucide-react';

interface ActivityItem {
  id: string;
  activityType: string;
  title: string;
  description: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export default function ActivitiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isDarkMode } = useDarkMode();
  
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Fetch activities
  const fetchActivities = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = filterType === 'all' 
        ? '/api/activities?limit=100'
        : `/api/activities?limit=100&type=${filterType}`;
        
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      
      const data = await response.json();
      setActivities(data.activities);
      setFilteredActivities(data.activities);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load activities. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on mount and when filter changes
  useEffect(() => {
    if (status === 'authenticated') {
      fetchActivities();
    }
  }, [status, filterType]);

  // Apply search filter
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredActivities(activities);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = activities.filter(activity => 
        activity.title.toLowerCase().includes(query) ||
        (activity.description && activity.description.toLowerCase().includes(query))
      );
      setFilteredActivities(filtered);
    }
  }, [searchQuery, activities]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'facility_found': return Hospital;
      case 'symptom_checked': return Bot;
      case 'emergency_accessed': return Phone;
      case 'first_aid_viewed': return Heart;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'facility_found': return '#3b82f6';
      case 'symptom_checked': return '#8b5cf6';
      case 'emergency_accessed': return '#ef4444';
      case 'first_aid_viewed': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'facility_found': return 'Facility';
      case 'symptom_checked': return 'Symptom Check';
      case 'emergency_accessed': return 'Emergency';
      case 'first_aid_viewed': return 'First Aid';
      default: return 'Activity';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (status === 'loading') {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <Activity size={48} className="loading-icon" />
          <div className="loading-title">Loading Activities...</div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="activities-page">
      <DashboardHeader activeTab="/dashboard" />

      <div className="activities-content">
        {/* Header */}
        <div className="activities-header">
          <div className="header-top">
            <button 
              className="back-button"
              onClick={() => router.push('/dashboard')}
              type="button"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            
            <h1 className="activities-title">
              <Activity size={28} />
              Activity History
            </h1>
          </div>
          
          <p className="activities-subtitle">
            View all your healthcare interactions and activities
          </p>
        </div>

        {/* Filters and Search */}
        <div className="activities-controls">
          <div className="search-bar">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-buttons">
            <button
              className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
              type="button"
            >
              <Activity size={18} />
              All
            </button>
            <button
              className={`filter-btn ${filterType === 'facility_found' ? 'active' : ''}`}
              onClick={() => setFilterType('facility_found')}
              type="button"
            >
              <Hospital size={18} />
              Facilities
            </button>
            <button
              className={`filter-btn ${filterType === 'symptom_checked' ? 'active' : ''}`}
              onClick={() => setFilterType('symptom_checked')}
              type="button"
            >
              <Bot size={18} />
              Symptoms
            </button>
            <button
              className={`filter-btn ${filterType === 'emergency_accessed' ? 'active' : ''}`}
              onClick={() => setFilterType('emergency_accessed')}
              type="button"
            >
              <Phone size={18} />
              Emergency
            </button>
            <button
              className={`filter-btn ${filterType === 'first_aid_viewed' ? 'active' : ''}`}
              onClick={() => setFilterType('first_aid_viewed')}
              type="button"
            >
              <Heart size={18} />
              First Aid
            </button>
          </div>

          <button 
            className="refresh-btn"
            onClick={fetchActivities}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? <Loader2 size={18} className="spin" /> : <RefreshCw size={18} />}
            Refresh
          </button>
        </div>

        {/* Results Count */}
        <div className="results-info">
          <span className="results-count">
            {filteredActivities.length} {filteredActivities.length === 1 ? 'activity' : 'activities'}
          </span>
          {searchQuery && (
            <span className="search-info">
              matching "{searchQuery}"
            </span>
          )}
        </div>

        {/* Activities List */}
        <div className="activities-list">
          {isLoading ? (
            <div className="loading-state">
              <Loader2 size={32} className="spin" />
              <p>Loading activities...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <AlertCircle size={48} />
              <h3>Failed to Load Activities</h3>
              <p>{error}</p>
              <button onClick={fetchActivities} type="button">
                <RefreshCw size={18} />
                Try Again
              </button>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="empty-state">
              <Activity size={64} />
              <h3>No Activities Found</h3>
              <p>
                {searchQuery 
                  ? `No activities match "${searchQuery}"`
                  : filterType !== 'all'
                  ? `No ${getActivityLabel(filterType).toLowerCase()} activities yet`
                  : 'Start using features to see your activity history'
                }
              </p>
              {(searchQuery || filterType !== 'all') && (
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('all');
                  }}
                  type="button"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            filteredActivities.map((activity) => {
              const Icon = getActivityIcon(activity.activityType);
              const color = getActivityColor(activity.activityType);
              
              return (
                <div key={activity.id} className="activity-card">
                  <div 
                    className="activity-icon"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    <Icon size={24} />
                  </div>
                  
                  <div className="activity-details">
                    <div className="activity-header">
                      <h3 className="activity-title">{activity.title}</h3>
                      <span 
                        className="activity-badge"
                        style={{ backgroundColor: `${color}20`, color }}
                      >
                        {getActivityLabel(activity.activityType)}
                      </span>
                    </div>
                    
                    {activity.description && (
                      <p className="activity-description">{activity.description}</p>
                    )}
                    
                    <div className="activity-meta">
                      <span className="activity-time">
                        <Calendar size={14} />
                        {formatDate(activity.createdAt)}
                      </span>
                      <span className="activity-relative">
                        {getRelativeTime(new Date(activity.createdAt))}
                      </span>
                    </div>

                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="activity-metadata">
                        {activity.metadata.facilityName && (
                          <span className="metadata-item">
                            <MapPin size={14} />
                            {activity.metadata.facilityName}
                          </span>
                        )}
                        {activity.metadata.distance && (
                          <span className="metadata-item">
                            {activity.metadata.distance.toFixed(1)} km away
                          </span>
                        )}
                        {activity.metadata.urgencyLevel && (
                          <span className="metadata-item">
                            Urgency: {activity.metadata.urgencyLevel}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style jsx>{`
        .activities-page {
          min-height: 100vh;
          background: ${isDarkMode ? '#0f172a' : '#f8fafc'};
        }

        .activities-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          padding-top: 6rem;
        }

        .activities-header {
          margin-bottom: 2rem;
        }

        .header-top {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: ${isDarkMode ? '#1e293b' : 'white'};
          color: ${isDarkMode ? '#e2e8f0' : '#334155'};
          border: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'};
          border-radius: 0.5rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .back-button:hover {
          background: ${isDarkMode ? '#334155' : '#f1f5f9'};
        }

        .activities-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.75rem;
          font-weight: 700;
          color: ${isDarkMode ? '#f1f5f9' : '#1e293b'};
        }

        .activities-subtitle {
          color: ${isDarkMode ? '#94a3b8' : '#64748b'};
          font-size: 1rem;
        }

        .activities-controls {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .search-bar {
          flex: 1;
          min-width: 250px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: ${isDarkMode ? '#1e293b' : 'white'};
          border: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'};
          border-radius: 0.5rem;
        }

        .search-bar input {
          flex: 1;
          border: none;
          background: transparent;
          color: ${isDarkMode ? '#e2e8f0' : '#1e293b'};
          font-size: 0.875rem;
          outline: none;
        }

        .filter-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .filter-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: ${isDarkMode ? '#1e293b' : 'white'};
          color: ${isDarkMode ? '#94a3b8' : '#64748b'};
          border: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'};
          border-radius: 0.5rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          background: ${isDarkMode ? '#334155' : '#f1f5f9'};
        }

        .filter-btn.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: ${isDarkMode ? '#1e293b' : 'white'};
          color: ${isDarkMode ? '#e2e8f0' : '#334155'};
          border: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'};
          border-radius: 0.5rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-btn:hover:not(:disabled) {
          background: ${isDarkMode ? '#334155' : '#f1f5f9'};
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .results-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          color: ${isDarkMode ? '#94a3b8' : '#64748b'};
          font-size: 0.875rem;
        }

        .results-count {
          font-weight: 600;
        }

        .activities-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .activity-card {
          display: flex;
          gap: 1rem;
          padding: 1.5rem;
          background: ${isDarkMode ? '#1e293b' : 'white'};
          border: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'};
          border-radius: 0.75rem;
          transition: all 0.2s;
        }

        .activity-card:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .activity-icon {
          width: 48px;
          height: 48px;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .activity-details {
          flex: 1;
        }

        .activity-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .activity-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: ${isDarkMode ? '#f1f5f9' : '#1e293b'};
        }

        .activity-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .activity-description {
          color: ${isDarkMode ? '#94a3b8' : '#64748b'};
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
          line-height: 1.5;
        }

        .activity-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.75rem;
          color: ${isDarkMode ? '#64748b' : '#94a3b8'};
        }

        .activity-time,
        .activity-relative {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .activity-metadata {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'};
        }

        .metadata-item {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.75rem;
          color: ${isDarkMode ? '#94a3b8' : '#64748b'};
        }

        .loading-state,
        .error-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
          color: ${isDarkMode ? '#94a3b8' : '#64748b'};
        }

        .loading-state svg,
        .error-state svg,
        .empty-state svg {
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .error-state h3,
        .empty-state h3 {
          color: ${isDarkMode ? '#f1f5f9' : '#1e293b'};
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .error-state button,
        .empty-state button {
          margin-top: 1rem;
          padding: 0.75rem 1.5rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .activities-content {
            padding: 1rem;
          }

          .header-top {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .back-button {
            align-self: flex-start;
          }

          .activities-title {
            font-size: 1.5rem;
          }

          .activities-controls {
            flex-direction: column;
          }

          .search-bar {
            width: 100%;
          }

          .filter-buttons {
            width: 100%;
            justify-content: flex-start;
          }

          .activity-card {
            flex-direction: column;
          }

          .activity-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}