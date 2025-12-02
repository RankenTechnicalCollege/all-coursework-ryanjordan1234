import React, { useState, useEffect } from 'react';
import { AlertCircle, Bug, Users, TestTube, MessageSquare, LogOut, Menu, X, Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';

// API Base URL - adjust as needed
const API_URL = 'http://localhost:5000/api';

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_URL}/users/me`, {
        credentials: 'include'
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/sign-out`, {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
      setCurrentView('login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Navigation user={user} onLogout={handleLogout} currentView={currentView} setCurrentView={setCurrentView} />
      <main className="container mx-auto px-4 py-8">
        {currentView === 'dashboard' && <Dashboard user={user} />}
        {currentView === 'bugs' && <BugsPage user={user} />}
        {currentView === 'users' && <UsersPage user={user} />}
        {currentView === 'profile' && <ProfilePage user={user} onUpdate={setUser} />}
      </main>
    </div>
  );
}

// Navigation Component
function Navigation({ user, onLogout, currentView, setCurrentView }) {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Bug },
    { id: 'bugs', label: 'Bugs', icon: AlertCircle },
  ];

  if (user.role) {
    navItems.push({ id: 'profile', label: 'Profile', icon: Users });
  }

  if (user.role === 'Technical Manager') {
    navItems.push({ id: 'users', label: 'Manage Users', icon: Users });
  }

  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Bug className="h-8 w-8 text-blue-500" />
            <span className="ml-2 text-xl font-bold">Issue Tracker</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === item.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <item.icon className="inline h-4 w-4 mr-1" />
                {item.label}
              </button>
            ))}
            <div className="ml-4 flex items-center space-x-4">
              <span className="text-sm text-gray-300">
                {user.fullName} {user.role && `(${user.role})`}
              </span>
              <button
                onClick={onLogout}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <LogOut className="inline h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-300 hover:text-white"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  setIsOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                  currentView === item.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <item.icon className="inline h-4 w-4 mr-2" />
                {item.label}
              </button>
            ))}
            <button
              onClick={onLogout}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white mt-2"
            >
              <LogOut className="inline h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

