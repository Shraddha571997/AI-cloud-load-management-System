import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { adminAPI } from '../services/api'; // Ensure this matches export in api.js
import { Shield, Users, Database } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [systemStats, setSystemStats] = useState(null);

    useEffect(() => {
        loadUsers();
        // Also fetch system stats for admin view if available
    }, []);

    const loadUsers = async () => {
        try {
            const res = await adminAPI.getUsers();
            setUsers(res.data);
        } catch (error) {
            console.error("Failed to load users", error);
            toast.error("Failed to load user list");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 bg-indigo-50 border-indigo-100">
                    <div className="flex items-center mb-4">
                        <Users className="w-6 h-6 text-indigo-600 mr-2" />
                        <h2 className="text-lg font-bold text-gray-900">Registered Users</h2>
                    </div>
                    <p className="text-3xl font-bold text-indigo-700">{users.length}</p>
                    <p className="text-sm text-gray-500">Total accounts in database</p>
                </Card>

                <Card className="p-6 bg-green-50 border-green-100">
                    <div className="flex items-center mb-4">
                        <Database className="w-6 h-6 text-green-600 mr-2" />
                        <h2 className="text-lg font-bold text-gray-900">Database Status</h2>
                    </div>
                    <p className="text-xl font-bold text-green-700">Connected</p>
                    <p className="text-sm text-gray-500">MongoDB Atlas</p>
                </Card>
            </div>

            <Card className="overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-md font-semibold text-gray-700">User Management</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">ID</th>
                                <th className="px-6 py-3">Username</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Role</th>
                                <th className="px-6 py-3">Phone</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user._id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono text-gray-500">{user._id}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{user.username}</td>
                                    <td className="px-6 py-4">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{user.phone || '-'}</td>
                                </tr>
                            ))}
                            {users.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default AdminPage;