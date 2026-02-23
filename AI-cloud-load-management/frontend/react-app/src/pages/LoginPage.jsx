import React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Cloud } from 'lucide-react';

const LoginPage = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const { login, isLoading } = useAuth();
    const navigate = useNavigate();

    const onSubmit = async (data) => {
        const result = await login(data);
        if (result.success) {
            navigate('/dashboard');
        }
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

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <Input
                        label="Username"
                        {...register('username', { required: 'Username is required' })}
                        error={errors.username?.message}
                        placeholder="Enter your username"
                    />

                    <Input
                        label="Password"
                        type="password"
                        {...register('password', { required: 'Password is required' })}
                        error={errors.password?.message}
                        placeholder="••••••••"
                    />

                    <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        isLoading={isLoading}
                    >
                        Sign In
                    </Button>

                    <p className="text-center text-sm text-gray-600">
                        Don't have an account?{' '}
                        <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                            create one
                        </Link>
                    </p>
                </form>
            </Card>
        </div>
    );
};

export default LoginPage;