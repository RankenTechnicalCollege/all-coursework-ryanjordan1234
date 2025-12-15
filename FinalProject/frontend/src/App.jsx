import { useEffect, useState } from 'react'
import './App.css'
import { AlertCircle, Bug, Users, TestTube, MessageSquare, LogOut, Menu, X, Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

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
    <>
      <Navigation user={user} onLogout={handleLogout} currentView={currentView} setCurrentView={setCurrentView} />
      
      <main className="container mx-auto px-4 py-8" style={{ marginTop: '80px' }}>
        {currentView === 'dashboard' && <Dashboard user={user} />}
        {currentView === 'bugs' && <BugsPage user={user} />}
        {currentView === 'users' && <UsersPage user={user} />}
        {currentView === 'profile' && <ProfilePage user={user} onUpdate={setUser} />}
      </main>
    </>
  );
}

// Navigation Component
function Navigation({ user, onLogout, currentView, setCurrentView }) {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Bug },
    { id: 'bugs', label: 'Bugs', icon: AlertCircle },
    { id: 'profile', label: 'Profile', icon: Users }
  ];

  if (user.role === 'admin') {
    navItems.push({ id: 'users', label: 'Manage Users', icon: Users });
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
      <div className="container">
        <a className="navbar-brand fw-bold" href="#" onClick={() => setCurrentView('dashboard')}>
          <Bug className="d-inline-block me-2" style={{ width: '24px', height: '24px' }} />
          Issue Tracker
        </a>
        <button 
          className="navbar-toggler" 
          type="button" 
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className={`collapse navbar-collapse ${isOpen ? 'show' : ''}`} id="navbarNav">
          <ul className="navbar-nav ms-auto">
            {navItems.map(item => (
              <li className="nav-item" key={item.id}>
                <a 
                  className={`nav-link ${currentView === item.id ? 'active' : ''}`}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentView(item.id);
                    setIsOpen(false);
                  }}
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li className="nav-item">
              <span className="nav-link text-light">
                {user.fullName} {user.role && `(${user.role})`}
              </span>
            </li>
            <li className="nav-item">
              <button 
                className="btn btn-outline-light btn-sm"
                onClick={onLogout}
              >
                <LogOut className="d-inline-block me-1" style={{ width: '16px', height: '16px' }} />
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

// Auth Page Component
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
    <section className="hero-section fade-in">
      <div className="container">
        <div className="row align-items-center min-vh-100">
          <div className="col-lg-6 mx-auto">
            <div className="text-center mb-5">
              <Bug className="mx-auto mb-4" style={{ width: '64px', height: '64px', color: '#0d6efd' }} />
              <h1 className="display-4 fw-bold mb-4">Issue Tracker</h1>
              <p className="lead text-muted">
                {isLogin ? 'Sign in to your account' : 'Create a new account'}
              </p>
            </div>

            <div className="card shadow-lg">
              <div className="card-body p-5">
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {!isLogin && (
                    <>
                      <div className="mb-3">
                        <label className="form-label">Given Name</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={formData.givenName}
                          onChange={(e) => setFormData({ ...formData, givenName: e.target.value })}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Family Name</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={formData.familyName}
                          onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Full Name</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      required
                      minLength={6}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
                  </button>
                </form>

                <div className="text-center mt-4">
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="btn btn-link text-decoration-none"
                  >
                    {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
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
      const response = await fetch(`${API_URL}/bugs?limit=5&sortBy=createdAt`, {
        credentials: 'include'
      });
      if (response.ok) {
        const bugs = await response.json();
        setRecentBugs(bugs);
        
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
    return <div className="text-center py-5"><div className="spinner-border" role="status"></div></div>;
  }

  return (
    <>
      <section className="py-5">
        <div className="container">
          <div className="row mb-5">
            <div className="col">
              <h1 className="display-4 fw-bold">Welcome back, {user.givenName}!</h1>
              <p className="lead text-muted">
                {user.role ? `Role: ${user.role}` : 'No role assigned yet - contact an administrator'}
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="row g-4 mb-5">
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <Bug className="mx-auto mb-3" style={{ width: '48px', height: '48px', color: '#0d6efd' }} />
                  <h3 className="display-6 fw-bold">{stats.totalBugs}</h3>
                  <p className="text-muted mb-0">Total Bugs</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <AlertCircle className="mx-auto mb-3" style={{ width: '48px', height: '48px', color: '#6f42c1' }} />
                  <h3 className="display-6 fw-bold">{stats.myBugs}</h3>
                  <p className="text-muted mb-0">My Bugs</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <Users className="mx-auto mb-3" style={{ width: '48px', height: '48px', color: '#198754' }} />
                  <h3 className="display-6 fw-bold">{stats.assignedToMe}</h3>
                  <p className="text-muted mb-0">Assigned to Me</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <AlertCircle className="mx-auto mb-3" style={{ width: '48px', height: '48px', color: '#fd7e14' }} />
                  <h3 className="display-6 fw-bold">{stats.openBugs}</h3>
                  <p className="text-muted mb-0">Open Bugs</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Bugs */}
          <div className="row">
            <div className="col">
              <div className="card">
                <div className="card-header">
                  <h2 className="h4 mb-0">Recent Bugs</h2>
                </div>
                <div className="card-body">
                  {recentBugs.length === 0 ? (
                    <p className="text-muted text-center py-4">No bugs found</p>
                  ) : (
                    <div className="list-group list-group-flush">
                      {recentBugs.map(bug => (
                        <div key={bug._id} className="list-group-item">
                          <div className="d-flex w-100 justify-content-between align-items-start">
                            <div className="flex-grow-1">
                              <h5 className="mb-1">{bug.title}</h5>
                              <p className="mb-1 text-muted">{bug.description}</p>
                              <small className="text-muted">
                                By: {bug.author} | Assigned: {bug.assignedTo}
                              </small>
                            </div>
                            <span className={`badge ${
                              bug.classification === 'approved' ? 'bg-success' :
                              bug.classification === 'unapproved' ? 'bg-danger' :
                              'bg-secondary'
                            }`}>
                              {bug.classification}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// Bugs Page Component
function BugsPage({ user }) {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBugs();
  }, []);

  const loadBugs = async () => {
    try {
      const response = await fetch(`${API_URL}/bugs`, {
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

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border" role="status"></div></div>;
  }

  return (
    <section className="py-5">
      <div className="container">
        <div className="row mb-4">
          <div className="col">
            <h1 className="display-4 fw-bold">Bugs</h1>
          </div>
        </div>

        <div className="row">
          <div className="col">
            {bugs.length === 0 ? (
              <div className="card">
                <div className="card-body text-center py-5">
                  <p className="text-muted">No bugs found</p>
                </div>
              </div>
            ) : (
              <div className="list-group">
                {bugs.map(bug => (
                  <div key={bug._id} className="list-group-item list-group-item-action">
                    <div className="d-flex w-100 justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <h5 className="mb-1">{bug.title}</h5>
                        <p className="mb-1">{bug.description}</p>
                        <small className="text-muted">
                          Author: {bug.author} | Assigned: {bug.assignedTo} | 
                          Created: {new Date(bug.createdAt).toLocaleDateString()}
                        </small>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className={`badge ${
                          bug.classification === 'approved' ? 'bg-success' :
                          bug.classification === 'unapproved' ? 'bg-danger' :
                          bug.classification === 'duplicate' ? 'bg-warning' :
                          'bg-secondary'
                        }`}>
                          {bug.classification}
                        </span>
                        {bug.closed ? (
                          <CheckCircle style={{ width: '20px', height: '20px', color: '#198754' }} />
                        ) : (
                          <AlertCircle style={{ width: '20px', height: '20px', color: '#fd7e14' }} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// Users Page Component
function UsersPage({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/users`, {
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
    return <div className="text-center py-5"><div className="spinner-border" role="status"></div></div>;
  }

  return (
    <section className="py-5">
      <div className="container">
        <div className="row mb-4">
          <div className="col">
            <h1 className="display-4 fw-bold">Manage Users</h1>
          </div>
        </div>

        <div className="row">
          <div className="col">
            <div className="card">
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u._id}>
                          <td>{u.fullName}</td>
                          <td>{u.email}</td>
                          <td>
                            <span className={`badge ${u.role ? 'bg-primary' : 'bg-secondary'}`}>
                              {u.role || 'No role'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Profile Page Component
function ProfilePage({ user, onUpdate }) {
  const [formData, setFormData] = useState({
    fullName: user.fullName || '',
    givenName: user.givenName || '',
    familyName: user.familyName || '',
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
    <section className="py-5">
      <div className="container">
        <div className="row">
          <div className="col-lg-8 mx-auto">
            <h1 className="display-4 fw-bold mb-4">My Profile</h1>

            <div className="card">
              <div className="card-body p-4">
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="alert alert-success" role="alert">
                    {success}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={user.email}
                      disabled
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Role</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user.role || 'No role assigned'}
                      disabled
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Given Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.givenName}
                      onChange={(e) => setFormData({ ...formData, givenName: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Family Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.familyName}
                      onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">New Password (leave blank to keep current)</label>
                    <input
                      type="password"
                      className="form-control"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      minLength={6}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Update Profile'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default App;