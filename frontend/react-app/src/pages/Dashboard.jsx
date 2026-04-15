import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell, AreaChart, Area } from 'recharts';
import { Activity, ArrowUp, ArrowDown, Minus, Zap, Server, Clock, TrendingUp, TrendingDown, Lightbulb, Download, FileText } from 'lucide-react';
import { analyticsAPI, predictionAPI, systemAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth.jsx';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { AutoPredictionControl } from '../components/ui/AutoPredictionControl';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [currentInstances, setCurrentInstances] = useState(2);
  const [recommendedInstances, setRecommendedInstances] = useState(2);
  const [alertLevel, setAlertLevel] = useState('Normal');
  const notifiedAlertsRef = React.useRef({ Warning: false, Critical: false });
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [timeSlot, setTimeSlot] = useState(new Date().getHours());
  const [predictionResult, setPredictionResult] = useState(null);
  const [liveData, setLiveData] = useState([]);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchLive = async () => {
      try {
        const res = await analyticsAPI.getLiveLoad();
        if(!mounted) return;
        const newData = {
            time: new Date(res.data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
            cpu_load: res.data.cpu_load
        };
        setLiveData(prev => {
          const updated = [...prev, newData];
          return updated.length > 20 ? updated.slice(updated.length - 20) : updated;
        });
        setSystemStats(prev => ({...prev, cpu_percent: newData.cpu_load}));
        if (res.data.current_instances !== undefined) setCurrentInstances(res.data.current_instances);
        if (res.data.recommended_instances !== undefined) setRecommendedInstances(res.data.recommended_instances);
        
        // Smart Popup Logic for Alerts
        const newAlertLevel = res.data.alert_level || 'Normal';
        setAlertLevel(newAlertLevel);
        
        if (newAlertLevel === 'Critical') {
            if (!notifiedAlertsRef.current.Critical) {
               toast.error(`CRITICAL: CPU Load exceeded 90% (Actual: ${newData.cpu_load.toFixed(1)}%)`, { 
                 id: 'crit_alert', 
                 duration: 6000, 
                 style: { background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', fontWeight: 'bold' }
               });
               notifiedAlertsRef.current.Critical = true;
               notifiedAlertsRef.current.Warning = true; // prevent warning cascade
            }
        } else if (newAlertLevel === 'Warning') {
            if (!notifiedAlertsRef.current.Warning) {
               toast(`WARNING: CPU Load exceeded 70% (Actual: ${newData.cpu_load.toFixed(1)}%)`, { 
                 icon: '⚠️', 
                 id: 'warn_alert', 
                 duration: 4000, 
                 style: { background: '#fffbeb', border: '1px solid #fbbf24', color: '#b45309', fontWeight: 'bold' }
               });
               notifiedAlertsRef.current.Warning = true;
            }
            notifiedAlertsRef.current.Critical = false; // Reset critical if dropped to warning
        } else {
            if (notifiedAlertsRef.current.Critical || notifiedAlertsRef.current.Warning) {
               toast.success('System Load returned to Normal levels', { 
                 id: 'resolve_alert', 
                 duration: 3000,
                 style: { background: '#f0fdf4', border: '1px solid #4ade80', color: '#166534', fontWeight: 'bold' } 
               });
               notifiedAlertsRef.current.Critical = false;
               notifiedAlertsRef.current.Warning = false;
            }
        }
        
      } catch (err) { console.error('Telemtry Error: ', err); }
    };
    
    // Initial fetch and loop mapping
    fetchLive();
    const intervalId = setInterval(fetchLive, 5000);
    
    return () => { mounted = false; clearInterval(intervalId); };
  }, []);

  useEffect(() => {
    loadData();
    // Start polling system stats
    const interval = setInterval(fetchSystemStats, 2000);
    return () => clearInterval(interval);
  }, []);

  // Poll Latest Prediction (every 5 seconds)
  useEffect(() => {
    let mounted = true;
    const pollLatest = async () => {
      try {
        const res = await analyticsAPI.getLatest();
        if (mounted && res.data?.latest_prediction) {
          setLatestPrediction(res.data.latest_prediction);
        }
      } catch (err) {
        // Silent fail on polling to avoid toast notification spam
      }
    };
    const intervalId = setInterval(pollLatest, 5000);
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
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
        network_rate: rate,
        performance_score: res.data.performance_score,
        performance_status: res.data.performance_status
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
      const [historyRes, statsRes, insightsRes] = await Promise.all([
        analyticsAPI.getHistory({ limit: 24, scope: user?.role === 'admin' ? 'all' : 'user' }),
        analyticsAPI.getStats({ days: 30, scope: user?.role === 'admin' ? 'all' : 'user' }),
        analyticsAPI.getInsights()
      ]);
      setHistory(historyRes.data.items || []);
      setStats(statsRes.data.stats || {});
      setLatestPrediction(statsRes.data.latest_prediction);
      setInsights(insightsRes.data || null);
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

  const handleExport = async (type) => {
    const scope = user?.role === 'admin' ? 'all' : 'user';
    try {
      toast.loading(`Generating ${type.toUpperCase()}...`, { id: 'export' });
      const res = type === 'csv'
        ? await analyticsAPI.exportCSV({ scope })
        : await analyticsAPI.exportPDF({ scope });
      const mimeType = type === 'csv' ? 'text/csv' : 'application/pdf';
      const url = window.URL.createObjectURL(new Blob([res.data], { type: mimeType }));
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'csv' ? 'prediction_history.csv' : 'prediction_report.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
      
      toast.success(`${type.toUpperCase()} downloaded!`, { id: 'export' });
    } catch (err) {
      console.error(err);
      toast.error(`Export failed`, { id: 'export' });
    }
  };

  const handleAddInstance = async () => {
    try {
      const res = await analyticsAPI.addInstance();
      if (res.data.current_instances !== undefined) setCurrentInstances(res.data.current_instances);
      toast.success('Instance added');
    } catch (err) {
      toast.error('Failed to add instance');
    }
  };

  const handleRemoveInstance = async () => {
    try {
      const res = await analyticsAPI.removeInstance();
      if (res.data.current_instances !== undefined) setCurrentInstances(res.data.current_instances);
      toast.success('Instance removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove instance');
    }
  };

  // Process data for charts
  const chartData = history.slice().reverse().map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    load: item.predicted_load,
    action: item.action
  }));

  const calculateActionCounts = (historyArray) => {
    const counts = { 'SCALE UP': 0, 'SCALE DOWN': 0, 'NO ACTION': 0 };
    historyArray.forEach(item => {
      if (counts[item.action] !== undefined) {
        counts[item.action]++;
      } else {
        counts['NO ACTION']++;
      }
    });
    return [
      { name: 'Scale Up', value: counts['SCALE UP'], color: '#ef4444' },
      { name: 'Scale Down', value: counts['SCALE DOWN'], color: '#10b981' },
      { name: 'No Action', value: counts['NO ACTION'], color: '#f59e0b' },
    ];
  };

  const actionDistData = calculateActionCounts(history);

  return (
    <div className="space-y-8 animate-fade-in pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/60 backdrop-blur-xl p-6 rounded-2xl border border-white/40 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 tracking-tight">
            AI Predictive Cloud Load Management
          </h1>
          <p className="text-gray-500 mt-1 font-medium">Real-time SaaS operational overview & automated scaling</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="flex bg-gray-100 p-1.5 rounded-xl border border-gray-200/60 shadow-inner w-full sm:w-auto justify-center">
            <Button size="sm" variant="ghost" className="text-sm bg-white shadow-sm rounded-lg px-4 py-1.5 font-semibold text-gray-800 transition-all hover:bg-gray-50 hover:text-gray-900">Today</Button>
            <Button size="sm" variant="ghost" className="text-sm text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg px-4 py-1.5 transition-all">Week</Button>
            <Button size="sm" variant="ghost" className="text-sm text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg px-4 py-1.5 transition-all">Month</Button>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center justify-center flex-1 sm:flex-none gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
            >
              <Download size={14} /> CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center justify-center flex-1 sm:flex-none gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
            >
              <FileText size={14} /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Predicted Load Card */}
        <Card className="p-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 text-white border-none shadow-2xl shadow-indigo-500/30 transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500"></div>
          <div className="flex justify-between items-center mb-6 relative z-10">
            <h3 className="text-indigo-100 font-semibold tracking-wide uppercase text-sm">Predicted Load</h3>
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-5xl font-extrabold tracking-tight mb-1">{latestPrediction?.predicted_load?.toFixed(1) || 0}<span className="text-2xl opacity-70 font-medium ml-1">%</span></p>
            <div className="flex items-center text-indigo-100 text-sm font-medium">
              <Clock className="w-4 h-4 mr-1.5 opacity-80" />
              {latestPrediction ? new Date(latestPrediction.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'No data available'}
            </div>
          </div>
        </Card>

        {/* Intelligence Action Card */}
        <Card className="p-6 bg-white border border-gray-100 shadow-xl shadow-gray-200/40 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-gray-500 font-semibold tracking-wide uppercase text-sm flex items-center"><Lightbulb className="w-4 h-4 mr-1.5" /> Intelligence Engine</h3>
              <div className={`p-2.5 rounded-xl transition-colors ${
                latestPrediction?.action === 'SCALE UP' ? 'bg-red-50 text-red-600 shadow-sm border border-red-100' :
                latestPrediction?.action === 'SCALE DOWN' ? 'bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100' : 
                'bg-blue-50 text-blue-600 shadow-sm border border-blue-100'
              }`}>
                {latestPrediction?.action === 'SCALE UP' ? <TrendingUp className="w-5 h-5" /> : 
                 latestPrediction?.action === 'SCALE DOWN' ? <TrendingDown className="w-5 h-5" /> : 
                 <Minus className="w-5 h-5" />}
              </div>
            </div>
            
            <p className={`text-3xl font-black tracking-tight mb-1 ${
              latestPrediction?.action === 'SCALE UP' ? 'text-red-600' :
              latestPrediction?.action === 'SCALE DOWN' ? 'text-emerald-600' : 
              'text-blue-600'
            }`}>
              {latestPrediction?.action || 'NO ACTION'}
            </p>
            
            {/* Explicit Recommendation Message */}
            <p className="text-sm font-semibold text-gray-500 mb-4 leading-snug pr-4">
              {latestPrediction?.recommendation_message || 'Maintain current active clusters to ensure optimal uptime.'}
            </p>
          </div>
          
          <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
               <Zap className="w-3.5 h-3.5 mr-1" /> Confidence
            </span>
            <span className={`text-sm font-black px-2.5 py-1 rounded-md border ${
              (latestPrediction?.confidence_score || (latestPrediction?.confidence * 100)) >= 80 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                : 'bg-amber-50 text-amber-700 border-amber-100'
            }`}>
              {latestPrediction?.confidence_score || (latestPrediction?.confidence * 100)?.toFixed(0) || 0}%
            </span>
          </div>
        </Card>

        {/* System Status Card */}
        <Card className="p-6 bg-white border border-gray-100 shadow-xl shadow-gray-200/40 hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-gray-500 font-semibold tracking-wide uppercase text-sm">AI Alert Status</h3>
            <div className={`p-2.5 rounded-xl transition-colors ${
              alertLevel === 'Critical' ? 'bg-red-50 text-red-600' :
              alertLevel === 'Warning' ? 'bg-amber-50 text-amber-600' :
              'bg-emerald-50 text-emerald-600'
            }`}>
              <Server className="w-5 h-5" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex items-center justify-center">
                <div className={`w-3.5 h-3.5 rounded-full animate-ping absolute opacity-75 ${
                  alertLevel === 'Critical' ? 'bg-red-500' :
                  alertLevel === 'Warning' ? 'bg-amber-500' :
                  'bg-emerald-500'
                }`}></div>
                <div className={`w-3.5 h-3.5 rounded-full relative border-2 border-white shadow-sm ${
                  alertLevel === 'Critical' ? 'bg-red-500' :
                  alertLevel === 'Warning' ? 'bg-amber-500' :
                  'bg-emerald-500'
                }`}></div>
              </div>
              <p className={`text-3xl font-extrabold tracking-tight ${
                alertLevel === 'Critical' ? 'text-red-600' :
                alertLevel === 'Warning' ? 'text-amber-500' :
                'text-indigo-900'
              }`}>{alertLevel || 'Checking...'}</p>
            </div>
            
            <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-4 mt-2">
              <span className="text-gray-400 font-medium flex items-center"><Activity className="w-3.5 h-3.5 mr-1" /> Scaling Events (1h)</span>
              <span className="text-gray-800 font-bold bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">{systemStats.scaling_frequency || 0}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm mt-3">
              <span className="text-gray-400 font-medium flex items-center"><Zap className="w-3.5 h-3.5 mr-1" /> Real-Time CPU</span>
              <span className="text-gray-800 font-bold bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">{systemStats.cpu_percent?.toFixed(1) || 0}%</span>
            </div>
            
            <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-4 mt-3">
              <span className="text-gray-500 font-bold flex items-center"><Activity className="w-4 h-4 mr-1.5 opacity-70" /> System Rating</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shadow-sm ${
                  systemStats.performance_status === 'Excellent' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  systemStats.performance_status === 'Good' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {systemStats.performance_status || 'Calculating'}
                </span>
                <span className="text-gray-900 font-extrabold text-lg">{systemStats.performance_score || 0}<span className="text-xs text-gray-400 font-bold ml-0.5">/100</span></span>
              </div>
            </div>
          </div>
        </Card>

      </div>

      {/* Server Cluster Component */}
      <Card className="p-6 bg-white border border-gray-100 shadow-xl shadow-gray-200/40 hover:-translate-y-1 transition-all duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center">
              <Server className="w-5 h-5 mr-2 text-indigo-500" />
              Active Server Cluster
            </h3>
            <p className="text-sm text-gray-500 font-medium mt-1">Simulated load balancer instance pool</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm transition-colors">
              Recommended nodes: <span className="text-indigo-600 font-bold ml-1">{recommendedInstances}</span>
            </span>
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-inner">
              <Button onClick={handleRemoveInstance} disabled={currentInstances <= 1} size="sm" variant="ghost" className="h-8 w-8 p-0 bg-white text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-lg shadow-sm disabled:opacity-50 transition-colors">
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-8 text-center font-bold text-gray-800">{currentInstances}</span>
              <Button onClick={handleAddInstance} size="sm" variant="ghost" className="h-8 w-8 p-0 bg-white text-gray-600 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg shadow-sm transition-colors">
                <Zap className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl border border-gray-100 p-6 min-h-[140px] flex items-center justify-center relative overflow-hidden shadow-inner">
          <div className="flex flex-wrap justify-center gap-4 relative z-10 w-full">
            {Array.from({ length: Math.max(currentInstances, 1) }).map((_, idx) => (
              <div 
                key={`node-${currentInstances}-${idx}`} 
                className="animate-fade-in flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 w-24 h-28 transform hover:-translate-y-1 transition-all relative group"
                style={{ animationFillMode: 'both', animationDuration: '400ms', animationDelay: `${idx * 50}ms` }}
              >
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                <Server className="w-8 h-8 text-indigo-500 mb-2 group-hover:text-indigo-600 transition-colors" />
                <span className="text-xs font-bold text-gray-600 tracking-wider">NODE-{idx + 1}</span>
              </div>
            ))}
          </div>
          {/* Subtle background grid effect */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>
      </Card>

      {/* Scheduled Prediction Automation Engine */}
      <AutoPredictionControl />

      {/* Smart Insights */}
      {insights && (
        <div className="mt-8 mb-4">
          <div className="flex items-center gap-2 mb-4 text-indigo-700">
            <Lightbulb className="w-5 h-5 drop-shadow-sm" />
            <h2 className="text-xl font-extrabold tracking-tight">Smart Insights</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 border-l-4 border-l-indigo-500 shadow-sm bg-white hover:-translate-y-1 transition-transform">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Peak Usage Time</span>
                <Clock className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-2xl font-black text-gray-900">{insights.peak_time}</p>
              <p className="text-xs text-gray-400 mt-2 font-medium">Historically the highest average cloud load</p>
            </Card>

            <Card className="p-5 border-l-4 border-l-amber-500 shadow-sm bg-white hover:-translate-y-1 transition-transform">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Frequent Action</span>
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-gray-900 capitalize">{insights.frequent_action}</p>
              <p className="text-xs text-gray-400 mt-2 font-medium">Most common ML scaling decision</p>
            </Card>

            <Card className={`p-5 border-l-4 shadow-sm bg-white hover:-translate-y-1 transition-transform ${insights.trend === 'Increasing' ? 'border-l-red-500' : insights.trend === 'Decreasing' ? 'border-l-green-500' : 'border-l-blue-500'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overall Trend</span>
                {insights.trend === 'Increasing' ? <TrendingUp className="w-5 h-5 text-red-500 drop-shadow-sm" /> : insights.trend === 'Decreasing' ? <TrendingDown className="w-5 h-5 text-green-500 drop-shadow-sm" /> : <Minus className="w-5 h-5 text-blue-500 drop-shadow-sm" />}
              </div>
              <p className="text-2xl font-black text-gray-900">{insights.trend}</p>
              <p className="text-xs text-gray-400 mt-2 font-medium">Moving average load comparison over 30 days</p>
            </Card>
          </div>
        </div>
      )}

      {/* System Analytics Quick View */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Predictions', value: stats?.total_predictions || 0, icon: <Activity className="w-4 h-4 text-indigo-500" /> },
          { label: 'Average Load', value: `${(stats?.avg_load || 0).toFixed(1)}%`, icon: <Server className="w-4 h-4 text-blue-500" /> },
          { label: 'Scale Up Actions', value: stats?.action_counts?.['SCALE UP'] || 0, icon: <ArrowUp className="w-4 h-4 text-red-500" /> },
          { label: 'Scale Down Actions', value: stats?.action_counts?.['SCALE DOWN'] || 0, icon: <ArrowDown className="w-4 h-4 text-emerald-500" /> }
        ].map((stat, idx) => (
          <Card key={idx} className="p-4 bg-white border border-gray-100 shadow-sm flex items-center gap-4 hover:-translate-y-0.5 transition-transform">
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-100/50">
              {stat.icon}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Section */}
        <Card className="p-6 lg:col-span-2 bg-white border border-gray-100 shadow-xl shadow-gray-200/40 rounded-2xl overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-gray-50">
            <div>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Load Prediction Trend</h3>
              <p className="text-sm text-gray-500 font-medium mt-1">24-Hour Forecast Analysis</p>
            </div>
            <select className="mt-4 sm:mt-0 bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 font-medium outline-none shadow-sm cursor-pointer">
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
            </select>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} minTickGap={20} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)', color: '#fff', padding: '12px 16px' }}
                  itemStyle={{ color: '#fff', fontWeight: 600 }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}
                  cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Line
                  type="monotone"
                  dataKey="load"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Real System Metrics Footers */}
          <div className="mt-8 grid grid-cols-2 gap-6 border-t border-gray-50 pt-6">
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 mb-3 tracking-wide uppercase">Active Memory</h4>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-2xl font-extrabold text-gray-900">{systemStats.memory_percent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 shadow-inner">
                <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${systemStats.memory_percent}%` }}></div>
              </div>
            </div>
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 mb-3 tracking-wide uppercase">Network Pipeline</h4>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-2xl font-extrabold text-gray-900">{formatBytes(systemStats.network_rate)}<span className="text-sm text-gray-500 font-medium tracking-normal ml-0.5">/s</span></span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 shadow-inner overflow-hidden">
                <div className="bg-gradient-to-r from-blue-400 to-cyan-400 h-1.5 rounded-full animate-progress-indeterminate w-1/2"></div>
              </div>
            </div>
          </div>
        </Card>

        {/* Prediction Input Form Widget */}
        <div className="space-y-6">
          <Card className="p-1 rounded-2xl bg-gradient-to-b from-gray-50 to-white shadow-xl shadow-gray-200/50 border border-gray-100">
            <div className="bg-white rounded-xl p-6 lg:p-7 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900">Run Prediction</h3>
                  <p className="text-xs text-gray-500 font-medium">Simulate load forecasting</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Target Hour (0-23)</label>
                  <div className="flex gap-3">
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(parseInt(e.target.value))}
                      className="text-lg font-bold text-center h-12 shadow-inner border-gray-200 focus:ring-indigo-500"
                    />
                    <Button 
                      onClick={handlePredict} 
                      isLoading={predicting}
                      className="h-12 px-6 font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all rounded-xl"
                    >
                      Analyze
                    </Button>
                  </div>
                </div>

                {/* Animated Results Block */}
                <div className={`transition-all duration-500 ease-out overflow-hidden ${predictionResult ? 'opacity-100 max-h-96 transform translate-y-0' : 'opacity-0 max-h-0 transform -translate-y-4'}`}>
                  {predictionResult && (
                    <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                      
                      {predictionResult.alert_level && (
                        <div className={`p-4 rounded-xl border flex items-center gap-3 shadow-sm ${
                            predictionResult.alert_level === 'CRITICAL ALERT' ? 'bg-red-600 text-white border-red-700 animate-pulse' : 'bg-orange-500 text-white border-orange-600'
                        }`}>
                            <Activity className="w-6 h-6 flex-shrink-0 animate-bounce" />
                            <div>
                                <h3 className="font-extrabold uppercase tracking-widest text-sm">{predictionResult.alert_level}</h3>
                                <p className="text-xs opacity-90 font-medium">System load is forecasted to exceed safe administrative capacities.</p>
                            </div>
                        </div>
                      )}

                      <div className={`p-5 rounded-xl border ${
                        predictionResult.scaling_level === 'CRITICAL' ? 'bg-red-50/50 border-red-200 text-red-900' :
                        predictionResult.scaling_level === 'HIGH' ? 'bg-orange-50/50 border-orange-200 text-orange-900' :
                        predictionResult.scaling_level === 'LOW' ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' :
                        'bg-blue-50/50 border-blue-200 text-blue-900'
                      }`}>
                        <div className="flex items-center justify-between mb-3 border-b border-black/5 pb-3">
                          <span className="text-xs font-bold tracking-wider uppercase opacity-70">AI Recommendation</span>
                          <div className="flex items-center gap-2">
                            {predictionResult.scaling_level === 'CRITICAL' && <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded bg-red-600 text-white uppercase animate-pulse shadow-sm">Critical Load</span>}
                            <span className={`text-sm font-extrabold px-2.5 py-1 rounded-md capitalize shadow-sm ${
                              predictionResult.scaling_level === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                              predictionResult.scaling_level === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                              predictionResult.scaling_level === 'LOW' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>{predictionResult.action}</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs font-semibold opacity-60 mb-0.5">Forecast Load</p>
                            <p className="text-2xl font-black">{predictionResult.predicted_cpu_load}%</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold opacity-60 mb-0.5">Recommended Nodes</p>
                            <p className="text-2xl font-black tracking-tight text-indigo-900">{predictionResult.recommended_instances || 4}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold opacity-60 mb-0.5">Current Base</p>
                            <p className="text-xl font-bold opacity-80">{predictionResult.current_real_load}%</p>
                          </div>
                        </div>

                        {predictionResult.estimated_cost !== undefined && (
                          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-black/5">
                            <div>
                              <p className="text-xs font-semibold opacity-60 mb-0.5">Estimated Cost</p>
                              <p className="text-xl font-black text-gray-800">${predictionResult.estimated_cost}/hr</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold opacity-60 mb-0.5">Projected Savings</p>
                              <p className={`text-xl font-bold ${predictionResult.savings > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {predictionResult.savings > 0 ? '+' : ''}${predictionResult.savings}/hr
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-black/5 bg-gray-50/50 -mx-5 -mb-5 p-5 rounded-b-xl">
                            <p className="text-[10px] font-bold tracking-widest uppercase opacity-50 mb-1">AI Engine Architecture</p>
                            <div className="flex justify-between items-center">
                                <p className="text-sm font-black text-indigo-900">{predictionResult.model_info || 'Analyzing...'}</p>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">{predictionResult.model_accuracy || 0}% Accuracy</span>
                            </div>
                        </div>
                      </div>

                      {predictionResult.anomaly_status && predictionResult.anomaly_status.status !== 'NORMAL' && (
                        <div className="flex items-start gap-3 p-4 bg-orange-50 text-orange-800 rounded-xl border border-orange-200/60 shadow-inner">
                          <Activity className="w-5 h-5 flex-shrink-0 text-orange-500 mt-0.5" />
                          <div>
                            <span className="text-sm font-bold block mb-0.5">Anomaly Detected</span>
                            <span className="text-xs font-medium opacity-90">{predictionResult.anomaly_status.message}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border border-gray-100 shadow-xl shadow-gray-200/40 rounded-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">Action Distribution</h3>
            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={actionDistData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} dy={5} />
                  <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
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
      
      {/* Live Telemetry Section */}
      <Card className="p-6 bg-gray-900 border border-gray-800 shadow-2xl rounded-2xl overflow-hidden mt-8 text-white relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-gray-800">
          <div>
            <h3 className="text-xl font-bold tracking-tight flex items-center">
              <Activity className="w-5 h-5 mr-3 text-emerald-400 animate-pulse" />
              Live Server Telemetry
            </h3>
            <p className="text-sm text-gray-400 font-medium mt-1">Real-time simulated active connection stream (5s resolution)</p>
          </div>
          <div className="mt-4 sm:mt-0 px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700 flex items-center shadow-inner">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-2"></div>
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Live</span>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={liveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
              <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
              <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', borderRadius: '8px', border: '1px solid #374151', color: '#fff' }} />
              <Area type="monotone" dataKey="cpu_load" stroke="#34d399" strokeWidth={3} fillOpacity={1} fill="url(#colorCpu)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      
    </div>
  );
};

export default Dashboard;
