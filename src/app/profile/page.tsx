'use client'

import React, { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useDarkMode } from '@/contexts/DarkModeContext';
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
  Edit
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

      // Update the session - this will trigger the jwt callback
      await update();

      setSaveSuccess(true);
      setIsEditing(false);
      
      // Show success message for 2 seconds
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

  return (
    <div className="dashboard-container">
      {/* Floating Background Elements */}
      <div className="dashboard-bg-element dashboard-bg-element-1"></div>
      <div className="dashboard-bg-element dashboard-bg-element-2"></div>
      <div className="dashboard-bg-element dashboard-bg-element-3"></div>

      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-header-left">
            <div className="dashboard-logo">
              <div className="dashboard-logo-icon">
                <Heart size={20} className="dashboard-logo-heart" />
              </div>
              <h1 className="dashboard-logo-text">HealthConnect Navigator</h1>
            </div>
          </div>

          <div className="dashboard-user-actions">
            <button 
              className="dashboard-action-btn dark-mode-toggle-prominent"
              onClick={toggleDarkMode}
              type="button"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="dashboard-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="auth-back-button"
          style={{ position: 'relative', marginBottom: '2rem' }}
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        {/* Profile Card */}
        <div className="dashboard-card" style={{ padding: '2.5rem' }}>
          {/* Success Message */}
          {saveSuccess && (
            <div className="success-message" style={{ marginBottom: '1.5rem' }}>
              <Check size={20} />
              <span>Profile updated successfully!</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="error-message" style={{ marginBottom: '1.5rem' }}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Header Section */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            marginBottom: '2rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
          }}>
            <div>
              <h2 style={{ 
                fontSize: '1.75rem', 
                fontWeight: 'bold', 
                color: isDarkMode ? '#f3f4f6' : '#1f2937',
                marginBottom: '0.5rem'
              }}>
                Profile Settings
              </h2>
              <p style={{ 
                color: isDarkMode ? '#94a3b8' : '#6b7280',
                fontSize: '1rem'
              }}>
                Manage your account information
              </p>
            </div>

            {!isEditing && (
              <button
                onClick={handleEdit}
                className="action-btn secondary"
                style={{ padding: '0.75rem 1.5rem' }}
              >
                <Edit size={18} />
                Edit Profile
              </button>
            )}
          </div>

          {/* Profile Image Section */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <div style={{ position: 'relative' }}>
              <div
                onClick={handleImageClick}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  cursor: isEditing ? 'pointer' : 'default',
                  background: imagePreview 
                    ? `url(${imagePreview}) center/cover` 
                    : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
                  transition: 'all 0.3s ease',
                  border: isEditing ? '3px solid #3b82f6' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (isEditing) {
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
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0';
                  }}>
                    <Camera size={32} color="white" />
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
                marginTop: '1rem', 
                fontSize: '0.875rem', 
                color: isDarkMode ? '#94a3b8' : '#6b7280',
                textAlign: 'center'
              }}>
                Click to upload a profile photo (Max 5MB)
              </p>
            )}
          </div>

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Name Field */}
            <div className="form-group">
              <label style={{ 
                fontWeight: 600, 
                color: isDarkMode ? '#e2e8f0' : '#374151',
                marginBottom: '0.5rem',
                display: 'block'
              }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User 
                  size={20} 
                  style={{ 
                    position: 'absolute', 
                    left: '1rem', 
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
                    padding: '1rem 1rem 1rem 3rem',
                    background: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(249, 250, 251, 0.8)',
                    border: `2px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                    borderRadius: '12px',
                    fontSize: '1rem',
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
                display: 'block'
              }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail 
                  size={20} 
                  style={{ 
                    position: 'absolute', 
                    left: '1rem', 
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
                    padding: '1rem 1rem 1rem 3rem',
                    background: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(249, 250, 251, 0.8)',
                    border: `2px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                    borderRadius: '12px',
                    fontSize: '1rem',
                    color: isDarkMode ? '#e2e8f0' : '#374151',
                    cursor: 'not-allowed',
                    opacity: 0.7
                  }}
                />
              </div>
              <p style={{ 
                marginTop: '0.5rem', 
                fontSize: '0.875rem', 
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
              gap: '1rem', 
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid rgba(0, 0, 0, 0.06)'
            }}>
              <button
                onClick={handleCancel}
                className="action-btn secondary"
                style={{ flex: 1 }}
                disabled={isSaving}
              >
                <X size={18} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="action-btn primary"
                style={{ flex: 1 }}
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
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}

          {/* Sign Out Button */}
          {!isEditing && (
            <div style={{ 
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid rgba(0, 0, 0, 0.06)'
            }}>
              <button
                onClick={handleSignOut}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(239, 68, 68, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(239, 68, 68, 0.3)';
                }}
              >
                <LogOut size={20} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="dashboard-footer" style={{ marginTop: '4rem' }}>
        <div className="dashboard-footer-content">
          <div className="dashboard-footer-bottom" style={{ padding: '2rem', textAlign: 'center' }}>
            <div className="dashboard-footer-copyright">
              <p>&copy; 2025 HealthConnect Navigator. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ProfilePage;