import React from 'react';
import { Card } from '../components/ui/Card';
import { Construction } from 'lucide-react';

const PlaceholderPage = ({ title }) => {
    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <Card className="p-8 text-center max-w-md bg-white/50 backdrop-blur">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Construction className="w-8 h-8 text-gray-400" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
                <p className="text-gray-500">This module is currently under development. Check back later!</p>
            </Card>
        </div>
    );
};

export default PlaceholderPage;
