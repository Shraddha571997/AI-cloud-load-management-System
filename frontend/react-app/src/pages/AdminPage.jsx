import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { adminAPI } from '../services/api'; 
import { Shield, Users, Database, Server, Cpu, Zap, Activity, RefreshCw, Key, Filter, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminPage = () => {
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [retraining, setRetraining] = useState(false);
    
    // Audit logs state
    const [auditLogs, setAuditLogs] = useState([]);
    const [logFilter, setLogFilter] = useState('All');
    const [loadingLogs, setLoadingLogs] = useState(true);

    useEffect(() => {
        fetchAdminData();
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [logFilter]);

    const fetchLogs = async () => {
        try {
            setLoadingLogs(true);
            const res = await adminAPI.getAuditLogs({ action: logFilter, limit: 100 });
            setAuditLogs(res.data?.logs || []);
        } catch (error) {
            console.error("Failed to load audit logs", error);
        } finally {
            setLoadingLogs(false);
        }
    };

    const fetchAdminData = async () => {
        try {
            setLoading(true);
            const [usersRes, statsRes] = await Promise.all([
                adminAPI.getUsers(),
                adminAPI.getSystemStats()
            ]);
            setUsers(usersRes.data?.users || []);
            setStats(statsRes.data || null);
        } catch (error) {
            console.error("Failed to load admin data", error);
            toast.error("Failed to load admin dashboard data");
        } finally {
            setLoading(false);
        }
    };

    const handleRetrain = async () => {
        try {
            setRetraining(true);
            const res = await adminAPI.retrainModel();
            toast.success(res.data?.message || "Model retrained successfully!");
            await fetchAdminData(); // Refresh stats to show new model accuracy
        } catch (error) {
            console.error("Failed to retrain model", error);
            toast.error("Error during model retraining");
        } finally {
            setRetraining(false);
        }
    };

    const handleDeleteUser = async (userId, username) => {
        if (!window.confirm(`Are you extremely sure you want to permanently delete the user '${username}'?`)) {
            return;
        }
        try {
            await adminAPI.deleteUser(userId);
            toast.success(`User ${username} securely deleted`);
            setUsers(users.filter(u => u._id !== userId));
        } catch (error) {
            console.error("Failed to delete user", error);
            const msg = error.response?.data?.message || 'Delete operation failed';
            toast.error(msg);
        }
    };

    return (
        <div className="space-y-6 animate-in">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                    Administrator Control Center
                </h1>
                <button 
                    onClick={fetchAdminData}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0 shadow-lg">
                    <div className="flex items-center mb-2 opacity-80">
                        <Users className="w-5 h-5 mr-2" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider">Total Users</h2>
                    </div>
                    <p className="text-3xl font-bold">{users.length}</p>
                </Card>

                <Card className="p-5 bg-white border-indigo-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center mb-2 text-indigo-600">
                        <Server className="w-5 h-5 mr-2" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider">Total Predictions</h2>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                        {stats?.system_performance?.total_predictions || 0}
                    </p>
                </Card>

                <Card className="p-5 bg-white border-green-100 shadow-sm">
                    <div className="flex items-center mb-2 text-green-600">
                        <Database className="w-5 h-5 mr-2" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider">MongoDB</h2>
                    </div>
                    <p className="text-xl font-bold text-gray-900 flex items-center">
                        <span className="w-3 h-3 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                        Connected
                    </p>
                </Card>

                <Card className="p-5 bg-white border-orange-100 shadow-sm">
                    <div className="flex items-center mb-2 text-orange-600">
                        <Activity className="w-5 h-5 mr-2" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider">Uptime Status</h2>
                    </div>
                    <p className="text-xl font-bold text-gray-900">Healthy</p>
                    <p className="text-xs text-gray-500 mt-1">API processing normally</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* User Management Table */}
                <Card className="lg:col-span-2 overflow-hidden shadow-sm border-gray-100">
                    <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between">
                        <h3 className="text-md font-semibold text-gray-800 flex items-center">
                            <Shield className="w-4 h-4 mr-2 text-indigo-600" />
                            Role-Based Access Management
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Username</th>
                                    <th className="px-6 py-3 font-medium">Email</th>
                                    <th className="px-6 py-3 font-medium">Role</th>
                                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {users.map((user) => (
                                    <tr key={user._id} className="bg-white hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 flex items-center">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold mr-3 border border-indigo-200">
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            {user.username}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{user.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                                                user.role === 'admin' 
                                                ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm' 
                                                : 'bg-gray-50 text-gray-600 border-gray-200'
                                            }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeleteUser(user._id, user.username)}
                                                disabled={user.role === 'admin'}
                                                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                                                    user.role === 'admin' 
                                                    ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed'
                                                    : 'bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 shadow-sm'
                                                }`}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* AI Model Management */}
                <div className="space-y-6">
                    <Card className="p-6 border-indigo-100 shadow-sm relative overflow-hidden bg-white">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-10 -mt-10 opacity-50 blur-2xl"></div>
                        <h3 className="text-md font-semibold text-gray-800 flex items-center mb-4 relative z-10">
                            <Cpu className="w-5 h-5 mr-2 text-indigo-600" />
                            AI Engine Management
                        </h3>
                        
                        <div className="space-y-4 relative z-10">
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-500">Active Model</span>
                                    <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-md">
                                        ONLINE
                                    </span>
                                </div>
                                <p className="font-semibold text-gray-900">
                                    {stats?.model_information?.model_type === 'random_forest' 
                                        ? 'Random Forest Regressor' 
                                        : 'Linear Regression'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-50">
                                    <span className="block text-xs text-gray-500 mb-1">Accuracy Score</span>
                                    <span className="text-lg font-bold text-indigo-700">
                                        {stats?.model_information?.accuracy 
                                            ? `${(stats.model_information.accuracy * 100).toFixed(2)}%` 
                                            : 'N/A'}
                                    </span>
                                </div>
                                <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-50">
                                    <span className="block text-xs text-gray-500 mb-1">Features Used</span>
                                    <span className="text-lg font-bold text-indigo-700">
                                        {stats?.model_information?.features_used || 1}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleRetrain}
                                disabled={retraining}
                                className={`w-full py-3 px-4 flex justify-center items-center rounded-lg font-medium text-white transition-all shadow-md ${
                                    retraining 
                                    ? 'bg-indigo-400 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:-translate-y-0.5'
                                }`}
                            >
                                {retraining ? (
                                    <>
                                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                                        Training active pipeline...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-5 h-5 mr-2" />
                                        Force Retrain Model
                                    </>
                                )}
                            </button>
                            <p className="text-xs text-center text-gray-400 mt-2">
                                Retraining triggers automatic model selection based on highest R² score against recent dataset.
                            </p>
                        </div>
                    </Card>
                </div>

            </div>

            {/* System Audit Logs Center */}
            <div className="mt-8">
                <Card className="overflow-hidden shadow-sm border-gray-100 bg-white">
                    <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center">
                            <Activity className="w-5 h-5 mr-2 text-indigo-600" />
                            System Audit Logs
                        </h3>
                        
                        {/* Action Filters */}
                        <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm">
                            <Filter className="w-4 h-4 text-gray-400 ml-2" />
                            {['All', 'login', 'prediction', 'scaling'].map(action => (
                                <button
                                    key={action}
                                    onClick={() => setLogFilter(action)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                                        logFilter === action 
                                        ? 'bg-indigo-100 text-indigo-700' 
                                        : 'text-gray-500 hover:bg-gray-100'
                                    }`}
                                >
                                    {action.charAt(0).toUpperCase() + action.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Timestamp</th>
                                    <th className="px-6 py-4 font-medium">User / System</th>
                                    <th className="px-6 py-4 font-medium">Action Event</th>
                                    <th className="px-6 py-4 font-medium">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loadingLogs ? (
                                    <tr><td colSpan="4" className="text-center py-8 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mx-auto" /></td></tr>
                                ) : auditLogs.length === 0 ? (
                                    <tr><td colSpan="4" className="text-center py-8 text-gray-500 font-medium">No system events found.</td></tr>
                                ) : (
                                    auditLogs.map((log) => (
                                        <tr key={log._id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4 text-gray-500 font-mono text-xs whitespace-nowrap flex items-center">
                                                <Clock className="w-3.5 h-3.5 mr-2 opacity-50" />
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                {log.username}
                                                {log.user_id && log.username !== 'System' && (
                                                    <span className="block text-[10px] text-gray-400 font-mono truncate w-24">{log.user_id}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {log.action === 'login' && <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Key className="w-4 h-4" /></div>}
                                                    {log.action === 'prediction' && <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg"><Zap className="w-4 h-4" /></div>}
                                                    {log.action === 'scaling' && <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><Server className="w-4 h-4" /></div>}
                                                    <span className="font-semibold text-gray-700 capitalize tracking-wide">{log.action}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries(log.details || {}).map(([k, v]) => (
                                                        <span key={k} className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                            <span className="opacity-70 mr-1">{k}:</span>
                                                            <strong className="text-gray-900 truncate max-w-[120px]">{String(v)}</strong>
                                                        </span>
                                                    ))}
                                                    {Object.keys(log.details || {}).length === 0 && <span className="text-gray-400 italic text-xs">--</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
            
        </div>
    );
};

export default AdminPage;