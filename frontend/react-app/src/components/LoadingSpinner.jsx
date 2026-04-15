import React from 'react';
import { CloudCog } from 'lucide-react';

const LoadingSpinner = ({ message = 'Initializing Cloud Environment...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-700">
      <div className="relative flex justify-center items-center w-24 h-24">
        {/* Outer glowing ring */}
        <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-50 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-600 rounded-full animate-spin border-t-transparent shadow-[0_0_15px_rgba(79,70,229,0.3)]"></div>
        {/* Inner static branding */}
        <CloudCog className="w-10 h-10 text-indigo-600 drop-shadow-md animate-pulse" />
      </div>
      <div className="flex flex-col items-center text-center">
        <p className="text-gray-800 font-bold text-lg tracking-tight">{message}</p>
        <p className="text-gray-400 text-sm font-medium animate-pulse mt-1 max-w-[250px]">Please hold on while we securely fetch your data</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;