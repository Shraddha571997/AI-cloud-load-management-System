import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Activity, ArrowUp, ArrowDown, Minus, Zap, Server, Clock } from 'lucide-react';
import { analyticsAPI, predictionAPI, systemAPI } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [timeSlot, setTimeSlot] = useState(new Date().getHours());
  const [predictionResult, setPredictionResult] = useState(null);

  useEffect(() => {
    loadData();
    // Start polling system stats
    const interval = setInterval(fetchSystemStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const [systemStats, setSystemStats] = useState({ memory_percent: 0, network_rate: 0 });
  const lastNetwork = React.useRef({ bytes: 0, time: Date.now() });

  const fetchSystemStats = async () => {
    try {
      const res = await systemAPI.getRealtimeStats();
      const now = Date.now();
      const totalBytes = res.data.bytes_sent + res.data.bytes_recv;

      let rate = 0;
      if (lastNetwork.current.bytes > 0) {
        const diffBytes = totalBytes - lastNetwork.current.bytes;
        const diffTime = (now - lastNetwork.current.time) / 1000; // seconds
        if (diffTime > 0) rate = diffBytes / diffTime;
      }

      lastNetwork.current = { bytes: totalBytes, time: now };

      setSystemStats({
        memory_percent: res.data.memory_percent,
        cpu_percent: res.data.cpu_percent,
        status: res.data.status,
        is_real: res.data.is_real_data,
        network_rate: rate
      });
    } catch (err) {
      // Silent error for stats
      console.error("Stats fetch error", err);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [historyRes, statsRes] = await Promise.all([
        analyticsAPI.getHistory({ limit: 24 }),
        analyticsAPI.getStats({ days: 30 }),
      ]);
      setHistory(historyRes.data.items || []);
      setStats(statsRes.data.stats || {});
      setLatestPrediction(statsRes.data.latest_prediction);
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || error.message || 'Failed to connection';
      toast.error(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async () => {
    if (timeSlot < 0 || timeSlot > 23) {
      toast.error('Time slot must be between 0 and 23');
      return;
    }
    setPredicting(true);
    try {
      const res = await predictionAPI.predict(timeSlot);
      setPredictionResult(res.data);
      toast.success('Prediction generated!');
      loadData(); // Refresh data
    } catch (error) {
      toast.error('Prediction failed');
    } finally {
      setPredicting(false);
    }
  };

  // Process data for charts
  const chartData = history.slice().reverse().map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    load: item.predicted_load,
    action: item.action
  }));

  const actionDistData = [
    { name: 'Scale Up', value: stats?.action_counts?.['SCALE UP'] || 0, color: '#ef4444' },
    { name: 'Scale Down', value: stats?.action_counts?.['SCALE DOWN'] || 0, color: '#10b981' },
    { name: 'No Action', value: stats?.action_counts?.['NO ACTION'] || 0, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Real-time overview of system load and predictions</p>
        </div>
        <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
          <Button size="sm" variant="ghost" className="text-sm">Today</Button>
          <Button size="sm" variant="ghost" className="text-sm text-gray-400">Week</Button>
          <Button size="sm" variant="ghost" className="text-sm text-gray-400">Month</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-500 text-white border-none shadow-xl shadow-blue-500/20 transform hover:scale-[1.02] transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
          <div className="flex justify-between items-center mb-4 relative z-10">
            <h3 className="text-blue-100 font-medium">Latest Load</h3>
            <div className="p-2 bg-white/20 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-5xl font-bold tracking-tight">{latestPrediction?.predicted_load?.toFixed(1) || 0}<span className="text-2xl opacity-80">%</span></p>
          <div className="mt-4 flex items-center text-blue-100 text-sm">
            <Clock className="w-4 h-4 mr-1" />
            {latestPrediction ? new Date(latestPrediction.timestamp).toLocaleTimeString() : 'No data'}
          </div>
        </Card>

        <Card className="p-6 bg-white border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-gray-500 font-medium">Real-Time CPU</h3>
             <div className="p-2 bg-indigo-50 rounded-lg">
               <Zap className="w-5 h-5 text-indigo-600" />
             </div>
           </div>
           <div className="flex items-end gap-2">
             <span className="text-4xl font-bold text-gray-900">{systemStats.cpu_percent?.toFixed(1) || 0}%</span>
             <span className="text-sm text-gray-500 mb-1">usage</span>
           </div>
           <p className="mt-2 text-xs text-gray-400">
             {systemStats.is_real ? 'Live from Device' : 'Simulated Data'}
           </p>
        </Card>

        <Card className="p-6 border-l-4 border-green-500 hover:shadow-lg transition-shadow duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-500 font-medium">System Status</h3>
            <div className="p-2 bg-green-100 rounded-lg">
              <Server className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-4 h-4 rounded-full bg-green-500 animate-ping absolute"></div>
              <div className="w-4 h-4 rounded-full bg-green-500 relative"></div>
            </div>
            <p className="text-2xl font-bold text-gray-900">Operational</p>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Total Predictions: <span className="font-semibold text-gray-900">{stats?.total_predictions || 0}</span>
          </p>
        </Card>

        <Card className="p-6 border-l-4 border-yellow-500 hover:shadow-lg transition-shadow duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-500 font-medium">Next Action</h3>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Zap className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {latestPrediction?.action === 'SCALE UP' && <ArrowUp className="w-6 h-6 text-red-500" />}
            {latestPrediction?.action === 'SCALE DOWN' && <ArrowDown className="w-6 h-6 text-green-500" />}
            {(!latestPrediction || latestPrediction?.action === 'NO ACTION') && <Minus className="w-6 h-6 text-yellow-500" />}
            <p className={`text-2xl font-bold ${latestPrediction?.action === 'SCALE UP' ? 'text-red-500' :
              latestPrediction?.action === 'SCALE DOWN' ? 'text-green-500' : 'text-yellow-600'
              }`}>
              {latestPrediction?.action || 'No Action'}
            </p>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Confidence: <span className="font-semibold text-gray-900">{(latestPrediction?.confidence * 100)?.toFixed(1) || 0}%</span>
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main Chart */}
        <Card className="p-6 lg:col-span-2 shadow-lg border-none ring-1 ring-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Load Prediction Trend</h3>
              <p className="text-sm text-gray-500">24-Hour Forecast Analysis</p>
            </div>
            <select className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2">
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
            </select>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '8px' }}
                />
                <Area
                  type="monotone"
                  dataKey="load"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorLoad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Real System Metrics */}
          <div className="mt-8 grid grid-cols-2 gap-4 border-t pt-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Memory Usage</h4>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-2xl font-bold text-gray-900">{systemStats.memory_percent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-purple-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${systemStats.memory_percent}%` }}></div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Network Traffic (Active)</h4>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-2xl font-bold text-gray-900">{formatBytes(systemStats.network_rate)}/s</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-500 h-1.5 rounded-full animate-progress-indeterminate"></div>
              </div>
            </div>
          </div>
        </Card>

        {/* Prediction Tool */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Prediction</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Time Slot (Hour 0-23)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(parseInt(e.target.value))}
                  />
                  <Button onClick={handlePredict} isLoading={predicting}>Predict</Button>
                </div>
              </div>

              {predictionResult && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg border ${predictionResult.action === 'SCALE UP' ? 'bg-red-50 border-red-200' :
                    predictionResult.action === 'SCALE DOWN' ? 'bg-green-50 border-green-200' :
                      'bg-yellow-50 border-yellow-200'
                    } animate-fade-in`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">Predicted Load (AI)</span>
                      <span className="text-lg font-bold text-gray-900">{predictionResult.predicted_cpu_load}%</span>
                    </div>
                     <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">Current Load (Real)</span>
                      <span className="text-lg font-bold text-gray-900">{predictionResult.current_real_load}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Action</span>
                      <span className={`font-bold ${predictionResult.action === 'SCALE UP' ? 'text-red-600' :
                        predictionResult.action === 'SCALE DOWN' ? 'text-green-600' :
                          'text-yellow-600'
                        }`}>{predictionResult.action}</span>
                    </div>
                  </div>

                  {predictionResult.anomaly_status && predictionResult.anomaly_status.status !== 'NORMAL' && (
                    <div className="p-3 bg-red-100 border border-red-300 rounded-md text-red-800 text-sm flex items-start gap-2">
                      <Activity className="w-5 h-5 flex-shrink-0" />
                      <div>
                        <span className="font-bold">Anomaly Detected:</span> {predictionResult.anomaly_status.message}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Action Distribution</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={actionDistData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                  <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {actionDistData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;