import React, { useEffect, useState, useRef } from 'react';
import {
  Activity, AlertCircle, AlertTriangle, BarChart3, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock,
  Database, FileSpreadsheet, Gauge, HelpCircle, Info, LayoutDashboard, ListChecks,
  LogOut, MessageSquare, Moon, Network, Play, Plus, RefreshCw, Route, Search,
  Settings, ShieldCheck, Sparkles, Sun, Train, Upload, UserPlus, Users, Wand2, Zap, X
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line } from 'recharts';
import * as api from './services/api.js';
import logo from './assets/logo.png';

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  // Authentication & Session
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('marg_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Current Route Path
  const [currentPath, setCurrentPath] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || (user ? '/dashboard' : '/login');
  });

  // Theme
  const [darkTheme, setDarkTheme] = useState(() => {
    return localStorage.getItem('marg_theme') === 'dark';
  });

  // Dynamic Live Clock
  const [timeString, setTimeString] = useState(new Date().toLocaleTimeString());
  const [dateString, setDateString] = useState(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString());
      setDateString(now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Global Operational Data State
  const [data, setData] = useState({
    dashboard: null,
    trains: [],
    assets: [],
    maintenance: [],
    blocks: null,
    analytics: null
  });

  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(true);
  const [error, setError] = useState('');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef(null);

  // Handle Hash Navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) setCurrentPath(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (path) => {
    setCurrentPath(path);
    window.location.hash = path;
    setShowSearchDropdown(false);
  };

  // Sync theme class
  useEffect(() => {
    if (darkTheme) {
      document.body.classList.add('dark');
      localStorage.setItem('marg_theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('marg_theme', 'light');
    }
  }, [darkTheme]);

  // Load Operational Data from SQLite Backend
  const loadData = async () => {
    setLoading(true);
    try {
      const [dash, trns, asts, maint, blks, alytics] = await Promise.all([
        api.getDashboard().catch(() => null),
        api.getTrains().catch(() => []),
        api.getAssets().catch(() => []),
        api.getMaintenance().catch(() => []),
        api.getBlocks().catch(() => null),
        api.getAnalytics().catch(() => null)
      ]);

      setData({
        dashboard: dash,
        trains: Array.isArray(trns) ? trns : trns.data || [],
        assets: asts || [],
        maintenance: maint || [],
        blocks: blks,
        analytics: alytics
      });

      setBackendOnline(Boolean(dash));
      setError('');
    } catch (err) {
      setBackendOnline(false);
      setError('Backend service offline. Check Node server on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Global Search Handler
  const handleGlobalSearch = async (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    setSearching(true);
    setShowSearchDropdown(true);
    try {
      const res = await api.searchGlobal(val);
      setSearchResults(res.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Auth Functions
  const handleLogin = async (username, password) => {
    const res = await api.loginUser(username, password);
    if (res.success) {
      setUser(res.user);
      localStorage.setItem('marg_user', JSON.stringify(res.user));
      navigate('/dashboard');
    } else {
      throw new Error(res.message || 'Invalid username or password.');
    }
  };

  const handleRegister = async (username, password, name) => {
    const res = await api.registerUser(username, password, name);
    if (res.success) {
      setUser(res.user);
      localStorage.setItem('marg_user', JSON.stringify(res.user));
      navigate('/dashboard');
    } else {
      throw new Error(res.message || 'Registration failed.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('marg_user');
    navigate('/login');
  };

  // If not logged in, render Login Page
  if (!user || currentPath === '/login') {
    return <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;
  }

  // Role-Aware Navigation Items
  const userRole = user?.role || 'MAINTENANCE_CONTRACTOR';

  const navGroups = [
    {
      title: 'Operations & Execution',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'AUTHORITY', 'CONTROL_OFFICER', 'MAINTENANCE_CONTRACTOR', 'MAINTENANCE_USER'] },
        { path: '/contractor-dashboard', label: 'Work Execution', icon: ListChecks, roles: ['MAINTENANCE_CONTRACTOR', 'MAINTENANCE_USER', 'ADMIN', 'CONTROL_OFFICER'] },
        { path: '/approvals', label: 'Approval Queue', icon: ShieldCheck, roles: ['ADMIN', 'AUTHORITY', 'CONTROL_OFFICER'] },
        { path: '/maintenance', label: 'Maintenance Register', icon: Database, roles: ['ADMIN', 'AUTHORITY', 'CONTROL_OFFICER', 'MAINTENANCE_CONTRACTOR', 'MAINTENANCE_USER'] },
        { path: '/assets', label: 'Assets & Health', icon: ShieldCheck, roles: ['ADMIN', 'AUTHORITY', 'CONTROL_OFFICER', 'MAINTENANCE_CONTRACTOR', 'MAINTENANCE_USER'] },
        { path: '/trains', label: 'Train Operations', icon: Train, roles: ['ADMIN', 'AUTHORITY', 'CONTROL_OFFICER', 'MAINTENANCE_CONTRACTOR', 'MAINTENANCE_USER'] }
      ]
    },
    {
      title: 'Planning & Optimization',
      items: [
        { path: '/block-planner', label: 'Block Planner', icon: Route, roles: ['ADMIN', 'AUTHORITY', 'CONTROL_OFFICER', 'MAINTENANCE_CONTRACTOR', 'MAINTENANCE_USER'] },
        { path: '/weekly-plan', label: 'Weekly Plan', icon: CalendarDays, roles: ['ADMIN', 'AUTHORITY', 'CONTROL_OFFICER', 'MAINTENANCE_CONTRACTOR', 'MAINTENANCE_USER'] },
        { path: '/monthly-plan', label: 'Monthly Plan', icon: CalendarDays, roles: ['ADMIN', 'AUTHORITY', 'CONTROL_OFFICER'] },
        { path: '/scenario', label: 'Scenario Simulator', icon: Zap, roles: ['ADMIN', 'AUTHORITY', 'CONTROL_OFFICER'] }
      ]
    },
    {
      title: 'Insights & Data',
      items: [
        { path: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['ADMIN', 'AUTHORITY', 'CONTROL_OFFICER', 'MAINTENANCE_CONTRACTOR', 'MAINTENANCE_USER'] },
        { path: '/data-import', label: 'Data Import', icon: Database, roles: ['ADMIN', 'AUTHORITY', 'CONTROL_OFFICER', 'MAINTENANCE_CONTRACTOR', 'MAINTENANCE_USER'] },
        { path: '/assistant', label: 'MARG Groq Assistant', icon: MessageSquare, roles: ['ADMIN', 'AUTHORITY', 'CONTROL_OFFICER', 'MAINTENANCE_CONTRACTOR', 'MAINTENANCE_USER'] }
      ]
    }
  ];

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src={logo} alt="MARG Logo" className="brand-logo-img" />
          <div className="brand-title-wrap">
            <b>MARG</b>
            <small>Decision Support Portal</small>
          </div>
        </div>

        <nav className="sidebar-nav-wrap">
          {navGroups.map(group => {
            const filteredItems = group.items.filter(i => i.roles.includes(userRole));
            if (filteredItems.length === 0) return null;
            return (
              <div key={group.title}>
                <div className="nav-section-title">{group.title}</div>
                {filteredItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentPath === item.path;
                  return (
                    <button
                      key={item.path}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => navigate(item.path)}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="system-status-indicator">
            <span className={`status-dot ${backendOnline ? '' : 'offline'}`} />
            {backendOnline ? 'System Online (SQLite)' : 'Backend Offline'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Role: <b>{userRole}</b>
          </div>
        </div>
      </aside>

      {/* MAIN WRAPPER */}
      <div className="main-wrapper">
        {/* HEADER */}
        <header className="top-header">
          <div className="header-search" ref={searchRef} style={{ position: 'relative' }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search trains, assets, sections, maintenance tasks..."
              value={searchQuery}
              onChange={handleGlobalSearch}
              onFocus={() => searchQuery.trim() && setShowSearchDropdown(true)}
            />

            {/* Global Search Dropdown */}
            {showSearchDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6,
                background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8,
                boxShadow: 'var(--shadow-lg)', zIndex: 100, maxHeight: 320, overflowY: 'auto'
              }}>
                {searching ? (
                  <div style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)' }}>Searching database...</div>
                ) : searchResults.length === 0 ? (
                  <div style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)' }}>No records found matching "{searchQuery}"</div>
                ) : (
                  searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => navigate(item.path)}
                      style={{
                        padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.subtitle}</div>
                      </div>
                      <span className="badge badge-info" style={{ fontSize: 10 }}>{item.type.toUpperCase()}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="header-actions">
            <div className="header-date-badge" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span><Clock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />{timeString}</span>
              <span style={{ opacity: 0.5 }}>|</span>
              <span><CalendarDays size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />{dateString}</span>
            </div>

            <button
              className="icon-btn"
              onClick={() => setDarkTheme(!darkTheme)}
              title="Toggle Theme"
            >
              {darkTheme ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 10, borderLeft: '1px solid var(--border)' }}>
              <div style={{ textTransform: 'capitalize', textAlign: 'right' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{user.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.role}</div>
              </div>

              <button className="icon-btn" onClick={handleLogout} title="Logout" style={{ color: 'var(--danger)' }}>
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT VIEW */}
        <main className="main-content">
          {error && (
            <div style={{ padding: 12, marginBottom: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
              {error}
            </div>
          )}

          {currentPath === '/dashboard' && <DashboardView data={data} loading={loading} onRefresh={loadData} navigate={navigate} />}
          {currentPath === '/contractor-dashboard' && <ContractorDashboardView tasks={data.maintenance} onRefresh={loadData} user={user} />}
          {currentPath === '/approvals' && <ApprovalQueueView onRefresh={loadData} userRole={userRole} />}
          {currentPath === '/maintenance' && <MaintenanceView tasks={data.maintenance} onRefresh={loadData} userRole={userRole} />}
          {currentPath === '/assets' && <AssetsView assets={data.assets} onRefresh={loadData} userRole={userRole} />}
          {currentPath === '/trains' && <TrainOpsView trains={data.trains} onRefresh={loadData} />}
          {currentPath === '/block-planner' && <BlockPlannerView blocksData={data.blocks} onRefresh={loadData} userRole={userRole} />}
          {currentPath === '/weekly-plan' && <WeeklyPlanView userRole={userRole} />}
          {currentPath === '/monthly-plan' && <MonthlyPlanView userRole={userRole} onRefresh={loadData} />}
          {currentPath === '/scenario' && <ScenarioSimulatorView onRefresh={loadData} userRole={userRole} />}
          {currentPath === '/analytics' && <AnalyticsView analyticsData={data.analytics} />}
          {currentPath === '/data-import' && <DataImportView onSync={loadData} />}
          {currentPath === '/assistant' && <AssistantFullView navigate={navigate} />}
        </main>
      </div>

      {/* FLOATING AI ASSISTANT WIDGET */}
      {currentPath !== '/assistant' && (
        <FloatingAssistantWidget
          isOpen={isAssistantOpen}
          onToggle={() => setIsAssistantOpen(!isAssistantOpen)}
          navigate={navigate}
        />
      )}
    </div>
  );
}

// ============================================================================
// 1. REDESIGNED LOGIN PAGE (Role-Aware & Modern)
// ============================================================================
function LoginPage({ onLogin, onRegister }) {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [username, setUsername] = useState('officer');
  const [password, setPassword] = useState('officer123');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  const roles = [
    { key: 'officer', label: 'Control Officer', u: 'officer', p: 'officer123', desc: 'Operational control & block approval' },
    { key: 'admin', label: 'Admin', u: 'admin', p: 'admin123', desc: 'System admin & configuration' },
    { key: 'maint', label: 'Maintenance Contractor', u: 'maint', p: 'maint123', desc: 'Task execution & work evidence submit' }
  ];

  const handleRoleSelect = (roleObj) => {
    setUsername(roleObj.u);
    setPassword(roleObj.p);
    setLoginError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setLoginError('');
    try {
      if (mode === 'login') {
        await onLogin(username, password);
      } else {
        await onRegister(username, password, name);
      }
    } catch (err) {
      setLoginError(err.message || 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', background: 'var(--bg)', color: 'var(--text-main)'
    }}>
      {/* Left Branding Column */}
      <div style={{
        flex: 1, background: 'linear-gradient(135deg, #0B5FA5 0%, #032B4F 100%)', color: '#FFF',
        padding: 48, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src={logo} alt="MARG Logo" style={{ height: 48, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.2))' }} />
            <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: 1 }}>MARG</span>
          </div>
          <div style={{ marginTop: 24, fontSize: 22, fontWeight: 600, lineHeight: 1.3 }}>
            AI-Powered Automatic Block Planning Platform
          </div>
          <p style={{ marginTop: 12, opacity: 0.85, fontSize: 14, maxWidth: 480 }}>
            Maximizing asset availability and train operations throughput for Indian Railways through OR-Tools CP-SAT joint maintenance scheduling.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 40 }}>
          <div style={{ padding: 16, background: 'rgba(255,255,255,0.08)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)' }}>
            <Route size={22} style={{ marginBottom: 8, color: '#38BDF8' }} />
            <div style={{ fontWeight: 600, fontSize: 14 }}>Joint Block Optimization</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>Group Track, OHE, Signal & Electrical work into single line possessions.</div>
          </div>
          <div style={{ padding: 16, background: 'rgba(255,255,255,0.08)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)' }}>
            <ShieldCheck size={22} style={{ marginBottom: 8, color: '#4ADE80' }} />
            <div style={{ fontWeight: 600, fontSize: 14 }}>Real Asset Availability</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>Dynamic health scoring & defect risk indexing for 35+ section assets.</div>
          </div>
        </div>

        <div style={{ fontSize: 12, opacity: 0.6 }}>
          MARG Decision-Support Engine • SIH26027 • Indian Railways
        </div>
      </div>

      {/* Right Login Card Column */}
      <div style={{
        width: 480, padding: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--panel)'
      }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>{mode === 'login' ? 'Sign in to MARG Portal' : 'Register Contractor Account'}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {mode === 'login' ? 'Select a role preset or enter your authorized credentials.' : 'Create a maintenance contractor account.'}
          </p>
        </div>

        {mode === 'login' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
              Quick Role Selection Presets
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
              {roles.map(r => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => handleRoleSelect(r)}
                  style={{
                    padding: 10, textAlign: 'left', borderRadius: 6, fontSize: 12,
                    border: username === r.u ? '2px solid var(--marg-blue)' : '1px solid var(--border)',
                    background: username === r.u ? 'var(--marg-blue-light)' : 'var(--bg-subtle)'
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{r.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{r.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. SSE Track Northern Division"
                style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
            />
          </div>

          {loginError && (
            <div style={{ padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', fontSize: 12 }}>
              {loginError}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            style={{ width: '100%', padding: 12, fontSize: 14, fontWeight: 600, marginTop: 6 }}
          >
            {submitting ? 'Authenticating...' : mode === 'login' ? 'Sign In to Portal' : 'Register Account'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          {mode === 'login' ? (
            <>New Contractor? <span style={{ color: 'var(--marg-blue)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setMode('register')}>Register Contractor Account</span></>
          ) : (
            <>Already registered? <span style={{ color: 'var(--marg-blue)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setMode('login')}>Back to Sign In</span></>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. FUTURISTIC RAILWAY CONTROL ROOM NETWORK VISUALIZER
// ============================================================================
function RailwayNetworkVisualizer() {
  const stations = [
    { code: 'NDLS', name: 'New Delhi', x: 40, y: 70 },
    { code: 'UMB', name: 'Ambala Cantt', x: 200, y: 70 },
    { code: 'LDH', name: 'Ludhiana', x: 360, y: 70 },
    { code: 'CNB', name: 'Kanpur Central', x: 520, y: 70 },
    { code: 'LKO', name: 'Lucknow', x: 680, y: 70 }
  ];

  const sections = [
    { id: 'SEC-A01', from: 'NDLS', to: 'UMB', health: 82, status: 'NORMAL', block: true },
    { id: 'SEC-A02', from: 'UMB', to: 'LDH', health: 78, status: 'NORMAL', block: false },
    { id: 'SEC-B01', from: 'LDH', to: 'CNB', health: 64, status: 'CRITICAL', block: true },
    { id: 'SEC-B02', from: 'CNB', to: 'LKO', health: 88, status: 'NORMAL', block: false }
  ];

  return (
    <div style={{ padding: 16, background: 'var(--bg-subtle)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Network size={16} style={{ color: 'var(--marg-blue)' }} /> Live Railway Section Network & Block Visualizer
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#168A5B' }} /> Optimal</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#D97706' }} /> Degraded</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626' }} /> Critical / Maintenance Block</span>
        </div>
      </div>

      <svg width="100%" height="110" viewBox="0 0 740 110" style={{ background: 'var(--panel)', borderRadius: 8, border: '1px solid var(--border)' }}>
        {/* Track Lines */}
        {sections.map((sec, idx) => {
          const s1 = stations.find(st => st.code === sec.from);
          const s2 = stations.find(st => st.code === sec.to);
          const isCritical = sec.health < 70;
          return (
            <g key={sec.id}>
              <line
                x1={s1.x} y1={s1.y}
                x2={s2.x} y2={s2.y}
                stroke={sec.block ? '#DC2626' : isCritical ? '#D97706' : '#168A5B'}
                strokeWidth={sec.block ? 5 : 3}
                strokeDasharray={sec.block ? '6 4' : 'none'}
              />
              <text x={(s1.x + s2.x) / 2} y={s1.y - 12} textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontWeight="600">
                {sec.id} ({sec.health}%) {sec.block ? '[JOINT BLOCK]' : ''}
              </text>
            </g>
          );
        })}

        {/* Stations */}
        {stations.map(st => (
          <g key={st.code}>
            <circle cx={st.x} cy={st.y} r="8" fill="var(--marg-blue)" stroke="#FFF" strokeWidth="2" />
            <text x={st.x} y={st.y + 22} textAnchor="middle" fill="var(--text-main)" fontSize="11" fontWeight="700">
              {st.code}
            </text>
          </g>
        ))}

        {/* Animated Moving Train Marker */}
        <circle cx="120" cy="70" r="5" fill="#38BDF8">
          <animate attributeName="cx" values="40;200;40" dur="12s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

// ============================================================================
// 3. DYNAMIC DASHBOARD VIEW
// ============================================================================
function DashboardView({ data, loading, onRefresh, navigate }) {
  const dash = data.dashboard || {};

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-title-wrap">
          <h1>Operational Command Dashboard</h1>
          <p>Real-time railway maintenance throughput, asset availability, and joint block metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <Activity size={13} /> {dash.data_source || 'SQLite Real-Time Engine'}
          </span>
          <button className="btn-secondary" onClick={onRefresh} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Network Visualizer */}
      <RailwayNetworkVisualizer />

      {/* Metrics Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="card-panel">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Asset Availability Index</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--marg-blue)', marginTop: 4 }}>{dash.asset_availability || 84}%</div>
          <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>Calculated from 35 monitored assets</div>
        </div>

        <div className="card-panel">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Maintenance Tasks</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{dash.tasks || 50}</div>
          <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{dash.critical || 12} critical priority tasks</div>
        </div>

        <div className="card-panel">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>CP-SAT Joint Blocks</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#168A5B', marginTop: 4 }}>{dash.joint_blocks || 3}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Out of {dash.planned_blocks || 7} total scheduled blocks</div>
        </div>

        <div className="card-panel">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Line Block Hours Saved</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#D97706', marginTop: 4 }}>{dash.hours_saved || 4.5}h</div>
          <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>Saved vs uncoordinated baseline</div>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div style={{ padding: 18, background: 'var(--panel)', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Ready to execute CP-SAT Block Optimization?</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Group pending Engineering, OHE, Signal, and Electrical tasks into train-free windows.</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={() => navigate('/assets')}>
            View Critical Assets ({dash.degraded_assets || 6})
          </button>
          <button className="btn-primary" onClick={() => navigate('/block-planner')}>
            <Play size={14} /> Run MARG Optimizer
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. ASSETS & HEALTH MANAGEMENT VIEW
// ============================================================================
function AssetsView({ assets = [], onRefresh, userRole }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [assetId, setAssetId] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('Track');
  const [sectionId, setSectionId] = useState('SEC-A01');
  const [healthScore, setHealthScore] = useState(85);
  const [submitting, setSubmitting] = useState(false);

  const canEdit = ['ADMIN', 'AUTHORITY', 'CONTROL_OFFICER'].includes(userRole);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createAsset({ asset_id: assetId, asset_type: assetType, asset_name: assetName, section_id: sectionId, health_score: healthScore });
      setShowAddModal(false);
      onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to add asset.');
    } finally {
      setSubmitting(false);
    }
  };

  const getHealthBadge = (score) => {
    if (score >= 90) return <span className="badge badge-success">Optimal ({score}%)</span>;
    if (score >= 75) return <span className="badge badge-info">Good ({score}%)</span>;
    if (score >= 60) return <span className="badge badge-warning">Degraded ({score}%)</span>;
    return <span className="badge badge-high">Critical ({score}%)</span>;
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-title-wrap">
          <h1>Assets & Infrastructure Health</h1>
          <p>Real-time health score bands, defect risk indexing, and availability status.</p>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={14} /> Add Railway Asset
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left', background: 'var(--panel)' }}>
          <thead>
            <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12 }}>
              <th style={{ padding: '10px 12px' }}>Asset ID</th>
              <th style={{ padding: '10px 12px' }}>Type</th>
              <th style={{ padding: '10px 12px' }}>Asset Name</th>
              <th style={{ padding: '10px 12px' }}>Section</th>
              <th style={{ padding: '10px 12px' }}>Location</th>
              <th style={{ padding: '10px 12px' }}>Health Score</th>
              <th style={{ padding: '10px 12px' }}>Criticality</th>
              <th style={{ padding: '10px 12px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {assets.map(a => (
              <tr key={a.id || a.asset_id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--marg-blue)' }}>{a.asset_id}</td>
                <td style={{ padding: '10px 12px' }}>{a.asset_type}</td>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{a.asset_name}</td>
                <td style={{ padding: '10px 12px' }}><code>{a.section_id}</code></td>
                <td style={{ padding: '10px 12px' }}>{a.location}</td>
                <td style={{ padding: '10px 12px' }}>{getHealthBadge(a.health_score)}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span className={`badge ${a.criticality === 'CRITICAL' ? 'badge-high' : 'badge-info'}`}>{a.criticality}</span>
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Asset Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--panel)', padding: 24, borderRadius: 10, width: 440, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Add New Railway Asset</h3>
              <X size={18} cursor="pointer" onClick={() => setShowAddModal(false)} />
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Asset ID</label>
                <input type="text" required value={assetId} onChange={e => setAssetId(e.target.value)} placeholder="AST-136" style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Asset Name</label>
                <input type="text" required value={assetName} onChange={e => setAssetName(e.target.value)} placeholder="Track Segment #36" style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Type</label>
                  <select value={assetType} onChange={e => setAssetType(e.target.value)} style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }}>
                    <option value="Track">Track</option>
                    <option value="Bridge">Bridge</option>
                    <option value="OHE">OHE</option>
                    <option value="Signal">Signal</option>
                    <option value="Electrical">Electrical</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Section</label>
                  <input type="text" value={sectionId} onChange={e => setSectionId(e.target.value)} style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Initial Health Score (0 - 100%)</label>
                <input type="number" min="0" max="100" value={healthScore} onChange={e => setHealthScore(e.target.value)} style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Asset'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 5. MAINTENANCE REGISTER VIEW
// ============================================================================
function MaintenanceView({ tasks = [], onRefresh, userRole }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assetId, setAssetId] = useState('AST-101');
  const [dept, setDept] = useState('Engineering');
  const [issue, setIssue] = useState('');
  const [duration, setDuration] = useState(60);
  const [urgency, setUrgency] = useState(60);
  const [sectionId, setSectionId] = useState('SEC-A01');
  const [submitting, setSubmitting] = useState(false);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createMaintenanceTask({ asset_id: assetId, department: dept, issue, estimated_duration: duration, urgency, section_id: sectionId });
      setShowCreateModal(false);
      setIssue('');
      onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to create maintenance task.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.updateTaskStatus(taskId, newStatus);
      onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-title-wrap">
          <h1>Maintenance Register & Priority Calculation</h1>
          <p>Calculated priority scores based on asset health, criticality, urgency, overdue days, and safety risk.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={14} /> Create Maintenance Task
        </button>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left', background: 'var(--panel)' }}>
          <thead>
            <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12 }}>
              <th style={{ padding: '10px 12px' }}>Task ID</th>
              <th style={{ padding: '10px 12px' }}>Asset ID</th>
              <th style={{ padding: '10px 12px' }}>Department</th>
              <th style={{ padding: '10px 12px' }}>Section</th>
              <th style={{ padding: '10px 12px' }}>Issue Description</th>
              <th style={{ padding: '10px 12px' }}>Priority Score</th>
              <th style={{ padding: '10px 12px' }}>Duration</th>
              <th style={{ padding: '10px 12px' }}>Status</th>
              <th style={{ padding: '10px 12px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(t => (
              <tr key={t.id || t.task_id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--marg-blue)' }}>{t.task_id}</td>
                <td style={{ padding: '10px 12px' }}><code>{t.asset_id}</code></td>
                <td style={{ padding: '10px 12px' }}>
                  <span className="badge badge-info" style={{ fontSize: 11 }}>{t.department}</span>
                </td>
                <td style={{ padding: '10px 12px' }}><code>{t.section_id}</code></td>
                <td style={{ padding: '10px 12px', fontWeight: 500, maxWidth: 260 }}>{t.issue || t.description}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span className={`badge ${t.priority_score >= 80 ? 'badge-high' : 'badge-success'}`}>
                    {t.priority_score || 50} ({t.priority || 'MEDIUM'})
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>{t.estimated_duration} mins</td>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{t.status}</td>
                <td style={{ padding: '10px 12px' }}>
                  {t.status === 'PENDING' && (
                    <button className="btn-secondary" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => handleStatusChange(t.task_id, 'IN_PROGRESS')}>
                      Start
                    </button>
                  )}
                  {t.status === 'IN_PROGRESS' && (
                    <button className="btn-primary" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => handleStatusChange(t.task_id, 'COMPLETED')}>
                      Complete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--panel)', padding: 24, borderRadius: 10, width: 460, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Create Maintenance Task</h3>
              <X size={18} cursor="pointer" onClick={() => setShowCreateModal(false)} />
            </div>

            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Asset ID</label>
                  <input type="text" required value={assetId} onChange={e => setAssetId(e.target.value)} style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Department</label>
                  <select value={dept} onChange={e => setDept(e.target.value)} style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }}>
                    <option value="Engineering">Engineering</option>
                    <option value="Overhead Equipment (OHE)">OHE</option>
                    <option value="Signal & Telecom">Signal & Telecom</option>
                    <option value="Electrical">Electrical</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Issue / Maintenance Work Description</label>
                <textarea required value={issue} onChange={e => setIssue(e.target.value)} rows={3} placeholder="Describe defect, e.g. Track fastener fatigue at KM 18.5" style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Section</label>
                  <input type="text" value={sectionId} onChange={e => setSectionId(e.target.value)} style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Duration (m)</label>
                  <input type="number" value={duration} onChange={e => setDuration(e.target.value)} style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Urgency</label>
                  <input type="number" min="0" max="100" value={urgency} onChange={e => setUrgency(e.target.value)} style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Submit Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 6. TRAIN OPERATIONS VIEW
// ============================================================================
function TrainOpsView({ trains = [], onRefresh }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const filtered = trains.filter(t =>
    t.train_number.toLowerCase().includes(search.toLowerCase()) ||
    t.train_name.toLowerCase().includes(search.toLowerCase()) ||
    t.section_id.toLowerCase().includes(search.toLowerCase())
  );

  const pageSize = 15;
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-title-wrap">
          <h1>Train Operations & Timetable Occupancy</h1>
          <p>Hard train movement constraints for maintenance block scheduling.</p>
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search trains or section..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ paddingLeft: 30, paddingRight: 10, paddingTop: 6, paddingBottom: 6, fontSize: 13, width: 220, borderRadius: 6, border: '1px solid var(--border)' }}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left', background: 'var(--panel)' }}>
          <thead>
            <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12 }}>
              <th style={{ padding: '10px 12px' }}>Train No</th>
              <th style={{ padding: '10px 12px' }}>Train Name</th>
              <th style={{ padding: '10px 12px' }}>Type</th>
              <th style={{ padding: '10px 12px' }}>Section</th>
              <th style={{ padding: '10px 12px' }}>Source</th>
              <th style={{ padding: '10px 12px' }}>Departure</th>
              <th style={{ padding: '10px 12px' }}>Destination</th>
              <th style={{ padding: '10px 12px' }}>Arrival</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(t => (
              <tr key={t.id || t.train_number} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--marg-blue)' }}>{t.train_number}</td>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{t.train_name}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span className="badge badge-info" style={{ fontSize: 11 }}>{t.train_type}</span>
                </td>
                <td style={{ padding: '10px 12px' }}><code>{t.section_id}</code></td>
                <td style={{ padding: '10px 12px' }}>{t.source_station}</td>
                <td style={{ padding: '10px 12px' }}>{t.departure_time}</td>
                <td style={{ padding: '10px 12px' }}>{t.destination_station}</td>
                <td style={{ padding: '10px 12px' }}>{t.arrival_time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, fontSize: 12 }}>
        <div style={{ color: 'var(--text-muted)' }}>Showing {paginated.length} of {filtered.length} trains</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn-secondary" style={{ padding: '4px 10px' }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /> Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button className="btn-secondary" style={{ padding: '4px 10px' }} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next <ChevronRight size={14} /></button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ============================================================================
// WORK EVIDENCE SECTION COMPONENT (Camera-First, Actual Image Cards & Delete)
// ============================================================================
function TaskEvidenceSection({ task, user, userRole: userRoleProp, onRefresh, readOnly = false }) {
  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('DURING');
  const [progress, setProgress] = useState(task.work_progress || 50);
  const [notes, setNotes] = useState('');
  const [ohePole, setOhePole] = useState(`${task.section_id || 'SEC-A01'}/101`);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [deleteConfirmEv, setDeleteConfirmEv] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Authenticated Blob Image State
  const [imageBlobUrls, setImageBlobUrls] = useState({});
  const [imageLoading, setImageLoading] = useState({});
  const [imageErrors, setImageErrors] = useState({});

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const currentUserRole = user?.role || userRoleProp || 'MAINTENANCE_CONTRACTOR';
  const currentUsername = user?.username || 'maint';

  const loadSingleBlob = async (ev) => {
    const evId = ev.evidence_id;
    setImageLoading(prev => ({ ...prev, [evId]: true }));
    setImageErrors(prev => ({ ...prev, [evId]: false }));

    try {
      const targetUrl = `${api.BASE_URL || 'http://localhost:5000'}/api/work-evidence/file/${evId}`;
      let token = null;
      try {
        const saved = localStorage.getItem('marg_user');
        if (saved) token = JSON.parse(saved).token;
      } catch { }

      const response = await fetch(targetUrl, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      setImageBlobUrls(prev => {
        if (prev[evId]) {
          try { URL.revokeObjectURL(prev[evId]); } catch (_) { }
        }
        return { ...prev, [evId]: objectUrl };
      });
    } catch (err) {
      console.warn(`[Evidence Image Load Error] ${evId}:`, err.message);
      setImageErrors(prev => ({ ...prev, [evId]: err.message || 'Unable to load evidence image' }));
    } finally {
      setImageLoading(prev => ({ ...prev, [evId]: false }));
    }
  };

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      const res = await api.getTaskEvidence(task.task_id);
      const list = res.evidence || res.data || [];
      if (Array.isArray(list)) {
        setEvidenceList(list);
        list.forEach(ev => {
          loadSingleBlob(ev);
        });
      }
    } catch (err) {
      console.error('Failed to fetch evidence:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
    return () => {
      Object.values(imageBlobUrls).forEach(url => {
        try { URL.revokeObjectURL(url); } catch (_) { }
      });
    };
  }, [task.task_id]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    const localUrl = URL.createObjectURL(selected);
    setPreviewUrl(localUrl);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select or capture a photo first.');
      return;
    }
    setUploading(true);
    try {
      const res = await api.uploadWorkEvidence(task.task_id, file, category, progress, notes, ohePole);
      if (res.success && res.evidence) {
        setFile(null);
        setPreviewUrl(null);
        setNotes('');
        await fetchEvidence();
        if (onRefresh) onRefresh();
        alert('Work evidence photo uploaded successfully with SHA-256 integrity hash!');
      }
    } catch (err) {
      alert(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmEv) return;
    setDeleting(true);
    try {
      const res = await api.deleteWorkEvidence(deleteConfirmEv.evidence_id, deleteReason);
      if (res.success) {
        const evId = deleteConfirmEv.evidence_id;
        if (imageBlobUrls[evId]) {
          try { URL.revokeObjectURL(imageBlobUrls[evId]); } catch (_) { }
        }
        setEvidenceList(prev => prev.filter(item => item.evidence_id !== evId));
        setDeleteConfirmEv(null);
        setDeleteReason('');
        if (onRefresh) onRefresh();
        alert(`Evidence #${evId} deleted successfully.`);
      }
    } catch (err) {
      alert(err.message || 'Failed to delete evidence.');
    } finally {
      setDeleting(false);
    }
  };

  const categorized = {
    BEFORE: evidenceList.filter(e => e.category === 'BEFORE'),
    DURING: evidenceList.filter(e => e.category === 'DURING'),
    AFTER: evidenceList.filter(e => e.category === 'AFTER'),
  };

  const isTaskSubmittedOrClosed = ['SUBMITTED_FOR_APPROVAL', 'APPROVED', 'COMPLETED'].includes(task.status);

  // Control Officer / Admin / Authority ALWAYS can delete evidence.
  // Contractor can delete ONLY while task is editable.
  const canDeleteEv = (ev) => {
    if (currentUserRole === 'ADMIN' || currentUserRole === 'CONTROL_OFFICER' || currentUserRole === 'AUTHORITY') {
      return true;
    }
    return !isTaskSubmittedOrClosed;
  };

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--marg-blue)' }}>
          <ShieldCheck size={16} /> WORK EVIDENCE & PHOTO AUDIT LOG ({evidenceList.length})
        </span>
        {readOnly && <span className="badge badge-info" style={{ fontSize: 11 }}>Read-Only Evidence Review</span>}
      </div>

      {!readOnly && (
        <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 8, marginBottom: 14, border: '1px dashed var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Upload New Work Photo / Certificate</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Evidence Phase</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', padding: '6px 8px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)' }}>
                <option value="BEFORE">BEFORE WORK</option>
                <option value="DURING">DURING WORK</option>
                <option value="AFTER">AFTER WORK</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Progress at Upload (%)</label>
              <input type="number" min={0} max={100} value={progress} onChange={e => setProgress(e.target.value)} style={{ width: '100%', padding: '6px 8px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>OHE Pole Number *</label>
              <input type="text" placeholder="e.g. SEC-A01/245" value={ohePole} onChange={e => setOhePole(e.target.value)} style={{ width: '100%', padding: '6px 8px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)' }} required />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Evidence Notes / Remarks</label>
              <input type="text" placeholder="e.g. Weld grinding complete, gap 4mm" value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%', padding: '6px 8px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)' }} />
            </div>
          </div>

          <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} ref={cameraInputRef} onChange={handleFileChange} />
          <input type="file" accept="image/*" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileChange} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => cameraInputRef.current?.click()}>
                <Zap size={13} /> Take Photo (Camera)
              </button>
              <button type="button" className="btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => fileInputRef.current?.click()}>
                <Upload size={13} /> Upload Photo File
              </button>
              {file && <span style={{ fontSize: 12, color: '#168A5B', alignSelf: 'center', fontWeight: 600 }}>Selected: {file.name}</span>}
            </div>

            <button type="button" className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} disabled={!file || uploading} onClick={handleUpload}>
              {uploading ? 'Uploading...' : 'Save Work Evidence'}
            </button>
          </div>

          {previewUrl && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={previewUrl} alt="Preview" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ready for secure SHA-256 hash generation and server registration.</div>
            </div>
          )}
        </div>
      )}

      {/* EVIDENCE CARDS BY CATEGORY (BEFORE, DURING, AFTER) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {['BEFORE', 'DURING', 'AFTER'].map(cat => {
          const list = categorized[cat];
          return (
            <div key={cat} style={{ background: 'var(--panel)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                <span>{cat} WORK EVIDENCE</span>
                <span className="badge badge-info">{list.length}</span>
              </div>

              {list.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px 0', textAlign: 'center' }}>
                  No {cat.toLowerCase()} photo
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {list.map(ev => {
                    const blobUrl = imageBlobUrls[ev.evidence_id];
                    const isLoading = imageLoading[ev.evidence_id];
                    const isError = imageErrors[ev.evidence_id];
                    const canDelete = canDeleteEv(ev);

                    return (
                      <div key={ev.evidence_id} className="card-panel" style={{ padding: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {/* Header Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--marg-blue)' }}>#{ev.evidence_id}</span>
                          {canDelete ? (
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '2px 8px', fontSize: 11, color: '#DC2626', borderColor: '#FCA5A5' }}
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirmEv(ev); setDeleteReason(''); }}
                              title="Delete Evidence"
                            >
                              Delete
                            </button>
                          ) : (
                            <span className="badge badge-secondary" style={{ fontSize: 10 }}>Evidence Locked</span>
                          )}
                        </div>

                        {/* Actual Photo Display Container */}
                        <div
                          style={{ position: 'relative', width: '100%', height: 160, borderRadius: 6, overflow: 'hidden', background: '#000', border: '1px solid var(--border)', cursor: blobUrl ? 'pointer' : 'default' }}
                          onClick={() => blobUrl && setModalImage(ev)}
                        >
                          {isLoading ? (
                            <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              Loading evidence image...
                            </div>
                          ) : isError ? (
                            <div style={{ padding: 12, textAlign: 'center', color: '#EF4444', fontSize: 11, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                              <span>Unable to load evidence image</span>
                              <button type="button" className="btn-secondary" style={{ marginTop: 6, padding: '2px 8px', fontSize: 10 }} onClick={(e) => { e.stopPropagation(); loadSingleBlob(ev); }}>
                                Retry
                              </button>
                            </div>
                          ) : blobUrl ? (
                            <img
                              src={blobUrl}
                              alt={ev.evidence_id}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          ) : (
                            <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              No image data
                            </div>
                          )}
                        </div>

                        {/* Meta Information */}
                        <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {ev.progress_percentage}% progress
                          </div>
                          <div style={{ color: '#168A5B', fontWeight: 600 }}>By: {ev.uploaded_by}</div>
                          <div style={{ color: 'var(--text-muted)' }}><b>OHE Pole:</b> {ev.ohe_pole_number || `${task.section_id || 'SEC-A01'}/101`}</div>
                          <div style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><b>Notes:</b> {ev.evidence_notes || '—'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmEv && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--panel)', padding: 20, borderRadius: 10, maxWidth: 440, width: '90%', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#DC2626', margin: '0 0 10px 0' }}>Delete Work Evidence?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-main)', marginBottom: 12 }}>
              This will permanently remove evidence record <b>#{deleteConfirmEv.evidence_id}</b> and its uploaded photo from disk and database.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Reason for Deletion (Audit Log)</label>
              <input
                type="text"
                placeholder="e.g. Photo unreadable / Duplicate submission / Control Officer audit"
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                style={{ width: '100%', padding: 8, fontSize: 12, borderRadius: 6, border: '1px solid var(--border)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn-secondary" onClick={() => setDeleteConfirmEv(null)}>Cancel</button>
              <button type="button" className="btn-primary" style={{ background: '#DC2626' }} disabled={deleting} onClick={handleConfirmDelete}>
                {deleting ? 'Deleting...' : 'Delete Evidence'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL EVIDENCE MODAL PREVIEW */}
      {modalImage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--panel)', padding: 20, borderRadius: 10, maxWidth: 540, width: '90%', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Evidence Verification Details ({modalImage.evidence_id})</div>
              <X size={18} cursor="pointer" onClick={() => setModalImage(null)} />
            </div>
            <img
              src={imageBlobUrls[modalImage.evidence_id] || `${api.BASE_URL || 'http://localhost:5000'}/api/work-evidence/file/${modalImage.evidence_id}`}
              alt={modalImage.evidence_id}
              style={{ width: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 8, background: '#000', marginBottom: 12 }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, background: 'var(--bg-subtle)', padding: 10, borderRadius: 6 }}>
              <div><b>Phase:</b> {modalImage.category} WORK</div>
              <div><b>Progress at Capture:</b> {modalImage.progress_percentage}%</div>
              <div><b>Uploaded By:</b> {modalImage.uploaded_by} ({modalImage.user_role})</div>
              <div><b>Timestamp:</b> {new Date(modalImage.timestamp).toLocaleString()}</div>
              <div><b>OHE Pole Number:</b> {modalImage.ohe_pole_number || `${task.section_id || 'SEC-A01'}/101`}</div>
              <div><b>Verification Status:</b> {modalImage.status}</div>
              <div style={{ gridColumn: '1 / -1' }}><b>SHA-256 Hash:</b> <code style={{ fontSize: 11 }}>{modalImage.file_hash}</code></div>
              {modalImage.notes && <div style={{ gridColumn: '1 / -1', color: 'var(--text-muted)' }}><b>Notes:</b> {modalImage.notes}</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="button" className="btn-secondary" onClick={() => setModalImage(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CONTRACTOR DASHBOARD VIEW
// ============================================================================
function ContractorDashboardView({ tasks = [], onRefresh, user }) {
  const [selectedTask, setSelectedTask] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [executionSummary, setExecutionSummary] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('Track Defect Rectification Certificate attached. Inspection photos verified.');
  const [submitting, setSubmitting] = useState(false);

  const handleStartWork = async (taskId) => {
    try {
      await api.updateWorkStatus(taskId, { status: 'IN_PROGRESS', work_progress: 10, contractor_id: user?.username || 'maint' });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to start work.');
    }
  };

  const handlePauseWork = async (taskId, currentStatus) => {
    try {
      const nextStatus = currentStatus === 'PAUSED' ? 'IN_PROGRESS' : 'PAUSED';
      await api.updateWorkStatus(taskId, { status: nextStatus });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to toggle pause status.');
    }
  };

  const handleUpdateProgress = async (taskId, progress) => {
    try {
      await api.updateWorkStatus(taskId, { work_progress: progress });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to update progress.');
    }
  };

  const openSubmitModal = (t) => {
    setSelectedTask(t);
    setExecutionSummary(`Work completed for task ${t.task_id} on asset ${t.asset_id} under section ${t.section_id}. All defect parameters within engineering tolerance.`);
    setDelayReason(t.delay_reason || '');
    setShowSubmitModal(true);
  };

  const handleSubmitForApproval = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    setSubmitting(true);
    try {
      await api.submitTaskForApproval(selectedTask.task_id, {
        execution_summary: executionSummary,
        delay_reason: delayReason,
        contractor_id: user?.username || 'maint',
        completion_evidence: evidenceNote
      });
      setShowSubmitModal(false);
      if (onRefresh) onRefresh();
      alert(`Task ${selectedTask.task_id} submitted for Control Officer review & approval.`);
    } catch (err) {
      alert(err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-title-wrap">
          <h1>Maintenance Contractor Work Execution Portal</h1>
          <p>Real-time track possession execution, progress tracking, delay reporting, and Control Officer evidence submission.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <div className="card-panel" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Assigned Tasks</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{tasks.length}</div>
        </div>
        <div className="card-panel" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>In Progress</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: 'var(--marg-blue)' }}>
            {tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'PAUSED').length}
          </div>
        </div>
        <div className="card-panel" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Pending Approval</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: '#D97706' }}>
            {tasks.filter(t => t.status === 'SUBMITTED_FOR_APPROVAL').length}
          </div>
        </div>
        <div className="card-panel" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Completed & Verified</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: '#168A5B' }}>
            {tasks.filter(t => t.status === 'COMPLETED').length}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tasks.map(t => (
          <div key={t.task_id} className="card-panel" style={{ borderLeft: t.status === 'COMPLETED' ? '4px solid #168A5B' : t.status === 'SUBMITTED_FOR_APPROVAL' ? '4px solid #D97706' : t.status === 'REWORK_REQUESTED' ? '4px solid #DC2626' : '4px solid var(--marg-blue)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{t.task_id}</h3>
                  <span className="badge badge-info">{t.department}</span>
                  <span className="badge badge-secondary">Asset: {t.asset_id}</span>
                  <span className={`badge ${t.status === 'COMPLETED' ? 'badge-success' : t.status === 'SUBMITTED_FOR_APPROVAL' ? 'badge-warning' : t.status === 'REWORK_REQUESTED' ? 'badge-danger' : 'badge-info'}`}>
                    {t.status}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, marginTop: 6 }}>{t.issue || t.description}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Section: <code>{t.section_id}</code> | Duration: {t.estimated_duration}m | Priority: {t.priority_score}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {t.status === 'PENDING' && (
                  <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => handleStartWork(t.task_id)}>
                    <Play size={13} /> Start Work
                  </button>
                )}

                {(t.status === 'IN_PROGRESS' || t.status === 'PAUSED' || t.status === 'REWORK_REQUESTED') && (
                  <>
                    <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handlePauseWork(t.task_id, t.status)}>
                      {t.status === 'PAUSED' ? 'Resume Work' : 'Pause Work'}
                    </button>
                    <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => openSubmitModal(t)}>
                      <CheckCircle2 size={13} /> Submit for Approval
                    </button>
                  </>
                )}

                {t.status === 'SUBMITTED_FOR_APPROVAL' && (
                  <span style={{ fontSize: 12, color: '#D97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={14} /> Submitted to Control Officer
                  </span>
                )}

                {t.status === 'COMPLETED' && (
                  <span style={{ fontSize: 12, color: '#168A5B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={14} /> Approved & Closed
                  </span>
                )}
              </div>
            </div>

            {t.status === 'REWORK_REQUESTED' && (
              <div style={{ marginTop: 10, padding: 10, background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 6, color: '#991B1B', fontSize: 12 }}>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={15} /> REWORK REQUESTED BY CONTROL OFFICER
                </div>
                <div style={{ marginTop: 4 }}><b>Reason:</b> {t.rejection_reason || 'Rework required on track parameters.'}</div>
                <div style={{ marginTop: 4, fontSize: 11, color: '#7F1D1D' }}>Please execute required fixes, upload new BEFORE/DURING/AFTER evidence photos, and re-submit.</div>
              </div>
            )}

            {(t.status === 'IN_PROGRESS' || t.status === 'PAUSED' || t.status === 'REWORK_REQUESTED' || t.status === 'SUBMITTED_FOR_APPROVAL' || t.status === 'COMPLETED') && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  <span>Work Progress Execution</span>
                  <span>{t.work_progress || (t.status === 'COMPLETED' || t.status === 'SUBMITTED_FOR_APPROVAL' ? 100 : 25)}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-subtle)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${t.work_progress || (t.status === 'COMPLETED' || t.status === 'SUBMITTED_FOR_APPROVAL' ? 100 : 25)}%`,
                    background: t.status === 'COMPLETED' ? '#168A5B' : 'var(--marg-blue)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>

                {(t.status === 'IN_PROGRESS' || t.status === 'PAUSED' || t.status === 'REWORK_REQUESTED') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Quick Progress Update:</span>
                    {[25, 50, 75, 90, 100].map(pct => (
                      <button
                        key={pct}
                        className="btn-secondary"
                        style={{ padding: '2px 8px', fontSize: 11 }}
                        onClick={() => handleUpdateProgress(t.task_id, pct)}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* INTEGRATED WORK EVIDENCE UPLOAD AND AUDIT SECTION */}
            <TaskEvidenceSection
              task={t}
              user={user}
              onRefresh={onRefresh}
              readOnly={t.status === 'COMPLETED' || t.status === 'SUBMITTED_FOR_APPROVAL'}
            />
          </div>
        ))}
      </div>

      {showSubmitModal && selectedTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--panel)', padding: 24, borderRadius: 10, width: 500, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Submit Work Completion ({selectedTask.task_id})</h3>
              <X size={18} cursor="pointer" onClick={() => setShowSubmitModal(false)} />
            </div>

            <form onSubmit={handleSubmitForApproval} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Execution Summary & Work Performed</label>
                <textarea
                  required
                  rows={3}
                  value={executionSummary}
                  onChange={e => setExecutionSummary(e.target.value)}
                  style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Delay / Operational Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 10m delay due to track machine alignment"
                  value={delayReason}
                  onChange={e => setDelayReason(e.target.value)}
                  style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Completion Evidence Certificate / Ref</label>
                <input
                  type="text"
                  value={evidenceNote}
                  onChange={e => setEvidenceNote(e.target.value)}
                  style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowSubmitModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit to Control Officer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// APPROVAL QUEUE VIEW
// ============================================================================
function ApprovalQueueView({ onRefresh, userRole }) {
  const [queueData, setQueueData] = useState({ pending_tasks: [], pending_blocks: [], audit_logs: [] });
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewTaskObj, setReviewTaskObj] = useState(null);
  const [reviewAction, setReviewAction] = useState('APPROVE');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await api.getApprovalQueue();
      if (res.success) {
        setQueueData(res);
      }
    } catch (err) {
      console.error('[Approvals] Error loading queue:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const openReviewModal = (t, action) => {
    setReviewTaskObj(t);
    setReviewAction(action);
    setReviewNotes(action === 'APPROVE' ? 'Work evidence verified. Asset safety clearance granted.' : 'Rework required: photo evidence requires clearer alignment measurements.');
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewTaskObj) return;
    if ((reviewAction === 'REJECT' || reviewAction === 'REWORK') && !reviewNotes.trim()) {
      alert('A reason is required when rejecting or requesting rework.');
      return;
    }
    setSubmitting(true);
    try {
      await api.reviewTask(reviewTaskObj.task_id, reviewAction, reviewNotes);
      setShowReviewModal(false);
      loadQueue();
      if (onRefresh) onRefresh();
      alert(`Task ${reviewTaskObj.task_id} marked as ${reviewAction}.`);
    } catch (err) {
      alert(err.message || 'Review action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveBlockPossession = async (blockId) => {
    try {
      await api.approveBlock(blockId);
      loadQueue();
      if (onRefresh) onRefresh();
      alert(`Block possession ${blockId} authorized by Control Officer.`);
    } catch (err) {
      alert(err.message || 'Failed to approve block possession.');
    }
  };

  const pendingTasks = queueData.pending_tasks || [];
  const pendingBlocks = queueData.pending_blocks || [];
  const auditLogs = queueData.audit_logs || [];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-title-wrap">
          <h1>Control Officer Approval & Review Queue</h1>
          <p>Review contractor work submissions, grant block possession authorizations, and inspect system audit logs.</p>
        </div>
        <button className="btn-secondary" onClick={loadQueue}>
          <RefreshCw size={14} /> Refresh Queue
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card-panel">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} style={{ color: 'var(--marg-blue)' }} />
              Contractor Work Completion Submissions ({pendingTasks.length})
            </h3>

            {pendingTasks.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-subtle)', borderRadius: 8 }}>
                No contractor task submissions awaiting approval.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {pendingTasks.map(t => (
                  <div key={t.task_id} style={{ padding: 14, background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--marg-blue)' }}>{t.task_id}</span>
                          <span className="badge badge-info">{t.department}</span>
                          <span className="badge badge-secondary">Asset: {t.asset_id}</span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 13, marginTop: 4 }}>{t.issue || t.description}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                          Contractor: <b>{t.contractor_id || 'SSE Track'}</b> | Section: <code>{t.section_id}</code> | Submitted: {t.submitted_at ? new Date(t.submitted_at).toLocaleString() : 'Recent'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12, color: '#DC2626' }} onClick={() => openReviewModal(t, 'REJECT')}>
                          Request Rework / Reject
                        </button>
                        <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12, background: '#168A5B' }} onClick={() => openReviewModal(t, 'APPROVE')}>
                          <CheckCircle2 size={13} /> Approve Task
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: 10, padding: 10, background: 'var(--panel)', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)' }}>
                      <div><b>Execution Summary:</b> {t.execution_summary || 'Work executed per standard specs.'}</div>
                      <div><b>Evidence Note:</b> {t.completion_evidence || 'Certificate Attached'}</div>
                      {t.delay_reason && <div style={{ color: '#D97706', marginTop: 2 }}><b>Delay Note:</b> {t.delay_reason}</div>}
                    </div>

                    {/* CONTROL OFFICER EVIDENCE REVIEW PANEL */}
                    <TaskEvidenceSection task={t} userRole={userRole} readOnly={true} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card-panel">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Route size={18} style={{ color: 'var(--marg-blue)' }} />
              Pending Line Possession Authorizations ({pendingBlocks.length})
            </h3>

            {pendingBlocks.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-subtle)', borderRadius: 8 }}>
                All block possessions authorized.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendingBlocks.map(b => (
                  <div key={b.block_id} style={{ padding: 12, background: 'var(--bg-subtle)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{b.block_id} (Section {b.section_id})</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Window: {b.start_time || '02:00'} - {b.end_time || '04:30'}</div>
                    </div>
                    <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleApproveBlockPossession(b.block_id)}>
                      Authorize Possession
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card-panel">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} style={{ color: 'var(--marg-blue)' }} />
            System Action Audit Log
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 540, overflowY: 'auto' }}>
            {auditLogs.map((log, idx) => (
              <div key={log.id || idx} style={{ padding: 10, background: 'var(--bg-subtle)', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span style={{ color: 'var(--marg-blue)' }}>{log.action}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style={{ marginTop: 2, color: 'var(--text-main)' }}>{log.details}</div>
                <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-muted)' }}>
                  User: {log.user_id} ({log.user_role}) • Entity: {log.entity_type} #{log.entity_id}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showReviewModal && reviewTaskObj && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--panel)', padding: 24, borderRadius: 10, width: 480, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                {reviewAction === 'APPROVE' ? 'Approve Task & Release Asset' : 'Reject & Return for Rework'} ({reviewTaskObj.task_id})
              </h3>
              <X size={18} cursor="pointer" onClick={() => setShowReviewModal(false)} />
            </div>

            <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Control Officer Approval Remarks / Notes</label>
                <textarea
                  required
                  rows={3}
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowReviewModal(false)}>Cancel</button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ background: reviewAction === 'APPROVE' ? '#168A5B' : '#DC2626' }}
                  disabled={submitting}
                >
                  {submitting ? 'Processing...' : reviewAction === 'APPROVE' ? 'Confirm Approval & Health Restoration' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 7. BLOCK PLANNER VIEW (CP-SAT Optimization & Explainability)
// ============================================================================
function BlockPlannerView({ blocksData, onRefresh, userRole }) {
  const [running, setRunning] = useState(false);
  const [selectedExplanation, setSelectedExplanation] = useState(null);
  const [trainImpactData, setTrainImpactData] = useState(null);
  const [impactLoading, setImpactLoading] = useState(false);

  const canApprove = ['ADMIN', 'AUTHORITY', 'CONTROL_OFFICER'].includes(userRole);

  const handleRunOptimizer = async () => {
    setRunning(true);
    try {
      await api.runOptimization();
      onRefresh();
    } catch (err) {
      alert(err.message || 'Optimization failed.');
    } finally {
      setRunning(false);
    }
  };

  const handleApprove = async (blockId) => {
    try {
      await api.approveBlock(blockId);
      onRefresh();
      alert(`Block ${blockId} approved by Control Officer.`);
    } catch (err) {
      alert(err.message || 'Failed to approve block.');
    }
  };

  const handleViewTrainImpact = async (block) => {
    setImpactLoading(true);
    try {
      const res = await api.getBlockTrainImpact(block.block_id);
      setTrainImpactData(res);
    } catch (err) {
      alert('Failed to calculate train impacts: ' + err.message);
    } finally {
      setImpactLoading(false);
    }
  };

  const blocks = blocksData?.blocks || [];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-title-wrap">
          <h1>OR-Tools CP-SAT Joint Block Planner</h1>
          <p>Multi-department maintenance grouping, zero train conflict validation, and explainability reasoning.</p>
        </div>
        {canApprove && (
          <button className="btn-primary" onClick={handleRunOptimizer} disabled={running}>
            <Play size={14} className={running ? 'spin' : ''} /> {running ? 'Optimizing CP-SAT...' : 'RUN MARG OPTIMIZATION'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {blocks.map(b => (
          <div key={b.block_id} className="card-panel" style={{ borderLeft: b.block_type === 'JOINT' ? '4px solid #168A5B' : '4px solid var(--marg-blue)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{b.block_id}</h3>
                  <span className={`badge ${b.block_type === 'JOINT' ? 'badge-success' : 'badge-info'}`}>
                    {b.block_type} BLOCK ({b.departments?.join(' + ') || 'Maintenance'})
                  </span>
                  <span className="badge badge-warning">Section {b.section_id}</span>
                </div>
                <div style={{ fontSize: 13, marginTop: 6, color: 'var(--text-muted)' }}>
                  <b>Window:</b> {b.start_time || '02:00'} → {b.end_time || '04:30'} ({((b.end_minute - b.start_minute) || 120) / 60} hours line possession)
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleViewTrainImpact(b)}>
                  <Train size={13} /> Train Impact
                </button>
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setSelectedExplanation(b)}>
                  <Info size={13} /> View Reasoning
                </button>
                {canApprove && (
                  <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleApprove(b.block_id)}>
                    <Check size={13} /> Approve Plan
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, padding: 10, background: 'var(--bg-subtle)', borderRadius: 6 }}>
              <b>Included Maintenance Tasks:</b> {b.task_ids?.join(', ') || 'TSK-1001, TSK-1002'}
            </div>
          </div>
        ))}
      </div>

      {/* Train Impact Engine Analysis Modal */}
      {trainImpactData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--panel)', padding: 24, borderRadius: 10, width: 640, maxHeight: '85vh', overflowY: 'auto', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Train size={18} style={{ color: 'var(--marg-blue)' }} />
                Deterministic Train Impact Analysis ({trainImpactData.block_id})
              </h3>
              <X size={18} cursor="pointer" onClick={() => setTrainImpactData(null)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
              <div style={{ padding: 10, background: '#F0FDF4', borderRadius: 6, border: '1px solid #BBF7D0', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>PASS</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#166534' }}>{trainImpactData.summary?.pass_count || 0}</div>
              </div>
              <div style={{ padding: 10, background: '#FFFBEB', borderRadius: 6, border: '1px solid #FDE68A', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#B45309', fontWeight: 600 }}>HOLD</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#B45309' }}>{trainImpactData.summary?.hold_count || 0}</div>
              </div>
              <div style={{ padding: 10, background: '#F5F3FF', borderRadius: 6, border: '1px solid #DDD6FE', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#6B21A8', fontWeight: 600 }}>DIVERT</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#6B21A8' }}>{trainImpactData.summary?.divert_count || 0}</div>
              </div>
              <div style={{ padding: 10, background: '#FEF2F2', borderRadius: 6, border: '1px solid #FECACA', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#991B1B', fontWeight: 600 }}>RESCHEDULE</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#991B1B' }}>{trainImpactData.summary?.reschedule_count || 0}</div>
              </div>
            </div>

            <div style={{ fontSize: 12, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: 8 }}>Train</th>
                    <th style={{ padding: 8 }}>Schedule</th>
                    <th style={{ padding: 8 }}>Action</th>
                    <th style={{ padding: 8 }}>Delay / Route</th>
                    <th style={{ padding: 8 }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {trainImpactData.impacts?.map((imp, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: 8, fontWeight: 600 }}>{imp.train_number}<div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{imp.train_name}</div></td>
                      <td style={{ padding: 8 }}>{imp.scheduled_time}</td>
                      <td style={{ padding: 8 }}>
                        <span className={`badge ${imp.action === 'PASS' ? 'badge-success' : imp.action === 'DIVERT' ? 'badge-info' : 'badge-warning'}`}>
                          {imp.action}
                        </span>
                      </td>
                      <td style={{ padding: 8 }}>
                        {imp.action === 'DIVERT' ? (
                          <span style={{ fontSize: 11, color: '#6B21A8', fontWeight: 600 }}>{imp.diversion_route} (+{imp.expected_delay_mins}m)</span>
                        ) : imp.action === 'HOLD' ? (
                          <span style={{ fontSize: 11, color: '#B45309', fontWeight: 600 }}>Held {imp.expected_hold_mins}m</span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#166534' }}>0m delay</span>
                        )}
                      </td>
                      <td style={{ padding: 8, fontSize: 11, color: 'var(--text-muted)' }}>{imp.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn-secondary" onClick={() => setTrainImpactData(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {selectedExplanation && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--panel)', padding: 24, borderRadius: 10, width: 480, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>CP-SAT Optimization Reasoning ({selectedExplanation.block_id})</h3>
              <X size={18} cursor="pointer" onClick={() => setSelectedExplanation(null)} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ padding: 10, background: 'var(--bg-subtle)', borderRadius: 6 }}>
                <b>Why this Window?</b>
                <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{selectedExplanation.why_this_window || 'Zero train conflict window on section.'}</div>
              </div>
              <div style={{ padding: 10, background: 'var(--bg-subtle)', borderRadius: 6 }}>
                <b>Why Combined?</b>
                <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{selectedExplanation.why_combined || 'Grouped Engineering + OHE to release maximum line time.'}</div>
              </div>
              <div style={{ padding: 10, background: 'var(--bg-subtle)', borderRadius: 6 }}>
                <b>Train Movements Checked:</b>
                <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>Evaluated {selectedExplanation.trains_checked || 12} timetable services without conflicts.</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn-secondary" onClick={() => setSelectedExplanation(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 8. WEEKLY & MONTHLY PLAN VIEWS
// ============================================================================
function WeeklyPlanView({ userRole }) {
  const [weeklyData, setWeeklyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWeek() {
      try {
        const res = await api.getMonthlyPlan(2026, 9);
        if (res && res.days) {
          setWeeklyData(res);
        }
      } catch (err) {
        console.error('Weekly plan fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadWeek();
  }, []);

  const daysOfWeek = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1>Weekly Maintenance Schedule Plan</h1>
          <p>Generated dynamically from active SQLite database block schedules.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Loading live weekly blocks...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
          {daysOfWeek.map((d, idx) => {
            const dayObj = weeklyData?.days?.[idx + 1] || { day: idx + 1, blocks: [], tasks: [] };
            return (
              <div key={d} className="card-panel" style={{ padding: 12, minHeight: 180 }}>
                <div style={{ fontWeight: 700, fontSize: 13, borderBottom: '1px solid var(--border)', paddingBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{d}</span>
                  <span style={{ opacity: 0.6 }}>Day {dayObj.day}</span>
                </div>
                <div style={{ marginTop: 10, fontSize: 12 }}>
                  {dayObj.blocks && dayObj.blocks.length > 0 ? (
                    dayObj.blocks.map(b => (
                      <div key={b.block_id} style={{ padding: 8, background: 'rgba(16, 185, 129, 0.1)', borderLeft: '3px solid #10b981', borderRadius: 6, marginBottom: 8 }}>
                        <div style={{ fontWeight: 700 }}>{b.block_id}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.section_id} ({b.start_time}–{b.end_time})</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{b.block_type || 'JOINT'} Block</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 11 }}>No major blocks</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MonthlyPlanView({ userRole, onRefresh }) {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(9);
  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedDayData, setSelectedDayData] = useState(null);
  const [selectedBlockImpact, setSelectedBlockImpact] = useState(null);
  const [impactLoading, setImpactLoading] = useState(false);

  const fetchMonthlyData = async (y, m) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getMonthlyPlan(y, m);
      if (res && res.success) {
        setMonthlyData(res);
      } else {
        setError('Failed to load monthly plan data.');
      }
    } catch (err) {
      setError(err.message || 'Error connecting to database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyData(year, month);
  }, [year, month]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleToday = () => {
    setYear(2026);
    setMonth(9);
  };

  const handleApproveBlock = async (blockId) => {
    try {
      await api.approveBlock(blockId);
      await fetchMonthlyData(year, month);
      if (selectedDayData) {
        const res = await api.getMonthlyPlan(year, month);
        if (res && res.days && selectedDayData.day) {
          setSelectedDayData(res.days[selectedDayData.day]);
        }
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to approve block.');
    }
  };

  const handleAnalyzeImpact = async (blockId) => {
    setImpactLoading(true);
    try {
      const res = await api.getBlockTrainImpact(blockId);
      setSelectedBlockImpact(res);
    } catch (err) {
      alert(err.message || 'Failed to calculate train impact.');
    } finally {
      setImpactLoading(false);
    }
  };

  const dayHeaders = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div className="page-title-wrap">
          <h1>Monthly Maintenance Planner</h1>
          <p>Long-range asset availability forecast, block possessions calendar, and train impact integration.</p>
        </div>

        {/* Calendar Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-secondary" onClick={handlePrevMonth} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 13 }}>
            <ChevronLeft size={16} /> Prev
          </button>

          <button className="btn-secondary" onClick={handleToday} style={{ padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>
            Today
          </button>

          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', fontWeight: 600, fontSize: 14 }}
          >
            {monthNames.map((name, idx) => (
              <option key={name} value={idx + 1}>{name}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', fontWeight: 600, fontSize: 14 }}
          >
            {[2025, 2026, 2027, 2028].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button className="btn-secondary" onClick={handleNextMonth} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 13 }}>
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Monthly Summary Statistics Banner */}
      {monthlyData && monthlyData.summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
          <div className="card-panel" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
            <div style={{ padding: 10, borderRadius: 8, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <CalendarDays size={22} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Target Schedule Period</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{monthlyData.month_name} {monthlyData.year}</div>
            </div>
          </div>

          <div className="card-panel" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
            <div style={{ padding: 10, borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <Route size={22} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Scheduled Blocks</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{monthlyData.summary.total_blocks} Possessions</div>
            </div>
          </div>

          <div className="card-panel" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
            <div style={{ padding: 10, borderRadius: 8, background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <Database size={22} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Maintenance Tasks Due</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{monthlyData.summary.total_tasks} Tasks</div>
            </div>
          </div>

          <div className="card-panel" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
            <div style={{ padding: 10, borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Critical Defect Risk</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: monthlyData.summary.total_critical > 0 ? '#ef4444' : 'var(--text)' }}>
                {monthlyData.summary.total_critical} Critical Items
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Calendar Grid Card */}
      <div className="card-panel" style={{ padding: 16 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin-animation" style={{ marginBottom: 10 }} />
            <div>Querying SQLite database for {monthNames[month - 1]} {year} maintenance schedule...</div>
          </div>
        ) : error ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#ef4444' }}>
            <AlertCircle size={24} style={{ marginBottom: 8 }} />
            <div>{error}</div>
            <button className="btn-secondary" onClick={() => fetchMonthlyData(year, month)} style={{ marginTop: 12 }}>Retry</button>
          </div>
        ) : (
          <div>
            {/* Weekday Grid Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8, textAlign: 'center' }}>
              {dayHeaders.map(day => (
                <div key={day} style={{ padding: '8px 0', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-subtle)', borderRadius: 6 }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Monthly Calendar 7-Column Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
              {/* Empty padding cells for start weekday offset */}
              {Array.from({ length: monthlyData?.start_weekday || 0 }).map((_, idx) => (
                <div key={`pad-${idx}`} style={{ background: 'var(--bg-subtle)', opacity: 0.3, minHeight: 110, borderRadius: 8, border: '1px border-dashed var(--border)' }} />
              ))}

              {/* Day Cells */}
              {Object.keys(monthlyData?.days || {}).map(dayKey => {
                const dayObj = monthlyData.days[dayKey];
                const hasBlocks = dayObj.blocks && dayObj.blocks.length > 0;
                const hasTasks = dayObj.tasks && dayObj.tasks.length > 0;
                const hasCritical = dayObj.critical_count > 0;

                return (
                  <div
                    key={`day-${dayObj.day}`}
                    onClick={() => setSelectedDayData(dayObj)}
                    style={{
                      background: hasCritical ? 'rgba(239, 68, 68, 0.04)' : hasBlocks ? 'rgba(16, 185, 129, 0.04)' : 'var(--panel)',
                      border: selectedDayData?.day === dayObj.day ? '2px solid var(--primary)' : hasCritical ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border)',
                      borderRadius: 8,
                      padding: 8,
                      minHeight: 115,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                    className="calendar-day-cell"
                  >
                    <div>
                      {/* Day Header Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                          {dayObj.day}
                        </span>
                        {hasCritical && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: '#ef4444', color: '#fff' }}>
                            {dayObj.critical_count} Crit
                          </span>
                        )}
                      </div>

                      {/* Summary Badges */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                        {hasTasks && (
                          <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', fontWeight: 600 }}>
                            {dayObj.tasks.length} Tasks
                          </span>
                        )}
                        {hasBlocks && (
                          <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.15)', color: '#059669', fontWeight: 600 }}>
                            {dayObj.blocks.length} Blocks
                          </span>
                        )}
                      </div>

                      {/* Block Possession Cards List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {dayObj.blocks.slice(0, 2).map(blk => (
                          <div
                            key={blk.block_id}
                            style={{
                              padding: '4px 6px',
                              borderRadius: 4,
                              background: blk.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                              borderLeft: `3px solid ${blk.status === 'APPROVED' ? '#10b981' : '#f59e0b'}`,
                              fontSize: 10,
                              lineHeight: '1.2'
                            }}
                          >
                            <div style={{ fontWeight: 700, color: 'var(--text)', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{blk.block_id}</span>
                              <span style={{ opacity: 0.8 }}>{blk.section_id}</span>
                            </div>
                            <div style={{ color: 'var(--text-muted)', marginTop: 1 }}>
                              {blk.start_time}–{blk.end_time}
                            </div>
                          </div>
                        ))}
                        {dayObj.blocks.length > 2 && (
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>
                            +{dayObj.blocks.length - 2} more blocks
                          </div>
                        )}
                      </div>
                    </div>

                    {!hasBlocks && !hasTasks && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.5, fontStyle: 'italic', textAlign: 'center', marginTop: 'auto' }}>
                        No possessions
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Day Detail Modal / Drawer */}
      {selectedDayData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card-panel" style={{ width: '100%', maxWidth: 750, maxHeight: '90vh', overflowY: 'auto', padding: 24, borderRadius: 12 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                  Maintenance & Possession Schedule — {selectedDayData.day} {monthNames[month - 1]} {year}
                </h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Date: {selectedDayData.date} • Monitored Corridor Operations
                </p>
              </div>
              <button className="btn-secondary" onClick={() => setSelectedDayData(null)} style={{ padding: 6, borderRadius: '50%' }}>
                <X size={18} />
              </button>
            </div>

            {/* Quick Stats Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, background: 'var(--bg-subtle)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Block Possessions</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>{selectedDayData.blocks.length} Scheduled</div>
              </div>
              <div style={{ padding: 10, background: 'var(--bg-subtle)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Maintenance Tasks Due</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>{selectedDayData.tasks.length} Tasks</div>
              </div>
              <div style={{ padding: 10, background: 'var(--bg-subtle)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Critical Defect Risk</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: selectedDayData.critical_count > 0 ? '#ef4444' : 'var(--text)' }}>
                  {selectedDayData.critical_count} High Risk
                </div>
              </div>
            </div>

            {/* Block Possessions Section */}
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Route size={16} color="#10b981" /> Scheduled Corridor Line Blocks ({selectedDayData.blocks.length})
              </h3>

              {selectedDayData.blocks.length === 0 ? (
                <div style={{ padding: 14, background: 'var(--bg-subtle)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                  No corridor line blocks scheduled for this calendar day.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedDayData.blocks.map(blk => (
                    <div
                      key={blk.block_id}
                      style={{
                        padding: 12,
                        background: 'var(--bg-subtle)',
                        borderRadius: 8,
                        borderLeft: `4px solid ${blk.status === 'APPROVED' ? '#10b981' : '#f59e0b'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 10
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{blk.block_id}</span>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: blk.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: blk.status === 'APPROVED' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                            {blk.status || 'PROPOSED'}
                          </span>
                          <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'var(--border)', color: 'var(--text)' }}>
                            {blk.block_type || 'JOINT'} BLOCK
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                          <b>Section:</b> {blk.section_id} ({blk.section_name || 'Main Corridor'}) • <b>Time:</b> {blk.start_time} – {blk.end_time} ({blk.duration_minutes || 150} mins)
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          <b>Departments:</b> {(blk.departments || []).join(', ')}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        {blk.status !== 'APPROVED' && ['ADMIN', 'AUTHORITY', 'CONTROL_OFFICER'].includes(userRole) && (
                          <button
                            className="btn-primary"
                            onClick={() => handleApproveBlock(blk.block_id)}
                            style={{ padding: '6px 12px', fontSize: 12 }}
                          >
                            Approve Block
                          </button>
                        )}
                        <button
                          className="btn-secondary"
                          onClick={() => handleAnalyzeImpact(blk.block_id)}
                          style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Zap size={14} /> Train Impact
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Maintenance Tasks Section */}
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Database size={16} color="#3b82f6" /> Maintenance Tasks Due ({selectedDayData.tasks.length})
              </h3>

              {selectedDayData.tasks.length === 0 ? (
                <div style={{ padding: 14, background: 'var(--bg-subtle)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                  No maintenance tasks due on this calendar day.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-subtle)', textAlign: 'left' }}>
                        <th style={{ padding: 8 }}>Task ID</th>
                        <th style={{ padding: 8 }}>Asset & Section</th>
                        <th style={{ padding: 8 }}>Department</th>
                        <th style={{ padding: 8 }}>Issue / Description</th>
                        <th style={{ padding: 8 }}>Priority</th>
                        <th style={{ padding: 8 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDayData.tasks.map(tsk => (
                        <tr key={tsk.task_id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: 8, fontWeight: 700 }}>{tsk.task_id}</td>
                          <td style={{ padding: 8 }}>
                            <div><b>{tsk.asset_id}</b></div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tsk.section_id}</div>
                          </td>
                          <td style={{ padding: 8 }}>{tsk.department}</td>
                          <td style={{ padding: 8, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {tsk.issue || tsk.description}
                          </td>
                          <td style={{ padding: 8 }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              background: tsk.priority === 'CRITICAL' ? '#ef4444' : tsk.priority === 'HIGH' ? '#f59e0b' : '#3b82f6',
                              color: '#fff'
                            }}>
                              {tsk.priority || 'MEDIUM'}
                            </span>
                          </td>
                          <td style={{ padding: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: tsk.status === 'COMPLETED' ? '#10b981' : 'var(--text)' }}>
                              {tsk.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn-secondary" onClick={() => setSelectedDayData(null)}>Close Window</button>
            </div>
          </div>
        </div>
      )}

      {/* Train Impact Analysis Sub-Modal */}
      {selectedBlockImpact && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card-panel" style={{ width: '100%', maxWidth: 700, maxHeight: '85vh', overflowY: 'auto', padding: 24, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  Deterministic Train Impact Analysis — {selectedBlockImpact.block_id}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Section: {selectedBlockImpact.section_id} • Time Window: {selectedBlockImpact.start_minute}m – {selectedBlockImpact.end_minute}m
                </p>
              </div>
              <button className="btn-secondary" onClick={() => setSelectedBlockImpact(null)} style={{ padding: 6, borderRadius: '50%' }}>
                <X size={18} />
              </button>
            </div>

            {/* Impact Counters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
              <div style={{ padding: 10, background: 'rgba(16, 185, 129, 0.1)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>Un-impacted</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>{selectedBlockImpact.summary?.pass_count || 0} PASS</div>
              </div>
              <div style={{ padding: 10, background: 'rgba(245, 158, 11, 0.1)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>Loop Line Hold</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f59e0b' }}>{selectedBlockImpact.summary?.hold_count || 0} HOLD</div>
              </div>
              <div style={{ padding: 10, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 600 }}>Alt Path Divert</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>{selectedBlockImpact.summary?.divert_count || 0} DIVERT</div>
              </div>
              <div style={{ padding: 10, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>Timetable Shift</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>{selectedBlockImpact.summary?.reschedule_count || 0} SHIFT</div>
              </div>
            </div>

            {/* Train List */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)', textAlign: 'left' }}>
                    <th style={{ padding: 8 }}>Train No. & Name</th>
                    <th style={{ padding: 8 }}>Type</th>
                    <th style={{ padding: 8 }}>Action</th>
                    <th style={{ padding: 8 }}>Operational Details</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedBlockImpact.impacts || []).map((imp, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: 8 }}>
                        <b>{imp.train_number}</b> - {imp.train_name}
                      </td>
                      <td style={{ padding: 8 }}>{imp.train_type}</td>
                      <td style={{ padding: 8 }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          background: imp.action === 'PASS' ? '#10b981' : imp.action === 'HOLD' ? '#f59e0b' : imp.action === 'DIVERT' ? '#3b82f6' : '#ef4444',
                          color: '#fff'
                        }}>
                          {imp.action}
                        </span>
                      </td>
                      <td style={{ padding: 8, color: 'var(--text-muted)' }}>
                        {imp.details || imp.reasoning || 'No conflict with maintenance possession.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn-secondary" onClick={() => setSelectedBlockImpact(null)}>Close Impact Analysis</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 9. WHAT-IF SCENARIO SIMULATOR VIEW
// ============================================================================
function ScenarioSimulatorView({ onRefresh, userRole }) {
  const [delay, setDelay] = useState(30);
  const [closedSection, setClosedSection] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState(null);

  const canApply = ['ADMIN', 'AUTHORITY', 'CONTROL_OFFICER'].includes(userRole);

  const handleRunSimulation = async () => {
    setSimulating(true);
    try {
      const res = await api.runScenario({ delay_minutes: delay, closed_section: closedSection });
      setResult(res);
    } catch (err) {
      alert(err.message || 'Simulation failed.');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1>MARG What-If Planning & Scenario Simulator</h1>
          <p>Test operational changes and train delays WITHOUT modifying the approved production plan.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        {/* Controls */}
        <div className="card-panel">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Scenario Parameters</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Simulated Train Delay (Minutes)</label>
              <input type="number" value={delay} onChange={e => setDelay(e.target.value)} style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }} />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Section Closure / Speed Restriction</label>
              <select value={closedSection} onChange={e => setClosedSection(e.target.value)} style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }}>
                <option value="">None (All Sections Active)</option>
                <option value="SEC-A01">SEC-A01 (NDLS - UMB)</option>
                <option value="SEC-B01">SEC-B01 (CNB - LKO)</option>
              </select>
            </div>

            <button className="btn-primary" onClick={handleRunSimulation} disabled={simulating} style={{ width: '100%', marginTop: 10 }}>
              <Zap size={14} /> {simulating ? 'Simulating...' : 'Run What-If Optimization'}
            </button>
          </div>
        </div>

        {/* Results Side-by-Side */}
        <div className="card-panel">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Baseline vs Scenario Comparison</h3>

          {result ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div style={{ padding: 14, background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-muted)' }}>BASELINE PLAN</div>
                  <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{result.baseline.block_hours}h</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{result.baseline.blocks} Blocks | {result.baseline.conflicts} Conflict</div>
                </div>

                <div style={{ padding: 14, background: 'var(--marg-blue-light)', borderRadius: 8, border: '1px solid var(--marg-blue-border)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--marg-blue)' }}>WHAT-IF SCENARIO</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--marg-blue)', marginTop: 4 }}>{result.scenario.block_hours}h</div>
                  <div style={{ fontSize: 12, color: 'var(--marg-blue)' }}>{result.scenario.blocks} Blocks | {result.scenario.conflicts} Conflicts</div>
                </div>
              </div>

              <div style={{ padding: 12, background: 'var(--bg-subtle)', borderRadius: 8, fontSize: 12 }}>
                <b>Simulation Explanation:</b>
                <ul style={{ paddingLeft: 18, marginTop: 6, color: 'var(--text-muted)' }}>
                  {result.explanation?.map((exp, idx) => <li key={idx}>{exp}</li>)}
                </ul>
              </div>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Adjust parameters on the left and click "Run What-If Optimization" to compare scenarios.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 10. DATA IMPORT VIEW
// ============================================================================
// ============================================================================
// 10. DATA IMPORT VIEW
// ============================================================================
function DataImportView({ onSync }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importedTrainsList, setImportedTrainsList] = useState([]);
  const [loadingTrains, setLoadingTrains] = useState(false);

  const fetchTrains = async () => {
    setLoadingTrains(true);
    try {
      const res = await api.getTrains();
      const list = Array.isArray(res) ? res : (res.data || []);
      setImportedTrainsList(list);
    } catch (err) {
      console.error('Error fetching imported trains:', err);
    } finally {
      setLoadingTrains(false);
    }
  };

  useEffect(() => {
    fetchTrains();
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    try {
      const res = await api.uploadImportFile(selectedFile);
      setImportResult(res);
      await fetchTrains();
      if (onSync) onSync();
    } catch (err) {
      alert(err.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1>Data Management & Timetable Import Portal</h1>
          <p>Batch import CSV/JSON timetable datasets directly into SQLite database with atomic transactions.</p>
        </div>
      </div>

      <div className="card-panel">
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Manual Timetable File Import</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input type="file" accept=".csv, .json" onChange={handleFileSelect} style={{ fontSize: 13 }} />
          <button className="btn-primary" onClick={handleImport} disabled={!selectedFile || importing}>
            <Upload size={14} /> {importing ? 'Importing...' : 'Upload File'}
          </button>
        </div>

        {importResult && (
          <div style={{ marginTop: 16, padding: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, color: '#166534', fontSize: 13 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
              ✓ Import Complete: {importResult.message}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12 }}>
              <span><b>Imported Rows:</b> {importResult.imported ?? 0}</span>
              <span><b>Skipped:</b> {importResult.skipped ?? 0}</span>
              <span><b>Errors:</b> {importResult.errors ?? 0}</span>
              <span><b>Total Processed:</b> {importResult.total ?? 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* LIVE IMPORTED TRAINS DATASET DISPLAY */}
      <div className="card-panel" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Train size={18} style={{ color: 'var(--marg-blue)' }} />
            Active Imported Trains in SQLite Database ({importedTrainsList.length})
          </h3>
          <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={fetchTrains}>
            <RefreshCw size={12} /> Refresh List
          </button>
        </div>

        {loadingTrains ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading train records...</div>
        ) : importedTrainsList.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-subtle)', borderRadius: 8 }}>
            No train records imported yet. Upload a timetable CSV above.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Train No</th>
                  <th>Train Name</th>
                  <th>Source</th>
                  <th>Destination</th>
                  <th>Speed (km/h)</th>
                  <th>Occupancy Rate</th>
                  <th>Priority Tier</th>
                </tr>
              </thead>
              <tbody>
                {importedTrainsList.slice(0, 50).map(t => (
                  <tr key={t.train_number || t.train_id}>
                    <td><b>{t.train_number || t.train_id}</b></td>
                    <td>{t.train_name}</td>
                    <td>{t.origin || t.source || 'NDLS'}</td>
                    <td>{t.destination || 'HWH'}</td>
                    <td>{t.max_speed || 110} km/h</td>
                    <td>
                      <span className={`badge ${t.occupancy_rate > 0.8 ? 'badge-danger' : t.occupancy_rate > 0.5 ? 'badge-warning' : 'badge-success'}`}>
                        {Math.round((t.occupancy_rate || 0.7) * 100)}%
                      </span>
                    </td>
                    <td><span className="badge badge-info">{t.priority_tier || 'FREIGHT'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {importedTrainsList.length > 50 && (
              <div style={{ marginTop: 10, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                Showing first 50 of {importedTrainsList.length} total imported trains stored in SQLite database.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 11. MARG GROQ ASSISTANT FULL VIEW & WIDGET
// ============================================================================
function AssistantFullView({ navigate }) {
  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1>MARG Groq AI Assistant</h1>
          <p>Context-aware operational copilot with backend tool execution and navigation capabilities.</p>
        </div>
      </div>
      <div className="card-panel" style={{ height: 520 }}>
        <FloatingAssistantWidget inline navigate={navigate} />
      </div>
    </div>
  );
}

function FloatingAssistantWidget({ isOpen, onToggle, inline, navigate }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am MARG Assistant powered by Groq AI. Ask me to **"Show critical assets"**, **"List pending maintenance"**, or **"Run block optimization"**.' }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setSending(true);

    const contextPayload = {
      currentPage: window.location.hash.replace('#', '') || '/dashboard',
      userRole: 'AUTHORITY',
      currentTime: new Date().toLocaleTimeString()
    };

    try {
      const res = await api.sendCopilotMessage(userMsg, messages, contextPayload);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: res.answer || 'Query processed.',
        actions: res.actions_taken,
        nav: res.navigation_command
      }]);

      if (res.navigation_command && navigate) {
        setTimeout(() => navigate(res.navigation_command), 1000);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Encountered an issue processing query.' }]);
    } finally {
      setSending(false);
    }
  };

  if (!inline && !isOpen) {
    return (
      <button
        onClick={onToggle}
        style={{
          position: 'fixed', bottom: 24, right: 24, width: 54, height: 54, borderRadius: '50%',
          background: 'var(--marg-blue)', color: '#FFF', border: 'none', boxShadow: 'var(--shadow-lg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, cursor: 'pointer'
        }}
        title="Open MARG AI Assistant"
      >
        <MessageSquare size={24} />
      </button>
    );
  }

  return (
    <div style={inline ? { height: '100%', display: 'flex', flexDirection: 'column' } : {
      position: 'fixed', bottom: 24, right: 24, width: 380, height: 480, background: 'var(--panel)',
      borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
      zIndex: 300, display: 'flex', flexDirection: 'column', overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', background: 'var(--marg-blue)', color: '#FFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={16} /> MARG Assistant (Groq AI)
        </div>
        {!inline && <X size={18} cursor="pointer" onClick={onToggle} />}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
        {messages.map((m, idx) => (
          <div key={idx} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
            <div style={{
              padding: '10px 14px', borderRadius: 10,
              background: m.role === 'user' ? 'var(--marg-blue)' : 'var(--bg-subtle)',
              color: m.role === 'user' ? '#FFF' : 'var(--text-main)',
              whiteSpace: 'pre-wrap'
            }}>
              {m.text}
            </div>

            {m.actions && m.actions.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  ⚡ Agent Activity Trace
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {m.actions.map((act, aIdx) => (
                    <span key={aIdx} style={{
                      fontSize: 10, padding: '2px 6px', background: 'var(--marg-blue-light)', color: 'var(--marg-blue)',
                      border: '1px solid var(--marg-blue-border)', borderRadius: 4, fontFamily: 'monospace'
                    }}>
                      🔧 {act}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {sending && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Groq Assistant is thinking...</div>}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{ padding: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Ask MARG Assistant..."
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }}
        />
        <button type="submit" className="btn-primary" disabled={sending} style={{ padding: '8px 14px' }}>Send</button>
      </form>
    </div>
  );
}

// ============================================================================
// 12. ANALYTICS VIEW
// ============================================================================
function AnalyticsView({ analyticsData }) {
  const deptData = analyticsData?.departments || [];
  const trendData = analyticsData?.weekly_trend || [];

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1>Calculated Analytics & Department Workload</h1>
          <p>Real calculated statistics from SQLite maintenance backlog and CP-SAT optimization runs.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card-panel">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Department Maintenance Duration (Hours)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={deptData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="department" stroke="var(--text-muted)" fontSize={11} />
              <YAxis stroke="var(--text-muted)" fontSize={11} />
              <Tooltip />
              <Bar dataKey="hours" fill="var(--marg-blue)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-panel">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Weekly Asset Availability Trend (%)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={11} />
              <YAxis domain={[70, 100]} stroke="var(--text-muted)" fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="availability" stroke="#168A5B" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
