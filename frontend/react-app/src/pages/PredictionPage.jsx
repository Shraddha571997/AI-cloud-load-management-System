import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import { Card } from '../components/ui/Card';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import toast from 'react-hot-toast';

const PredictionPage = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await analyticsAPI.getHistory({ limit: 50 });
            setHistory(res.data.items || []);
        } catch (error) {
            toast.error("Failed to load history");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Prediction History</h1>
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3">Time</th>
                                <th className="px-6 py-3">Predicted Load</th>
                                <th className="px-6 py-3">Action</th>
                                <th className="px-6 py-3">Confidence</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" className="text-center py-4">Loading...</td></tr>
                            ) : history.length === 0 ? (
                                <tr><td colSpan="4" className="text-center py-4">No records found</td></tr>
                            ) : (
                                history.map((item, index) => (
                                    <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {new Date(item.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.predicted_load.toFixed(1)}%
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {item.action === 'SCALE UP' && <ArrowUp size={16} className="text-red-500" />}
                                                {item.action === 'SCALE DOWN' && <ArrowDown size={16} className="text-green-500" />}
                                                {item.action === 'NO ACTION' && <Minus size={16} className="text-yellow-500" />}
                                                <span className={
                                                    item.action === 'SCALE UP' ? 'text-red-600 font-medium' :
                                                        item.action === 'SCALE DOWN' ? 'text-green-600 font-medium' :
                                                            'text-yellow-600'
                                                }>{item.action}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {(item.confidence * 100).toFixed(1)}%
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default PredictionPage;