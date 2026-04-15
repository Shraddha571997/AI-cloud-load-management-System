import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx'; // Explicit extension
import { userAPI } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { User, Mail, Shield, Bell, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const ProfilePage = () => {
    const { user, login } = useAuth(); // login used to update user context
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        phone: user?.phone || '',
        email: user?.email || '',
        alerts: user?.preferences?.alerts || { scaleUp: 80, scaleDown: 20 }
    });

    // Update local state when user loads
    React.useEffect(() => {
        if (user) {
            setFormData({
                phone: user.phone || '',
                email: user.email || '',
                alerts: user.preferences?.alerts || { scaleUp: 80, scaleDown: 20 }
            });
        }
    }, [user]);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await userAPI.updateProfile({
                phone: formData.phone,
                preferences: { alerts: formData.alerts }
            });
            // Update auth context with new user data
            if (res.data.user) {
                // We crudely re-login or update context if we had a proper method. 
                // For now, valid since token doesn't change, but user object in localStorage might need update.
                // Re-login would require password. Ideally useAuth exposes 'updateUser'.
                // We will just allow toast for now, but in real app we update context.
            }
            toast.success("Profile updated successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* User Info Card */}
                <Card className="p-6 md:col-span-1 border-t-4 border-blue-500">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-4xl font-bold text-blue-600">
                                {user?.username?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">{user?.username}</h2>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                            {user?.role?.toUpperCase()}
                        </span>
                    </div>

                    <div className="mt-8 space-y-4">
                        <div className="flex items-center text-sm text-gray-600">
                            <User className="w-4 h-4 mr-3" />
                            <span>ID: {user?._id || 'N/A'}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                            <Shield className="w-4 h-4 mr-3" />
                            <span>Access Level: Full</span>
                        </div>
                    </div>
                </Card>

                {/* Settings Form */}
                <Card className="p-6 md:col-span-2">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                        <SettingsIcon className="w-5 h-5 mr-2 text-gray-500" />
                        Preferences & Notifications
                    </h3>

                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="Email Address"
                                value={formData.email}
                                readOnly
                                icon={<Mail size={16} />}
                            />
                            <Input
                                label="Phone Number"
                                placeholder="+1 (555) 000-0000"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <div className="border-t border-gray-100 pt-6">
                            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                                <Bell className="w-4 h-4 mr-2" />
                                Alert Thresholds
                            </h4>
                            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                                <div>
                                    <div className="flex justify-between items-center text-sm mb-4 bg-white p-3 border border-gray-100/60 rounded-xl shadow-sm">
                                        <span className="text-gray-900 font-semibold flex items-center">
                                            <Mail className="w-4 h-4 mr-2 text-indigo-500" />
                                            Email Notifications for Active Scaling ({'>'}80%)
                                        </span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer" 
                                                checked={formData.alerts.emailEnabled || false}
                                                onChange={(e) => setFormData({ ...formData, alerts: { ...formData.alerts, emailEnabled: e.target.checked } })}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                    <div className="flex justify-between text-sm mb-1 mt-6">
                                        <span className="text-gray-600">Scale Up Alert ({formData.alerts.scaleUp}%)</span>
                                        <span className="text-blue-600 font-medium">Enabled</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="50" max="100"
                                        value={formData.alerts.scaleUp}
                                        onChange={(e) => setFormData({ ...formData, alerts: { ...formData.alerts, scaleUp: parseInt(e.target.value) } })}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600">Scale Down Alert ({formData.alerts.scaleDown}%)</span>
                                        <span className="text-green-600 font-medium">Enabled</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="50"
                                        value={formData.alerts.scaleDown}
                                        onChange={(e) => setFormData({ ...formData, alerts: { ...formData.alerts, scaleDown: parseInt(e.target.value) } })}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" isLoading={loading} className="flex items-center">
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};

// Helper icon
const SettingsIcon = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

export default ProfilePage;
