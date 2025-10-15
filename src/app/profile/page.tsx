'use client'

import React, { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useDarkMode } from '@/contexts/DarkModeContext';
import DashboardHeader from '@/components/DashboardHeader';
import { 
  Heart, 
  ArrowLeft, 
  Camera,
  User,
  Mail,
  Moon,
  Sun,
  LogOut,
  Save,
  X,
  Check,
  AlertCircle,
  Edit,
  Home,
  MapPin,
  Bot,
  Phone
} from 'lucide-react';

const ProfilePage = () => {
  const { data: session, update, status } = useSession();
  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [activeBottomTab, setActiveBottomTab] = useState<string>('profile');
  
  const [formData, setFormData] = useState({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
  });
  
  const [imagePreview, setImagePreview] = useState(session?.user?.image || '');

  // Update form data when session changes
  useEffect(() => {
    if (session?.user) {
      setFormData({
        name: session.user.name || '',
        email: session.user.email || '',
      });
      setImagePreview(session.user.image || '');
    }
  }, [session]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  const handleBack = () => {
    router.back();
  };

  const handleImageClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setSaveSuccess(false);
    setError('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: session?.user?.name || '',
      email: session?.user?.email || '',
    });
    setImagePreview(session?.user?.image || '');
    setError('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      // Validate name
      if (!formData.name || formData.name.trim().length === 0) {
        setError('Name is required');
        setIsSaving(false);
        return;
      }

      // Call API to update profile
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          image: imagePreview,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      // Update the session
      await update();

      setSaveSuccess(true);
      setIsEditing(false);
      
      // Show success message for 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut({ 
        callbackUrl: '/',
        redirect: true 
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle bottom nav click
  const handleBottomNavClick = (path: string, tab: string) => {
    setActiveBottomTab(tab);
    router.push(path);
  };

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="dashboard-container">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh' 
        }}>
          <div className="auth-spinner"></div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="dashboard-container">
      {/* Floating Background Elements */}
      <div className="dashboard-bg-element dashboard-bg-element-1"></div>
      <div className="dashboard-bg-element dashboard-bg-element-2"></div>
      <div className="dashboard-bg-element dashboard-bg-element-3"></div>

      {/* Dashboard Header */}
      <DashboardHeader activeTab="/profile" />

      {/* Main Content */}
      <div className="dashboard-content" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
        {/* Back Button - Hidden on mobile via CSS */}
        <button
          onClick={handleBack}
          className="auth-back-button profile-back-btn"
          style={{ 
            position: 'relative', 
            marginBottom: '1.5rem'
          }}
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        {/* Profile Card */}
        <div className="dashboard-card" style={{ 
          padding: '1.5rem',
          marginBottom: '1rem'
        }}>
          {/* Success Message */}
          {saveSuccess && (
            <div className="success-message" style={{ marginBottom: '1rem' }}>
              <Check size={18} />
              <span style={{ fontSize: '0.875rem' }}>Profile updated successfully!</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="error-message" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={18} />
              <span style={{ fontSize: '0.875rem' }}>{error}</span>
            </div>
          )}

         {/* Header Section - Compact Layout */}
