import React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Cloud } from 'lucide-react';

const RegisterPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { register: registerUser, isLoading } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    const result = await registerUser(data);
    if (result.success) {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"></div>

      <Card className="w-full max-w-md p-8 relative z-10 border-none shadow-2xl bg-white/90 backdrop-blur-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
            <Cloud className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-2">Start optimizing your cloud infrastructure</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Username"
            {...register('username', { required: 'Username is required' })}
            error={errors.username?.message}
            placeholder="Choose a username"
          />

          <Input
            label="Email"
            type="email"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address"
              }
            })}
            error={errors.email?.message}
            placeholder="you@company.com"
          />

          <Input
            label="Password"
            type="password"
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters"
              }
            })}
            error={errors.password?.message}
            placeholder="••••••••"
          />

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/30"
            size="lg"
            isLoading={isLoading}
          >
            Create Account
          </Button>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
              Sign in
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
};

export default RegisterPage;