// Auth Page Component (Login/Register)
function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    givenName: '',
    familyName: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/sign-in/email' : '/auth/sign-up/email';
      
      // For LOGIN, only send email and password
      // For SIGN-UP, send all fields
      const requestData = isLogin 
        ? { 
            email: formData.email, 
            password: formData.password 
          }
        : { 
            email: formData.email,
            password: formData.password,
            fullName: formData.fullName,
            givenName: formData.givenName,
            familyName: formData.familyName
          };
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (response.ok) {
        // Fetch full user data
        const userResponse = await fetch(`${API_URL}/users/me`, {
          credentials: 'include'
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          onLogin(userData);
        }
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Bug className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white">Issue Tracker</h2>
          <p className="text-gray-400 mt-2">
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          {error && (
            <div className="mb-4 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Given Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.givenName}
                    onChange={(e) => setFormData({ ...formData, givenName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Family Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.familyName}
                    onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dashboard Component
function Dashboard({ user }) {
  const [stats, setStats] = useState({
    totalBugs: 0,
    myBugs: 0,
    assignedToMe: 0,
    openBugs: 0
  });
  const [recentBugs, setRecentBugs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch(`${API_URL}/bugs?pageSize=5&sortBy=newest`, {
        credentials: 'include'
      });
      if (response.ok) {
        const bugs = await response.json();
        setRecentBugs(bugs);
        
        // Calculate stats
        setStats({
          totalBugs: bugs.length,
          myBugs: bugs.filter(b => b.author === user.email).length,
          assignedToMe: bugs.filter(b => b.assignedTo === user.email).length,
          openBugs: bugs.filter(b => !b.closed).length
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user.givenName}!</h1>
        <p className="text-gray-400">
          {user.role ? `Role: ${user.role}` : 'No role assigned yet - contact an administrator'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Bugs" value={stats.totalBugs} icon={Bug} color="blue" />
        <StatCard title="My Bugs" value={stats.myBugs} icon={AlertCircle} color="purple" />
        <StatCard title="Assigned to Me" value={stats.assignedToMe} icon={Users} color="green" />
        <StatCard title="Open Bugs" value={stats.openBugs} icon={AlertCircle} color="orange" />
      </div>

      {/* Recent Bugs */}
      <div className="bg-gray-800 rounded-lg shadow-xl p-6">
        <h2 className="text-xl font-bold mb-4">Recent Bugs</h2>
        {recentBugs.length === 0 ? (
          <p className="text-gray-400">No bugs found</p>
        ) : (
          <div className="space-y-3">
            {recentBugs.map(bug => (
              <div key={bug._id} className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-white">{bug.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{bug.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>By: {bug.author}</span>
                      <span>Assigned: {bug.assignedTo}</span>
                      <span className={`px-2 py-1 rounded ${
                        bug.classification === 'approved' ? 'bg-green-900 text-green-200' :
                        bug.classification === 'unapproved' ? 'bg-red-900 text-red-200' :
                        'bg-gray-600 text-gray-200'
                      }`}>
                        {bug.classification}
                      </span>
                    </div>
                  </div>
                  {bug.closed ? (
                    <CheckCircle className="h-5 w-5 text-green-500 ml-4" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-500 ml-4" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-900/50 text-blue-400',
    purple: 'bg-purple-900/50 text-purple-400',
    green: 'bg-green-900/50 text-green-400',
    orange: 'bg-orange-900/50 text-orange-400'
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

// Bugs Page Component
function BugsPage({ user }) {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBug, setSelectedBug] = useState(null);
  const [filters, setFilters] = useState({
    keywords: '',
    classification: '',
    closed: ''
  });

  useEffect(() => {
    loadBugs();
  }, []);

  const loadBugs = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.keywords) params.append('keywords', filters.keywords);
      if (filters.classification) params.append('classification', filters.classification);
      if (filters.closed) params.append('closed', filters.closed);
      
      const response = await fetch(`${API_URL}/bugs?${params}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setBugs(data);
      }
    } catch (error) {
      console.error('Failed to load bugs:', error);
    } finally {
      setLoading(false);
    }
  };

  const canCreateBug = user.role !== null;

  if (loading) {
    return <div className="text-center py-8">Loading bugs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Bugs</h1>
        {canCreateBug && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Bug
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search keywords..."
            value={filters.keywords}
            onChange={(e) => setFilters({ ...filters, keywords: e.target.value })}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
          />
          <select
            value={filters.classification}
            onChange={(e) => setFilters({ ...filters, classification: e.target.value })}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
          >
            <option value="">All Classifications</option>
            <option value="unclassified">Unclassified</option>
            <option value="approved">Approved</option>
            <option value="unapproved">Unapproved</option>
            <option value="duplicate">Duplicate</option>
          </select>
          <select
            value={filters.closed}
            onChange={(e) => setFilters({ ...filters, closed: e.target.value })}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
          >
            <option value="">All Status</option>
            <option value="false">Open</option>
            <option value="true">Closed</option>
          </select>
        </div>
        <button
          onClick={loadBugs}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Apply Filters
        </button>
      </div>

      {/* Bugs List */}
      <div className="space-y-4">
        {bugs.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
            No bugs found
          </div>
        ) : (
          bugs.map(bug => (
            <BugCard
              key={bug._id}
              bug={bug}
              user={user}
              onSelect={() => setSelectedBug(bug)}
              onUpdate={loadBugs}
            />
          ))
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateBugModal
          user={user}
          onClose={() => setShowCreateModal(false)}
          onCreate={loadBugs}
        />
      )}
      {selectedBug && (
        <BugDetailModal
          bug={selectedBug}
          user={user}
          onClose={() => setSelectedBug(null)}
          onUpdate={loadBugs}
        />
      )}
    </div>
  );
}

function BugCard({ bug, user, onSelect, onUpdate }) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer" onClick={onSelect}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-medium text-white">{bug.title}</h3>
            <span className={`px-2 py-1 text-xs rounded ${
              bug.classification === 'approved' ? 'bg-green-900 text-green-200' :
              bug.classification === 'unapproved' ? 'bg-red-900 text-red-200' :
              bug.classification === 'duplicate' ? 'bg-yellow-900 text-yellow-200' :
              'bg-gray-600 text-gray-200'
            }`}>
              {bug.classification}
            </span>
            {bug.closed && (
              <span className="px-2 py-1 text-xs rounded bg-gray-600 text-gray-200">
                Closed
              </span>
            )}
          </div>
          <p className="text-gray-400 mt-2">{bug.description}</p>
          <div className="flex items-center space-x-6 mt-3 text-sm text-gray-500">
            <span>Author: {bug.author}</span>
            <span>Assigned: {bug.assignedTo}</span>
            <span>Created: {new Date(bug.createdOn).toLocaleDateString()}</span>
          </div>
        </div>
        <AlertCircle className={`h-6 w-6 ${bug.closed ? 'text-gray-500' : 'text-orange-500'}`} />
      </div>
    </div>
  );
}

function CreateBugModal({ user, onClose, onCreate }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    stepsToReproduce: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/bugs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onCreate();
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create bug');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Create New Bug</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Steps to Reproduce
            </label>
            <textarea
              rows={4}
              value={formData.stepsToReproduce}
              onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Bug'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BugDetailModal({ bug, user, onClose, onUpdate }) {
  const [comments, setComments] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  
  useEffect(() => {
    loadComments();
    loadTestCases();
  }, [bug._id]);

  const loadComments = async () => {
    try {
      const response = await fetch(`${API_URL}/bugs/${bug._id}/comments`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const loadTestCases = async () => {
    try {
      const response = await fetch(`${API_URL}/bugs/${bug._id}/tests`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setTestCases(data);
      }
    } catch (error) {
      console.error('Failed to load test cases:', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`${API_URL}/bugs/${bug._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          author: user.email,
          comment: newComment
        })
      });

      if (response.ok) {
        setNewComment('');
        loadComments();
      }} catch (error) {
  console.error('Failed to add comment:', error);
}
};
return (
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
<div className="bg-gray-800 rounded-lg max-w-4xl w-full p-6 my-8">
<div className="flex items-center justify-between mb-6">
<h2 className="text-2xl font-bold">{bug.title}</h2>
<button onClick={onClose} className="text-gray-400 hover:text-white">
<X className="h-6 w-6" />
</button>
</div>
    {/* Tabs */}
    <div className="flex space-x-4 border-b border-gray-700 mb-6">
      <button
        onClick={() => setActiveTab('details')}
        className={`pb-2 px-4 ${activeTab === 'details' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400'}`}
      >
        Details
      </button>
      <button
        onClick={() => setActiveTab('comments')}
        className={`pb-2 px-4 ${activeTab === 'comments' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400'}`}
      >
        Comments ({comments.length})
      </button>
      <button
        onClick={() => setActiveTab('tests')}
        className={`pb-2 px-4 ${activeTab === 'tests' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400'}`}
      >
        Test Cases ({testCases.length})
      </button>
    </div>

    {/* Tab Content */}
    {activeTab === 'details' && (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
          <p className="text-white">{bug.description}</p>
        </div>
        {bug.stepsToReproduce && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Steps to Reproduce</label>
            <p className="text-white whitespace-pre-wrap">{bug.stepsToReproduce}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Author</label>
            <p className="text-white">{bug.author}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Assigned To</label>
            <p className="text-white">{bug.assignedTo}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Classification</label>
            <p className="text-white capitalize">{bug.classification}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
            <p className="text-white">{bug.closed ? 'Closed' : 'Open'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Created</label>
            <p className="text-white">{new Date(bug.createdOn).toLocaleString()}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Last Updated</label>
            <p className="text-white">{new Date(bug.lastUpdatedOn).toLocaleString()}</p>
          </div>
        </div>
      </div>
    )}

    {activeTab === 'comments' && (
      <div className="space-y-4">
        <form onSubmit={handleAddComment} className="flex space-x-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            Post
          </button>
        </form>
        <div className="space-y-3">
          {comments.map(comment => (
            <div key={comment._id} className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white">{comment.author}</span>
                <span className="text-sm text-gray-400">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-gray-300">{comment.comment}</p>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-center text-gray-400 py-4">No comments yet</p>
          )}
        </div>
      </div>
    )}

    {activeTab === 'tests' && (
      <div className="space-y-3">
        {testCases.map(test => (
          <div key={test._id} className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-white">{test.testName}</h4>
                <p className="text-sm text-gray-400 mt-1">{test.description}</p>
              </div>
              <span className={`px-3 py-1 rounded text-sm ${
                test.status === 'passed' ? 'bg-green-900 text-green-200' :
                test.status === 'failed' ? 'bg-red-900 text-red-200' :
                'bg-yellow-900 text-yellow-200'
              }`}>
                {test.status}
              </span>
            </div>
          </div>
        ))}
        {testCases.length === 0 && (
          <p className="text-center text-gray-400 py-4">No test cases yet</p>
        )}
      </div>
    )}
  </div>
</div>
);
}
// Users Management Page (Technical Managers only)
function UsersPage({ user }) {
const [users, setUsers] = useState([]);
const [loading, setLoading] = useState(true);
const [editingUser, setEditingUser] = useState(null);
useEffect(() => {
loadUsers();
}, []);
const loadUsers = async () => {
try {
const response = await fetch(`${API_URL}/users?pageSize=100`, {
  credentials: 'include'
});
if (response.ok) {
const data = await response.json();
setUsers(data);
}
} catch (error) {
console.error('Failed to load users:', error);
} finally {
setLoading(false);
}
};
if (loading) {
return <div className="text-center py-8">Loading users...</div>;
}
return (
<div className="space-y-6">
<h1 className="text-3xl font-bold">Manage Users</h1>
  <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
    <table className="w-full">
      <thead className="bg-gray-700">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Role</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-700">
        {users.map(u => (
          <tr key={u._id}>
            <td className="px-6 py-4 whitespace-nowrap text-white">{u.fullName}</td>
            <td className="px-6 py-4 whitespace-nowrap text-gray-300">{u.email}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`px-2 py-1 text-xs rounded ${
                u.role ? 'bg-blue-900 text-blue-200' : 'bg-gray-600 text-gray-200'
              }`}>
                {u.role || 'No role'}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <button
                onClick={() => setEditingUser(u)}
                className="text-blue-400 hover:text-blue-300"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  {editingUser && (
    <EditUserModal
      user={editingUser}
      onClose={() => setEditingUser(null)}
      onUpdate={loadUsers}
    />
  )}
</div>
);
}
function EditUserModal({ user: targetUser, onClose, onUpdate }) {
const [role, setRole] = useState(targetUser.role || '');
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
const roles = ['Developer', 'Quality Analyst', 'Business Analyst', 'Product Manager', 'Technical Manager'];
const handleSubmit = async (e) => {
e.preventDefault();
setLoading(true);
setError('');
try {
  const response = await fetch(`${API_URL}/users/${targetUser._id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ role: role || null })
  });

  if (response.ok) {
    onUpdate();
    onClose();
  } else {
    const data = await response.json();
    setError(data.error || 'Failed to update user');
  }
} catch (error) {
  setError('Network error');
} finally {
  setLoading(false);
}
};
return (
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
<div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
<div className="flex items-center justify-between mb-4">
<h2 className="text-2xl font-bold">Edit User Role</h2>
<button onClick={onClose} className="text-gray-400 hover:text-white">
<X className="h-6 w-6" />
</button>
</div>
    {error && (
      <div className="mb-4 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
        {error}
      </div>
    )}

    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">User</label>
        <p className="text-white">{targetUser.fullName} ({targetUser.email})</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
        >
          <option value="">No role</option>
          {roles.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  </div>
</div>
);
}
// Profile Page
function ProfilePage({ user, onUpdate }) {
const [formData, setFormData] = useState({
fullName: user.fullName,
givenName: user.givenName,
familyName: user.familyName,
password: ''
});
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
const [success, setSuccess] = useState('');
const handleSubmit = async (e) => {
e.preventDefault();
setLoading(true);
setError('');
setSuccess('');
try {
  const updateData = { ...formData };
  if (!updateData.password) {
    delete updateData.password;
  }

  const response = await fetch(`${API_URL}/users/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updateData)
  });

  if (response.ok) {
    setSuccess('Profile updated successfully!');
    // Refresh user data
    const userResponse = await fetch(`${API_URL}/users/me`, {
      credentials: 'include'
    });
    if (userResponse.ok) {
      const userData = await userResponse.json();
      onUpdate(userData);
    }
  } else {
    const data = await response.json();
    setError(data.error || 'Failed to update profile');
  }
} catch (error) {
  setError('Network error');
} finally {
  setLoading(false);
}
};
return (
<div className="max-w-2xl mx-auto">
<h1 className="text-3xl font-bold mb-6">My Profile</h1>
  <div className="bg-gray-800 rounded-lg shadow-xl p-6">
    {error && (
      <div className="mb-4 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
        {error}
      </div>
    )}
    {success && (
      <div className="mb-4 bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded">
        {success}
      </div>
    )}

    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
        <input
          type="email"
          value={user.email}
          disabled
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
        <input
          type="text"
          value={user.role || 'No role assigned'}
          disabled
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Given Name</label>
        <input
          type="text"
          value={formData.givenName}
          onChange={(e) => setFormData({ ...formData, givenName: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Family Name</label>
        <input
          type="text"
          value={formData.familyName}
          onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
        <input
          type="text"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          New Password (leave blank to keep current)
        </label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          minLength={6}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
      >
        {loading ? 'Updating...' : 'Update Profile'}
      </button>
    </form>
  </div>
</div>
);
}
export default App;