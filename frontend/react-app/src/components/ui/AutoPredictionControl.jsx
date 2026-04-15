import React, { useState, useEffect } from 'react';
import { Settings, Play, Square, Clock, Activity, Zap } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { autopilotAPI } from '../../services/api';
import toast from 'react-hot-toast';

export const AutoPredictionControl = () => {
  const [config, setConfig] = useState({
    is_enabled: false,
    interval_minutes: 15,
    last_run: null,
    next_run: null
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [localInterval, setLocalInterval] = useState(15);

  const fetchConfig = async () => {
    try {
      const res = await autopilotAPI.getStatus();
      setConfig(res.data);
      setLocalInterval(res.data.interval_minutes);
    } catch (err) {
      console.error("Failed to fetch scheduler config", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    const pollId = setInterval(fetchConfig, 30000); // Poll every 30s to update next_run
    return () => clearInterval(pollId);
  }, []);

  const handleStart = async () => {
    setUpdating(true);
    try {
      await autopilotAPI.start({
        interval_minutes: localInterval > 0 ? localInterval : 15
      });
      await fetchConfig();
      toast.success('Auto-pilot engaged');
    } catch (err) {
      toast.error('Failed to start auto-pilot');
    } finally {
      setUpdating(false);
    }
  };

  const handleStop = async () => {
    setUpdating(true);
    try {
      await autopilotAPI.stop();
      await fetchConfig();
      toast.success('Auto-pilot disabled');
    } catch (err) {
      toast.error('Failed to stop auto-pilot');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return null;

  return (
    <Card className={`p-6 border-l-4 transition-all duration-500 shadow-xl ${config.is_enabled ? 'border-l-emerald-500 bg-emerald-50/10' : 'border-l-gray-300 bg-white'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-xl text-white ${config.is_enabled ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-gray-400'}`}>
              <Activity className={`w-5 h-5 ${config.is_enabled ? 'animate-pulse' : ''}`} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">Cloud Automation Engine</h3>
            {/* Explicit Status Pill */}
            <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-widest rounded-full border ${config.is_enabled ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                {config.is_enabled ? 'Running' : 'Stopped'}
            </span>
          </div>
          <p className="text-sm text-gray-500 font-medium">Auto-pilot predictive load forecasting and scalable heuristics</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Status Display */}
          <div className="flex flex-col items-end">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1 flex items-center">
               <Clock className="w-3.5 h-3.5 mr-1" />
               Scheduling Log
            </div>
            <div className="text-sm font-medium text-gray-700">
              <span className="opacity-70 mr-2">Last execution time:</span>
              <span className="font-bold">{config.last_run ? new Date(config.last_run).toLocaleTimeString() : 'Never'}</span>
            </div>
            {config.is_enabled && config.next_run && (
               <div className="text-sm font-medium text-emerald-700 mt-0.5">
                <span className="opacity-70 mr-2">Next prediction at:</span>
                <span className="font-bold">{new Date(config.next_run).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
          
          <div className="h-10 w-px bg-gray-200 hidden sm:block mx-2"></div>

          {/* Controls */}
          <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
            <div className="relative flex items-center">
              <span className="text-xs font-bold text-gray-400 absolute left-3 z-10">EVERY</span>
              <Input
                type="number"
                min="1"
                max="1440"
                value={localInterval}
                onChange={(e) => setLocalInterval(parseInt(e.target.value))}
                disabled={config.is_enabled || updating}
                className="w-32 pl-14 pr-3 py-2 text-sm font-bold shadow-inner border-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-xs font-bold text-gray-400 ml-2">MIN</span>
            </div>
            
            {config.is_enabled ? (
              <Button
                onClick={handleStop}
                isLoading={updating}
                variant="danger"
                className="px-4 py-2 flex items-center transition-colors bg-red-500 hover:bg-red-600 font-bold"
              >
                <Square className="w-4 h-4 mr-2 border-white fill-white" /> Stop Auto-Pilot
              </Button>
            ) : (
              <Button
                onClick={handleStart}
                isLoading={updating}
                variant="primary"
                className="px-4 py-2 flex items-center transition-colors bg-emerald-600 hover:bg-emerald-700 font-bold"
              >
                <Play className="w-4 h-4 mr-2 border-white fill-white" /> Start Auto-Pilot
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
