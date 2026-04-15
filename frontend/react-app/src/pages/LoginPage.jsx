import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Cloud, Lock, Mail } from 'lucide-react';

const LoginPage = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const { login, sendOtp, loginWithOtp, isLoading } = useAuth();
    const navigate = useNavigate();

    // Dual-Mode State Variables
    const [loginMode, setLoginMode] = useState('otp'); // 'password' or 'otp'
    const [otpStep, setOtpStep] = useState(1); // 1: Enter Email, 2: Enter Code
    const [otpEmail, setOtpEmail] = useState('shraddha.605@gmail.com');
    const [otpCode, setOtpCode] = useState('');

    const onSubmitPassword = async (data) => {
        const result = await login(data);
        if (result.success && result.user) {
            if (result.user.role === 'admin') navigate('/admin');
            else navigate('/dashboard');
        }
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!otpEmail) return;
        const result = await sendOtp(otpEmail);
        if (result.success) setOtpStep(2);
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!otpCode || otpCode.length !== 6) return;
        const result = await loginWithOtp(otpEmail, otpCode);
        if (result.success) navigate('/dashboard');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-[url('https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"></div>

            <Card className="w-full max-w-md p-8 relative z-10 border-none shadow-2xl bg-white/90 backdrop-blur-md">
                <div className="text-center mb-8">
                    <div className="mx-auto w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
                        <Cloud className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
                    <p className="text-gray-500 mt-2">Sign in to manage your cloud resources</p>
                </div>

                {/* Login Mode Toggle */}
                <div className="flex bg-gray-200/50 p-1 rounded-lg mb-6">
                    <button
                        type="button"
                        onClick={() => { setLoginMode('password'); setOtpStep(1); }}
                        className={`flex-1 flex justify-center items-center py-2 text-sm font-medium rounded-md transition-all ${loginMode === 'password' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <Lock className="w-4 h-4 mr-2" />
                        Password
                    </button>
                    <button
                        type="button"
                        onClick={() => setLoginMode('otp')}
                        className={`flex-1 flex justify-center items-center py-2 text-sm font-medium rounded-md transition-all ${loginMode === 'otp' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <Mail className="w-4 h-4 mr-2" />
                        Email OTP
                    </button>
                </div>

                {/* Password Mode Form */}
                {loginMode === 'password' && (
                    <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-6">
                        <Input
                            label="Email or Username"
                            {...register('identifier', { required: 'Email or Username is required' })}
                            error={errors.identifier?.message}
                            placeholder="user@example.com or username"
                        />
                        <Input
                            label="Password"
                            type="password"
                            {...register('password', { required: 'Password is required' })}
                            error={errors.password?.message}
                            placeholder="••••••••"
                        />
                        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                            Sign In via Password
                        </Button>
                    </form>
                )}

                {/* OTP Mode Form */}
                {loginMode === 'otp' && (
                    <div className="space-y-6">
                        {otpStep === 1 ? (
                            <form onSubmit={handleSendOtp} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow bg-white/50 backdrop-blur-sm"
                                        placeholder="admin@cloudscale.ai"
                                        value={otpEmail}
                                        onChange={(e) => setOtpEmail(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                                <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                                    Send Verification Code
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOtp} className="space-y-6">
                                <div className="text-center text-sm text-gray-600 mb-4">
                                    We sent a 6-digit code to <strong>{otpEmail}</strong>.<br/>It expires in 5 minutes.
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">6-Digit OTP</label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={6}
                                        className="w-full px-4 py-3 text-center tracking-widest text-2xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow bg-white/50 backdrop-blur-sm"
                                        placeholder="000000"
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                                <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                                    Verify & Login
                                </Button>
                                <button
                                    type="button"
                                    onClick={() => { setOtpStep(1); setOtpCode(''); }}
                                    className="w-full text-sm text-blue-600 hover:text-blue-500 mt-2"
                                    disabled={isLoading}
                                >
                                    Use a different email
                                </button>
                            </form>
                        )}
                    </div>
                )}

                <p className="text-center text-sm text-gray-600 mt-6">
                    Don't have an account?{' '}
                    <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                        create one
                    </Link>
                </p>
            </Card>
        </div>
    );
};

export default LoginPage;