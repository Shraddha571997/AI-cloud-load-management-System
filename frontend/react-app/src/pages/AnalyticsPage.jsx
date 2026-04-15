import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth.jsx';
import { Card } from '../components/ui/Card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, TrendingUp, TrendingDown, Clock, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const AnalyticsPage = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await analyticsAPI.getStats({ 
                days: 30, 
                scope: user?.role === 'admin' ? 'all' : 'user' 
            });
            setStats(res.data.stats);
        } catch (error) {
            toast.error("Failed to load analytics");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading analytics...</div>;

    const actionData = [
        { name: 'Scale Up', value: stats?.action_counts?.['SCALE UP'] || 0, color: '#ef4444' },
        { name: 'Scale Down', value: stats?.action_counts?.['SCALE DOWN'] || 0, color: '#10b981' },
        { name: 'No Action', value: stats?.action_counts?.['NO ACTION'] || 0, color: '#f59e0b' },
    ];

    const calculateMostFrequentAction = () => {
        if (!stats || !stats.action_counts) return 'None';
        return Object.entries(stats.action_counts)
          .sort((a,b) => b[1] - a[1])[0]?.[0] || 'None';
    };
      
    const calculateTrend = () => {
        if (!stats || !stats.trend || stats.trend.length < 2) return { direction: 'Stable', value: 0 };
        const first = stats.trend[0].avg_load;
        const last = stats.trend[stats.trend.length - 1].avg_load;
        const diff = last - first;
        return {
          direction: diff > 2 ? 'Increasing' : diff < -2 ? 'Decreasing' : 'Stable',
          value: diff.toFixed(1)
        };
    };
    
    const trendStatus = calculateTrend();
    const frequentAction = calculateMostFrequentAction();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">System Analytics (Last 30 Days)</h1>

            {/* 4 Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 bg-white border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Activity className="w-5 h-5"/></div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase">Average Load</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats?.avg_load?.toFixed(1) || 0}%</p>
                </Card>
                
                <Card className="p-6 bg-white border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg"><Zap className="w-5 h-5"/></div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase">Peak Load</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats?.peak_load?.toFixed(1) || 0}%</p>
                    <p className="text-xs text-gray-500 mt-1">{stats?.peak_time ? new Date(stats.peak_time).toLocaleString() : 'N/A'}</p>
                </Card>

                <Card className="p-6 bg-white border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Clock className="w-5 h-5"/></div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase">Top Action</h3>
                    </div>
                    <p className="text-xl font-bold text-gray-900 capitalize mt-1 text-indigo-900">{frequentAction}</p>
                </Card>

                <Card className="p-6 bg-white border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${trendStatus.direction === 'Increasing' ? 'bg-red-50 text-red-600' : trendStatus.direction === 'Decreasing' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-600'}`}>
                            {trendStatus.direction === 'Increasing' ? <TrendingUp className="w-5 h-5"/> : trendStatus.direction === 'Decreasing' ? <TrendingDown className="w-5 h-5"/> : <Activity className="w-5 h-5"/>}
                        </div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase">Trend Analysis</h3>
                    </div>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                        {trendStatus.direction} 
                        {trendStatus.value !== 0 && <span className={`text-sm ml-2 ${trendStatus.direction === 'Increasing' ? 'text-red-500' : 'text-emerald-500'}`}>({trendStatus.value > 0 ? '+' : ''}{trendStatus.value}%)</span>}
                    </p>
                </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                
                {/* Huge Line Chart */}
                <Card className="p-6 lg:col-span-2">
                    <h3 className="text-lg font-bold mb-6 text-gray-900">Historical Load Trajectory</h3>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats?.trend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="_id" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} minTickGap={30} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dx={-10} domain={[0, 100]} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Line type="monotone" dataKey="avg_load" stroke="#4f46e5" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#4f46e5' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Legacy Pie Chart action counts */}
                <Card className="p-6">
                    <h3 className="text-lg font-bold mb-4 text-gray-900">Action Distribution</h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={actionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {actionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-6">
                        {actionData.map((entry) => (
                            <div key={entry.name} className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                <span className="text-xs font-semibold text-gray-600">{entry.name} ({entry.value})</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AnalyticsPage;