import React from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
    LayoutDashboard,
    BarChart2,
    Settings,
    LogOut,
    Menu,
    X,
    History,
    CloudCog,
    Shield
} from 'lucide-react';
import { Button } from '../ui/Button';

export const DashboardLayout = ({ children }) => {
    const { logout, user } = useAuth();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'History', href: '/history', icon: History },
        { name: 'Analytics', href: '/analytics', icon: BarChart2 },
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    // Conditionally attach Admin Panel if the token resolves to role === 'admin'
    if (user?.role === 'admin') {
        navigation.push({ name: 'Admin', href: '/admin', icon: Shield });
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Top Navbar */}
            <header className="bg-white border-b border-gray-200 shadow-sm z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        {/* Logo & Desktop Nav */}
                        <div className="flex items-center">
                            <div className="flex-shrink-0 flex items-center mr-8">
                                <CloudCog className="h-8 w-8 text-indigo-600 mr-2" />
                                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight">
                                    CloudScale
                                </span>
                            </div>
                            <nav className="hidden md:ml-6 md:flex md:space-x-2">
                                {navigation.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.href;
                                    return (
                                        <Link
                                            key={item.name}
                                            to={item.href}
                                            className={clsx(
                                                "inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                                                isActive
                                                    ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100"
                                                    : "text-gray-500 hover:bg-gray-50 hover:text-indigo-600"
                                            )}
                                        >
                                            <Icon size={18} className={clsx("mr-2", isActive ? "text-indigo-600" : "text-gray-400")} />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>
                        
                        {/* User & Logout (Desktop) */}
                        <div className="hidden md:flex items-center">
                            <div className="flex items-center space-x-3 mr-4 border-r border-gray-200 pr-4">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 shadow-sm">
                                    {user?.username?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-700 leading-tight">{user?.username}</span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">{user?.role}</span>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                className="text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors font-semibold"
                                onClick={logout}
                            >
                                <LogOut size={18} className="mr-2" />
                                Logout
                            </Button>
                        </div>

                        {/* Mobile menu button */}
                        <div className="flex items-center md:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-gray-100 focus:outline-none transition-colors"
                            >
                                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden border-t border-gray-200 bg-white shadow-xl absolute w-full z-50 animate-in slide-in-from-top-2">
                        <div className="px-4 py-3 space-y-1">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={clsx(
                                            "flex items-center px-3 py-3 rounded-md text-base font-semibold transition-colors",
                                            isActive
                                                ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                                                : "text-gray-600 hover:bg-gray-50 hover:text-indigo-600"
                                        )}
                                    >
                                        <Icon size={20} className={clsx("mr-3", isActive ? "text-indigo-600" : "text-gray-400")} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                        <div className="pt-4 pb-4 border-t border-gray-100 bg-gray-50">
                            <div className="flex items-center px-5 mb-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 mr-3 shadow-sm">
                                    {user?.username?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-base font-bold text-gray-800 leading-tight">{user?.username}</span>
                                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{user?.role}</span>
                                </div>
                            </div>
                            <div className="px-4">
                                <Button
                                    variant="ghost"
                                    className="w-full flex justify-center items-center text-red-600 hover:bg-red-100 bg-white border border-red-100 shadow-sm py-2 rounded-lg font-bold transition-colors"
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        logout();
                                    }}
                                >
                                    <LogOut size={18} className="mr-2" />
                                    Sign Out
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};
