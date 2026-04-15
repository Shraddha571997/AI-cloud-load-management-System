import os

filepath = 'src/pages/Dashboard.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# The logic remains exactly the same up to line 114 (1-indexed).
prefix = "".join(lines[:114])

new_jsx = """  return (
    <div className="space-y-8 animate-fade-in pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/60 backdrop-blur-xl p-6 rounded-2xl border border-white/40 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 tracking-tight">
            AI Predictive Cloud Load Management
          </h1>
          <p className="text-gray-500 mt-1 font-medium">Real-time SaaS operational overview & automated scaling</p>
        </div>
        <div className="flex bg-gray-100 p-1.5 rounded-xl border border-gray-200/60 shadow-inner">
          <Button size="sm" variant="ghost" className="text-sm bg-white shadow-sm rounded-lg px-4 py-1.5 font-semibold text-gray-800 transition-all hover:bg-gray-50 hover:text-gray-900">Today</Button>
          <Button size="sm" variant="ghost" className="text-sm text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg px-4 py-1.5 transition-all">Week</Button>
          <Button size="sm" variant="ghost" className="text-sm text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg px-4 py-1.5 transition-all">Month</Button>
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

        {/* Scaling Action Card */}
        <Card className="p-6 bg-white border border-gray-100 shadow-xl shadow-gray-200/40 hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-gray-500 font-semibold tracking-wide uppercase text-sm">Scaling Action</h3>
            <div className={`p-2.5 rounded-xl transition-colors ${
              latestPrediction?.action === 'SCALE UP' ? 'bg-red-50 text-red-600' :
              latestPrediction?.action === 'SCALE DOWN' ? 'bg-green-50 text-green-600' : 
              'bg-blue-50 text-blue-600'
            }`}>
              {latestPrediction?.action === 'SCALE UP' ? <ArrowUp className="w-5 h-5" /> : 
               latestPrediction?.action === 'SCALE DOWN' ? <ArrowDown className="w-5 h-5" /> : 
               <Minus className="w-5 h-5" />}
            </div>
          </div>
          <div>
            <p className={`text-4xl font-extrabold tracking-tight mb-2 ${
              latestPrediction?.action === 'SCALE UP' ? 'text-red-600' :
              latestPrediction?.action === 'SCALE DOWN' ? 'text-green-600' : 
              'text-blue-600'
            }`}>
              {latestPrediction?.action || 'No Action'}
            </p>
            <p className="text-sm text-gray-400 font-medium">
              Confidence score: <span className="text-gray-700">{(latestPrediction?.confidence * 100)?.toFixed(1) || 0}%</span>
            </p>
          </div>
        </Card>

        {/* System Status Card */}
        <Card className="p-6 bg-white border border-gray-100 shadow-xl shadow-gray-200/40 hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-gray-500 font-semibold tracking-wide uppercase text-sm">System Status</h3>
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <Server className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping absolute opacity-75"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 relative border-2 border-white shadow-sm"></div>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 tracking-tight">Operational</p>
            </div>
            <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-4 mt-2">
              <span className="text-gray-400 font-medium flex items-center"><Zap className="w-3.5 h-3.5 mr-1" /> Real-Time CPU</span>
              <span className="text-gray-800 font-bold bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">{systemStats.cpu_percent?.toFixed(1) || 0}%</span>
            </div>
          </div>
        </Card>

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
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} minTickGap={20} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)', color: '#fff', padding: '12px 16px' }}
                  itemStyle={{ color: '#fff', fontWeight: 600 }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}
                  cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Area
                  type="monotone"
                  dataKey="load"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorLoad)"
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
                />
              </AreaChart>
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
                      
                      <div className={`p-5 rounded-xl border ${
                        predictionResult.action === 'SCALE UP' ? 'bg-red-50/50 border-red-100 text-red-900' :
                        predictionResult.action === 'SCALE DOWN' ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900' :
                        'bg-blue-50/50 border-blue-100 text-blue-900'
                      }`}>
                        <div className="flex items-center justify-between mb-3 border-b border-black/5 pb-3">
                          <span className="text-xs font-bold tracking-wider uppercase opacity-70">AI Recommendation</span>
                          <span className={`text-sm font-extrabold px-2.5 py-1 rounded-md ${
                            predictionResult.action === 'SCALE UP' ? 'bg-red-100 text-red-700' :
                            predictionResult.action === 'SCALE DOWN' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>{predictionResult.action}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold opacity-60 mb-0.5">Forecast Load</p>
                            <p className="text-2xl font-black">{predictionResult.predicted_cpu_load}%</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold opacity-60 mb-0.5">Current Base</p>
                            <p className="text-xl font-bold opacity-80">{predictionResult.current_real_load}%</p>
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
    </div>
  );
};

export default Dashboard;
"""

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(prefix + new_jsx)