<div style={{ 
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '2rem',
  padding: '0',
  borderBottom: 'none',
  width: '100%'
}}>
  <div style={{ 
    flex: 1, 
    minWidth: 0,
    paddingRight: '1rem'  // Space between title and button
  }}>
    <h2 style={{ 
      fontSize: '1.4rem',
      fontWeight: '800',
      color: isDarkMode ? '#f3f4f6' : '#1f2937',
      marginBottom: '0.375rem',
      lineHeight: '1.2'
    }}>
      Profile Settings
    </h2>
    <p style={{ 
      color: isDarkMode ? '#94a3b8' : '#6b7280',
      fontSize: '0.9375rem',
      lineHeight: '1.4',
      margin: '0'
    }}>
      Manage your account
    </p>
  </div>

  {!isEditing && (
    <button
      onClick={handleEdit}
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: `2px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
        color: isDarkMode ? '#94a3b8' : '#6b7280',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        flexShrink: 0,
        marginLeft: '0.5rem',
        boxShadow: 'none'
      }}
      onMouseEnter={(e) => {
        if (window.innerWidth > 768) {
          e.currentTarget.style.background = '#3b82f6';
          e.currentTarget.style.borderColor = '#3b82f6';
          e.currentTarget.style.color = 'white';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.color = isDarkMode ? '#94a3b8' : '#6b7280';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.transform = 'scale(0.95)';
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <Edit size={18} />
    </button>
  )}
</div>

          {/* Profile Image Section */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <div style={{ position: 'relative' }}>
              <div
                onClick={handleImageClick}
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  cursor: isEditing ? 'pointer' : 'default',
                  background: imagePreview 
                    ? `url(${imagePreview}) center/cover` 
                    : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1.75rem',
                  fontWeight: 'bold',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                  transition: 'all 0.3s ease',
                  border: isEditing ? '3px solid #3b82f6' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (isEditing && window.innerWidth > 768) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {!imagePreview && getInitials(formData.name || 'User')}
                
                {isEditing && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (window.innerWidth > 768) {
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0';
                  }}>
                    <Camera size={28} color="white" />
                  </div>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </div>
            
            {isEditing && (
              <p style={{ 
                marginTop: '0.75rem', 
                fontSize: '0.8125rem', 
                color: isDarkMode ? '#94a3b8' : '#6b7280',
                textAlign: 'center',
                maxWidth: '280px',
                lineHeight: '1.4'
              }}>
                Tap to upload photo (Max 5MB)
              </p>
            )}
          </div>

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Name Field */}
            <div className="form-group">
              <label style={{ 
                fontWeight: 600, 
                color: isDarkMode ? '#e2e8f0' : '#374151',
                marginBottom: '0.5rem',
                display: 'block',
                fontSize: '0.875rem'
              }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '0.875rem', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: isDarkMode ? '#64748b' : '#9ca3af'
                  }} 
                />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!isEditing}
                  style={{
                    width: '100%',
                    padding: '0.875rem 0.875rem 0.875rem 2.75rem',
                    background: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(249, 250, 251, 0.8)',
                    border: `2px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                    borderRadius: '10px',
                    fontSize: '0.9375rem',
                    color: isDarkMode ? '#e2e8f0' : '#374151',
                    cursor: isEditing ? 'text' : 'not-allowed',
                    opacity: isEditing ? 1 : 0.7
                  }}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="form-group">
              <label style={{ 
                fontWeight: 600, 
                color: isDarkMode ? '#e2e8f0' : '#374151',
                marginBottom: '0.5rem',
                display: 'block',
                fontSize: '0.875rem'
              }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '0.875rem', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: isDarkMode ? '#64748b' : '#9ca3af'
                  }} 
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled={true}
                  style={{
                    width: '100%',
                    padding: '0.875rem 0.875rem 0.875rem 2.75rem',
                    background: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(249, 250, 251, 0.8)',
                    border: `2px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                    borderRadius: '10px',
                    fontSize: '0.9375rem',
                    color: isDarkMode ? '#e2e8f0' : '#374151',
                    cursor: 'not-allowed',
                    opacity: 0.7
                  }}
                />
              </div>
              <p style={{ 
                marginTop: '0.5rem', 
                fontSize: '0.8125rem', 
                color: isDarkMode ? '#64748b' : '#9ca3af'
              }}>
                Email cannot be changed
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div style={{ 
              display: 'flex', 
              gap: '0.75rem', 
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'}`
            }}>
              <button
                onClick={handleCancel}
                className="action-btn secondary"
                style={{ 
                  flex: 1,
                  padding: '0.875rem 1rem',
                  fontSize: '0.9375rem'
                }}
                disabled={isSaving}
              >
                <X size={18} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="action-btn primary"
                style={{ 
                  flex: 1,
                  padding: '0.875rem 1rem',
                  fontSize: '0.9375rem'
                }}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="auth-spinner"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save
                  </>
                )}
              </button>
            </div>
          )}

          {/* Sign Out Button */}
          {!isEditing && (
            <div style={{ 
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'}`
            }}>
              <button
                onClick={handleSignOut}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.625rem',
                  padding: '0.875rem',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 6px 16px rgba(239, 68, 68, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (window.innerWidth > 768) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 24px rgba(239, 68, 68, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.3)';
                }}
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation Bar (Mobile Only) */}
      <nav className="dashboard-bottom-nav">
        <button 
          className={`dashboard-bottom-nav-item ${activeBottomTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleBottomNavClick('/dashboard', 'dashboard')}
          type="button"
          data-tab="dashboard"
        >
          <Home size={22} />
          <span>Home</span>
        </button>
        <button 
          className={`dashboard-bottom-nav-item ${activeBottomTab === 'facilities' ? 'active' : ''}`}
          onClick={() => handleBottomNavClick('/facilities', 'facilities')}
          type="button"
          data-tab="facilities"
        >
          <MapPin size={22} />
          <span>Facilities</span>
        </button>
        <button 
          className={`dashboard-bottom-nav-item ${activeBottomTab === 'symptom' ? 'active' : ''}`}
          onClick={() => handleBottomNavClick('/symptom-checker', 'symptom')}
          type="button"
          data-tab="symptom"
        >
          <Bot size={22} />
          <span>Symptoms</span>
        </button>
        <button 
          className={`dashboard-bottom-nav-item ${activeBottomTab === 'emergency' ? 'active' : ''}`}
          onClick={() => handleBottomNavClick('/emergency', 'emergency')}
          type="button"
          data-tab="emergency"
        >
          <Phone size={22} />
          <span>Emergency</span>
        </button>
        <button 
          className={`dashboard-bottom-nav-item ${activeBottomTab === 'profile' ? 'active' : ''}`}
          onClick={() => handleBottomNavClick('/profile', 'profile')}
          type="button"
          data-tab="profile"
        >
          <User size={22} />
          <span>Profile</span>
        </button>
      </nav>

      {/* Footer - Hidden on mobile, shown on desktop */}
<footer className="dashboard-footer" style={{ 
  marginTop: '2rem',
  paddingBottom: '100px', // Add padding to push content above navbar
  position: 'relative',
  zIndex: 1
}}>
  <div className="dashboard-footer-content">
    <div className="dashboard-footer-bottom" style={{ 
      padding: '1.5rem', 
      textAlign: 'center',
      position: 'relative'
    }}>
      <div className="dashboard-footer-copyright">
        <p style={{ fontSize: '0.875rem' }}>&copy; 2025 HealthConnect Navigator. All rights reserved.</p>
      </div>
    </div>
  </div>
</footer>
    </div>
  );
};

export default ProfilePage;