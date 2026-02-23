import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import { Card } from '../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';

const AnalyticsPage = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await analyticsAPI.getStats({ days: 7 });
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

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">System Analytics (Last 30 Days)</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                    <h3 className="text-lg font-bold mb-4">Action Distribution</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={actionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {actionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-4">
                        {actionData.map((entry) => (
                            <div key={entry.name} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                <span className="text-sm text-gray-600">{entry.name} ({entry.value})</span>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="text-lg font-bold mb-4">Overview</h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-sm text-blue-600 font-medium">Total Predictions</p>
                            <p className="text-3xl font-bold text-blue-900">{stats?.total_predictions || 0}</p>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                            <p className="text-sm text-purple-600 font-medium">Average Confidence</p>
                            <p className="text-3xl font-bold text-purple-900">{(stats?.avg_confidence * 100).toFixed(1)}%</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="text-sm text-gray-600 font-medium">Model Status</p>
                            <p className="text-xl font-bold text-gray-900">Random Forest Regressor</p>
                            <p className="text-xs text-gray-500">v1.2.0 (Active)</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AnalyticsPage;