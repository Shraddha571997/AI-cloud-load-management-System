import React from 'react';
import { Card } from '../components/ui/Card';
import { Monitor, Server, Brain, Database, GitBranch, Shield, Zap, ArrowRight } from 'lucide-react';

// ─── Data Definitions ───────────────────────────────────────────────────────

const COMPONENTS = [
  {
    icon: Monitor,
    label: 'Frontend',
    color: 'indigo',
    tech: 'React.js + Tailwind CSS',
    description: 'Single-page application providing a professional SaaS-style control panel. Features include a real-time simulation dashboard, prediction wizard, prediction history table with sorting/filtering, analytics charts, and role-based UI rendering.',
    bullets: ['Recharts (Line, Bar, Pie)', 'Axios (JWT-authenticated API)', 'React Router DOM', 'Lucide-React icons'],
  },
  {
    icon: Server,
    label: 'Backend',
    color: 'violet',
    tech: 'Python Flask + REST API',
    description: 'RESTful API server with JWT-based authentication, role-based access control (Admin / User), rate limiting, email alerting, and modular route design. Exposes 15+ endpoints covering predictions, analytics, history, simulation, export, and admin.',
    bullets: ['Flask-JWT-Extended (Auth)', 'Flask-Limiter (Rate limiting)', 'Flask-Mail (Email alerts)', 'Flask-CORS (Cross-origin)'],
  },
  {
    icon: Brain,
    label: 'AI Model',
    color: 'purple',
    tech: 'Scikit-Learn (Python)',
    description: 'Competitive ML pipeline that engineers multi-factor features (Time Slot, Requests/min, RAM %) and races a Random Forest Regressor against a Linear Regression model. The algorithm with the highest R² Score is automatically crowned champion and drives all live predictions.',
    bullets: ['Feature Engineering (3D matrix)', 'RandomForestRegressor', 'LinearRegression', 'r2_score auto-selection'],
  },
  {
    icon: Database,
    label: 'Database',
    color: 'blue',
    tech: 'MongoDB (NoSQL)',
    description: 'Document-oriented NoSQL database storing users, predictions, and system metrics. Leverages aggregation pipelines for complex analytics calculations including average load, peak detection, trend analysis, and action distribution counts.',
    bullets: ['PyMongo driver', 'Aggregation Pipelines', 'Index-optimised queries', 'Schema: Users, Predictions, Metrics'],
  },
];

const FLOW_STEPS = [
  { label: 'User Request', sub: 'React UI', icon: Monitor },
  { label: 'JWT Auth', sub: 'Flask + Middleware', icon: Shield },
  { label: 'ML Prediction', sub: 'Scikit-Learn Engine', icon: Brain },
  { label: 'Persist + Alert', sub: 'MongoDB + Email', icon: Database },
  { label: 'JSON Response', sub: 'REST API', icon: Zap },
];

const FEATURES = [
  { label: 'Real-Time Simulation', desc: 'Random-walk CPU load generator → stored + visualised every 5s' },
  { label: 'Smart Auto-Scaling', desc: '4-tier engine: LOW / MEDIUM / HIGH / CRITICAL with recommended instances' },
  { label: 'Cost Optimisation', desc: 'Estimated hourly billing and projected savings displayed per prediction' },
  { label: 'Alert System', desc: 'HIGH ALERT (>80%) and CRITICAL ALERT (>90%) banners with pulsing animation' },
  { label: 'Role-Based Access', desc: 'Admin sees all data; User sees only their own predictions and stats' },
  { label: 'Export Reports', desc: 'One-click CSV spreadsheet and formatted PDF report download' },
  { label: 'Anomaly Detection', desc: 'Compares real CPU vs predicted — flags WARNING or CRITICAL deviations' },
  { label: 'Email Notifications', desc: 'Optional threaded emails on high-load events via Flask-Mail' },
];

const COLOR_MAP = {
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-100', icon: 'bg-indigo-600', badge: 'text-indigo-700 bg-indigo-100' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-100', icon: 'bg-violet-600', badge: 'text-violet-700 bg-violet-100' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-100', icon: 'bg-purple-600', badge: 'text-purple-700 bg-purple-100' },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-100',   icon: 'bg-blue-600',   badge: 'text-blue-700 bg-blue-100' },
};

// ─── Page Component ─────────────────────────────────────────────────────────

const SystemInfoPage = () => {
  return (
    <div className="space-y-10 pb-16 animate-fade-in">

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-lg"><GitBranch className="w-6 h-6" /></div>
            <span className="text-white/70 text-sm font-semibold uppercase tracking-widest">MCA Final Year Project</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-2">AI-Based Predictive Cloud Load Management</h1>
          <p className="text-white/80 text-lg max-w-2xl">
            An intelligent system that uses machine learning to forecast CPU load, automatically recommend scaling actions, and provide real-time cloud infrastructure management.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            {['React.js', 'Flask', 'Scikit-Learn', 'MongoDB', 'JWT Auth', 'Recharts'].map(t => (
              <span key={t} className="px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold border border-white/20">{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Data Flow */}
      <Card className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-600" /> Request Data Flow
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {FLOW_STEPS.map((step, i) => (
            <React.Fragment key={step.label}>
              <div className="flex flex-col items-center gap-2 min-w-[90px]">
                <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20">
                  <step.icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-extrabold text-gray-800">{step.label}</p>
                  <p className="text-[10px] text-gray-400 font-medium">{step.sub}</p>
                </div>
              </div>
              {i < FLOW_STEPS.length - 1 && (
                <ArrowRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* Component Cards */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">System Components</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {COMPONENTS.map(({ icon: Icon, label, color, tech, description, bullets }) => {
            const c = COLOR_MAP[color];
            return (
              <Card key={label} className={`p-6 border ${c.border} ${c.bg} rounded-2xl`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2.5 rounded-xl ${c.icon}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900">{label}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>{tech}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">{description}</p>
                <ul className="space-y-1.5">
                  {bullets.map(b => (
                    <li key={b} className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                      <span className={`w-1.5 h-1.5 rounded-full ${c.icon} flex-shrink-0`} />
                      {b}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Feature Grid */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Implemented Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ label, desc }) => (
            <div key={label} className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="w-2 h-2 rounded-full bg-indigo-600 mb-3" />
              <h4 className="text-sm font-extrabold text-gray-900 mb-1">{label}</h4>
              <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture Note */}
      <Card className="p-6 bg-gradient-to-r from-gray-50 to-indigo-50 border border-indigo-100 rounded-2xl">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Architecture Philosophy</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
          <div>
            <h4 className="font-extrabold text-gray-800 mb-1">Modular Design</h4>
            <p>Each system layer (auth, scaling, ML, monitoring) is isolated into individual Python modules, making the codebase maintainable and independently testable.</p>
          </div>
          <div>
            <h4 className="font-extrabold text-gray-800 mb-1">Security-First</h4>
            <p>JWT tokens for stateless auth, bcrypt password hashing, role-based route guards, and per-user data isolation enforce a zero-trust model across all API surfaces.</p>
          </div>
          <div>
            <h4 className="font-extrabold text-gray-800 mb-1">Academic Explainability</h4>
            <p>Algorithm logic (scaling tiers, model selection, cost formula) is deliberately simple and well-commented so every design decision can be explained during a viva.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SystemInfoPage;
