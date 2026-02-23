import React from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
    LayoutDashboard,
    Activity,
    BarChart2,
    Settings,
    LogOut,
    Menu,
    X,
    User
} from 'lucide-react';
import { Button } from '../ui/Button';

export const DashboardLayout = ({ children }) => {
    const { logout, user } = useAuth();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Predictions', href: '/predict', icon: Activity },
        { name: 'Analytics', href: '/analytics', icon: BarChart2 },
        { name: 'Admin', href: '/admin', icon: Settings, adminOnly: true },
        { name: 'Profile', href: '/profile', icon: User },
    ];

    const filteredNav = navigation.filter(item => !item.adminOnly || user?.role === 'admin');

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className={clsx(
                "fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-between h-16 px-6 bg-gray-800/50">
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                        CloudScale AI
                    </span>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <nav className="p-4 space-y-1">
                    {filteredNav.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={clsx(
                                    "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                                )}
                            >
                                <Icon size={20} />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="absolute bottom-0 w-full p-4 border-t border-gray-800">
                    <div className="flex items-center space-x-3 px-4 py-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold">
                            {user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user?.username}</p>
                            <p className="text-xs text-gray-400 truncate">{user?.role}</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        onClick={logout}
                    >
                        <LogOut size={20} className="mr-3" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <header className="bg-white border-b border-gray-200 lg:hidden user-select-none">
                    <div className="flex items-center justify-between h-16 px-4">
                        <span className="text-lg font-bold text-gray-900">CloudScale AI</span>
                        <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-500">
                            <Menu size={24} />
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};
