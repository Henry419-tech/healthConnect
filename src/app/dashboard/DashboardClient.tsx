// src/app/dashboard/DashboardClient.tsx
'use client'

import { signOut } from 'next-auth/react'
import { Session } from 'next-auth'
import { motion } from 'framer-motion'
import { 
  Heart, 
  LogOut, 
  User, 
  Activity, 
  Calendar, 
  Bell, 
  TrendingUp, 
  Shield, 
  Clock,
  Stethoscope,
  PlusCircle,
  Settings,
  BarChart3,
  Zap,
  Target,
  Award,
  Sparkles
} from 'lucide-react'

interface Props {
  session: Session
}

export default function DashboardClient({ session }: Props) {
  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  const healthStats = [
    { icon: Heart, label: 'Heart Rate', value: '72', unit: 'BPM', status: 'good', trend: '+2%' },
    { icon: Activity, label: 'Steps Today', value: '8,547', unit: 'steps', status: 'excellent', trend: '+15%' },
    { icon: Zap, label: 'Energy Level', value: '85', unit: '%', status: 'good', trend: '+5%' },
    { icon: Target, label: 'Goals Met', value: '7', unit: '/10', status: 'warning', trend: '-1' },
  ]

  const quickActions = [
    { icon: Stethoscope, label: 'Symptom Check', desc: 'AI-powered health assessment', color: 'blue' },
    { icon: Calendar, label: 'Book Appointment', desc: 'Schedule with healthcare providers', color: 'green' },
    { icon: PlusCircle, label: 'Log Health Data', desc: 'Track vitals and symptoms', color: 'purple' },
    { icon: BarChart3, label: 'View Reports', desc: 'Analyze your health trends', color: 'orange' },
  ]

  const recentActivities = [
    { type: 'checkup', message: 'Completed daily health check', time: '2 hours ago', status: 'success' },
    { type: 'appointment', message: 'Upcoming: Dr. Smith consultation', time: 'Tomorrow 2:00 PM', status: 'info' },
    { type: 'medication', message: 'Medication reminder: Vitamin D', time: '4 hours ago', status: 'warning' },
    { type: 'achievement', message: 'Reached 10,000 steps goal!', time: 'Yesterday', status: 'success' },
  ]

  return (
    <div className="dashboard-container">
      {/* Floating Background Elements */}
      <div className="dashboard-bg-element dashboard-bg-element-1"></div>
      <div className="dashboard-bg-element dashboard-bg-element-2"></div>
      <div className="dashboard-bg-element dashboard-bg-element-3"></div>
      <div className="dashboard-bg-element dashboard-bg-element-4"></div>
      <div className="dashboard-bg-element dashboard-bg-element-5"></div>

      {/* Animated Background Particles */}
      <div className="dashboard-particles">
        <div className="dashboard-particle"></div>
        <div className="dashboard-particle"></div>
        <div className="dashboard-particle"></div>
        <div className="dashboard-particle"></div>
        <div className="dashboard-particle"></div>
        <div className="dashboard-particle"></div>
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="dashboard-header"
      >
        <div className="dashboard-header-content">
          <div className="dashboard-header-left">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="dashboard-logo"
            >
              <Heart size={40} />
              <div className="dashboard-logo-glow"></div>
            </motion.div>
            
            <div className="dashboard-header-info">
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="dashboard-title"
              >
                Welcome back, {session.user?.name}!
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="dashboard-subtitle"
              >
                Ready to take charge of your health today?
              </motion.p>
            </div>
          </div>

          <div className="dashboard-header-actions">
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="dashboard-action-button notification-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bell size={20} />
              <div className="notification-badge">3</div>
              <div className="button-glow notification-glow"></div>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className="dashboard-action-button settings-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings size={20} />
              <div className="button-glow settings-glow"></div>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9 }}
              onClick={handleSignOut}
              className="dashboard-action-button logout-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogOut size={20} />
              <span>Sign Out</span>
              <div className="button-glow logout-glow"></div>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="dashboard-main">
        {/* Health Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="dashboard-section"
        >
          <h2 className="dashboard-section-title">
            <Activity size={24} />
            Health Overview
          </h2>
          
          <div className="health-stats-grid">
            {healthStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className={`health-stat-card ${stat.status}`}
                whileHover={{ y: -5, scale: 1.02 }}
              >
                <div className="health-stat-glow"></div>
                <div className="health-stat-header">
                  <div className="health-stat-icon">
                    <stat.icon size={24} />
                  </div>
                  <div className="health-stat-trend">
                    <TrendingUp size={16} />
                    <span>{stat.trend}</span>
                  </div>
                </div>
                <div className="health-stat-content">
                  <div className="health-stat-value">
                    {stat.value}
                    <span className="health-stat-unit">{stat.unit}</span>
                  </div>
                  <div className="health-stat-label">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="dashboard-section"
        >
          <h2 className="dashboard-section-title">
            <Sparkles size={24} />
            Quick Actions
          </h2>
          
          <div className="quick-actions-grid">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className={`quick-action-card ${action.color}`}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="quick-action-glow"></div>
                <div className="quick-action-icon">
                  <action.icon size={28} />
                </div>
                <div className="quick-action-content">
                  <h3 className="quick-action-title">{action.label}</h3>
                  <p className="quick-action-desc">{action.desc}</p>
                </div>
                <div className="quick-action-arrow">
                  <Sparkles size={16} />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="dashboard-bottom-row">
          {/* Recent Activities */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="dashboard-section activities-section"
          >
            <h2 className="dashboard-section-title">
              <Clock size={24} />
              Recent Activities
            </h2>
            
            <div className="activities-list">
              {recentActivities.map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                  className={`activity-item ${activity.status}`}
                  whileHover={{ x: 5 }}
                >
                  <div className="activity-indicator"></div>
                  <div className="activity-content">
                    <p className="activity-message">{activity.message}</p>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.0, duration: 0.8 }}
            className="dashboard-section profile-section"
          >
            <h2 className="dashboard-section-title">
              <User size={24} />
              Profile
            </h2>
            
            <div className="profile-card">
              <div className="profile-glow"></div>
              <div className="profile-avatar">
                <User size={32} />
                <div className="profile-status-dot"></div>
              </div>
              
              <div className="profile-info">
                <div className="profile-field">
                  <label>Name</label>
                  <span>{session.user?.name}</span>
                </div>
                <div className="profile-field">
                  <label>Email</label>
                  <span>{session.user?.email}</span>
                </div>
                <div className="profile-field">
                  <label>Member Since</label>
                  <span>January 2024</span>
                </div>
              </div>

              <div className="profile-badges">
                <div className="profile-badge">
                  <Award size={16} />
                  <span>Health Champion</span>
                </div>
                <div className="profile-badge">
                  <Shield size={16} />
                  <span>Verified Account</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
          position: relative;
          overflow-x: hidden;
          padding: 2rem;
        }

        /* Background Elements */
        .dashboard-bg-element {
          position: absolute;
          border-radius: 50%;
          background: linear-gradient(45deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
          backdrop-filter: blur(10px);
          animation: float 8s ease-in-out infinite;
        }

        .dashboard-bg-element-1 {
          width: 300px;
          height: 300px;
          top: 10%;
          left: -5%;
          animation-delay: 0s;
        }

        .dashboard-bg-element-2 {
          width: 200px;
          height: 200px;
          top: 30%;
          right: -5%;
          animation-delay: -2s;
        }

        .dashboard-bg-element-3 {
          width: 150px;
          height: 150px;
          bottom: 20%;
          left: 10%;
          animation-delay: -4s;
        }

        .dashboard-bg-element-4 {
          width: 250px;
          height: 250px;
          bottom: -5%;
          right: 15%;
          animation-delay: -6s;
        }

        .dashboard-bg-element-5 {
          width: 180px;
          height: 180px;
          top: 50%;
          left: 50%;
          transform: translateX(-50%);
          animation-delay: -8s;
        }

        /* Particles */
        .dashboard-particles {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .dashboard-particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 50%;
          animation: particle-float 12s linear infinite;
        }

        .dashboard-particle:nth-child(1) { left: 10%; animation-delay: 0s; }
        .dashboard-particle:nth-child(2) { left: 20%; animation-delay: -2s; }
        .dashboard-particle:nth-child(3) { left: 30%; animation-delay: -4s; }
        .dashboard-particle:nth-child(4) { left: 60%; animation-delay: -6s; }
        .dashboard-particle:nth-child(5) { left: 80%; animation-delay: -8s; }
        .dashboard-particle:nth-child(6) { left: 90%; animation-delay: -10s; }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }

        @keyframes particle-float {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) scale(1); opacity: 0; }
        }

        /* Header Styles */
        .dashboard-header {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 24px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1);
        }

        .dashboard-header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dashboard-header-left {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .dashboard-logo {
          position: relative;
          background: linear-gradient(135deg, #ff6b6b, #ee5a24);
          padding: 1rem;
          border-radius: 20px;
          color: white;
          box-shadow: 0 10px 30px rgba(255, 107, 107, 0.3);
        }

        .dashboard-logo-glow {
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(135deg, #ff6b6b, #ee5a24);
          border-radius: 22px;
          z-index: -1;
          opacity: 0.7;
          filter: blur(10px);
        }

        .dashboard-title {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #ffffff, #f8f9fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }

        .dashboard-subtitle {
          color: rgba(255, 255, 255, 0.8);
          font-size: 1.1rem;
          margin: 0.5rem 0 0 0;
        }

        .dashboard-header-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .dashboard-action-button {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .notification-button {
          background: rgba(52, 152, 219, 0.2);
          color: #3498db;
          padding: 0.75rem;
        }

        .notification-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #e74c3c;
          color: white;
          font-size: 0.7rem;
          padding: 0.2rem 0.4rem;
          border-radius: 50%;
          min-width: 18px;
          text-align: center;
        }

        .settings-button {
          background: rgba(155, 89, 182, 0.2);
          color: #9b59b6;
          padding: 0.75rem;
        }

        .logout-button {
          background: rgba(231, 76, 60, 0.2);
          color: #e74c3c;
        }

        .button-glow {
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          border-radius: 18px;
          z-index: -1;
          opacity: 0;
          transition: opacity 0.3s ease;
          filter: blur(10px);
        }

        .notification-glow { background: #3498db; }
        .settings-glow { background: #9b59b6; }
        .logout-glow { background: #e74c3c; }

        .dashboard-action-button:hover .button-glow {
          opacity: 0.3;
        }

        /* Main Content */
        .dashboard-main {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .dashboard-section {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 24px;
          padding: 2rem;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1);
        }

        .dashboard-section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          margin: 0 0 1.5rem 0;
        }

        /* Health Stats */
        .health-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .health-stat-card {
          position: relative;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .health-stat-card.good { border-left: 4px solid #2ecc71; }
        .health-stat-card.excellent { border-left: 4px solid #f39c12; }
        .health-stat-card.warning { border-left: 4px solid #e74c3c; }

        .health-stat-glow {
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
          border-radius: 22px;
          z-index: -1;
          opacity: 0;
          transition: opacity 0.3s ease;
          filter: blur(10px);
        }

        .health-stat-card:hover .health-stat-glow {
          opacity: 1;
        }

        .health-stat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .health-stat-icon {
          background: rgba(255, 255, 255, 0.2);
          padding: 0.5rem;
          border-radius: 12px;
          color: white;
        }

        .health-stat-trend {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #2ecc71;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .health-stat-value {
          font-size: 2.5rem;
          font-weight: 800;
          color: white;
          margin-bottom: 0.5rem;
        }

        .health-stat-unit {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 500;
        }

        .health-stat-label {
          color: rgba(255, 255, 255, 0.8);
          font-size: 1rem;
        }

        /* Quick Actions */
        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .quick-action-card {
          position: relative;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .quick-action-card.blue { border-left: 4px solid #3498db; }
        .quick-action-card.green { border-left: 4px solid #2ecc71; }
        .quick-action-card.purple { border-left: 4px solid #9b59b6; }
        .quick-action-card.orange { border-left: 4px solid #f39c12; }

        .quick-action-glow {
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
          border-radius: 22px;
          z-index: -1;
          opacity: 0;
          transition: opacity 0.3s ease;
          filter: blur(10px);
        }

        .quick-action-card:hover .quick-action-glow {
          opacity: 1;
        }

        .quick-action-icon {
          background: rgba(255, 255, 255, 0.2);
          padding: 1rem;
          border-radius: 16px;
          color: white;
          flex-shrink: 0;
        }

        .quick-action-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: white;
          margin: 0 0 0.5rem 0;
        }

        .quick-action-desc {
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
          line-height: 1.4;
        }

        .quick-action-arrow {
          color: white;
          margin-left: auto;
          opacity: 0.7;
          transition: transform 0.3s ease;
        }

        .quick-action-card:hover .quick-action-arrow {
          transform: translateX(5px);
        }

        /* Bottom Row */
        .dashboard-bottom-row {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 2rem;
        }

        /* Activities */
        .activities-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .activity-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          transition: all 0.3s ease;
        }

        .activity-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .activity-item.success .activity-indicator { background: #2ecc71; }
        .activity-item.info .activity-indicator { background: #3498db; }
        .activity-item.warning .activity-indicator { background: #f39c12; }

        .activity-message {
          color: white;
          font-weight: 500;
          margin: 0 0 0.25rem 0;
        }

        .activity-time {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
        }

        /* Profile */
        .profile-card {
          position: relative;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(15px);
          border-radius: 20px;
          padding: 2rem;
        }

        .profile-glow {
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
          border-radius: 22px;
          z-index: -1;
          filter: blur(10px);
        }

        .profile-avatar {
          position: relative;
          background: linear-gradient(135deg, #667eea, #764ba2);
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin: 0 auto 2rem auto;
        }

        .profile-status-dot {
          position: absolute;
          bottom: 5px;
          right: 5px;
          width: 16px;
          height: 16px;
          background: #2ecc71;
          border: 3px solid white;
          border-radius: 50%;
        }

        .profile-field {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .profile-field label {
          color: rgba(255, 255, 255, 0.7);
          font-weight: 500;
        }

        .profile-field span {
          color: white;
          font-weight: 600;
        }

        .profile-badges {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 2rem;
        }

        .profile-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          font-size: 0.9rem;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .dashboard-bottom-row {
            grid-template-columns: 1fr;
          }
          
          .dashboard-container {
            padding: 1rem;
          }
          
          .dashboard-header-content {
            flex-direction: column;
            gap: 1.5rem;
            text-align: center;
          }
          
          .dashboard-header-left {
            flex-direction: column;
            gap: 1rem;
          }
          
          .dashboard-title {
            font-size: 2rem;
          }
        }

        @media (max-width: 768px) {
          .health-stats-grid {
            grid-template-columns: 1fr;
          }
          
          .quick-actions-grid {
            grid-template-columns: 1fr;
          }
          
          .dashboard-header-actions {
            flex-wrap: wrap;
            justify-content: center;
          }
          
          .quick-action-card {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }
          
          .quick-action-arrow {
            margin: 0;
          }
        }

        @media (max-width: 480px) {
          .dashboard-container {
            padding: 0.5rem;
          }
          
          .dashboard-section {
            padding: 1.5rem;
          }
          
          .dashboard-header {
            padding: 1.5rem;
          }
          
          .health-stat-value {
            font-size: 2rem;
          }
          
          .dashboard-title {
            font-size: 1.75rem;
          }
        }
      `}</style>
    </div>
  )
}