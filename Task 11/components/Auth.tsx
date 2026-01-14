import React, { useState } from 'react';
import { User } from '../types';
import * as api from '../services/api';
import { Hexagon, ArrowRight, ShieldCheck, Zap, Users, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [university, setUniversity] = useState('');
  const [skills, setSkills] = useState('');
  const [bio, setBio] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email: string) => {
    const eduRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.(edu|ac\.[a-z]{2})$/;
    return eduRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('All fields are required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please use a valid university email (.edu or .ac)');
      return;
    }

    if (!validatePassword(password)) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (isSignUp && !name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (isSignUp && !university.trim()) {
      setError('Please enter your university name');
      return;
    }

    if (isSignUp && !skills.trim()) {
      setError('Please enter at least one skill');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
        const { user } = await api.register({
          email,
          password,
          name,
          university,
          skills: skillsArray,
          bio: bio.trim() || undefined
        });
        onLogin(user);
      } else {
        const { user } = await api.login(email, password);
        onLogin(user);
      }
    } catch (error: any) {
      setError(error.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Side: Visuals */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12 text-white">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-50 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-30"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-12">
            <Hexagon className="w-8 h-8 text-violet-400 fill-violet-400" />
            <span className="font-bold text-2xl tracking-tight">BidYourSkill</span>
          </div>
          
          <h1 className="text-5xl font-extrabold leading-tight mb-6">
            The marketplace for <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-emerald-400">
              student talent.
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md">
            Stop waiting for graduation to build your career. Start freelancing on campus today.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-6">
          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
            <Zap className="w-6 h-6 text-yellow-400 mb-2" />
            <h3 className="font-bold">Fast Payouts</h3>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
            <ShieldCheck className="w-6 h-6 text-emerald-400 mb-2" />
            <h3 className="font-bold">Secure</h3>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
            <Users className="w-6 h-6 text-violet-400 mb-2" />
            <h3 className="font-bold">Peers Only</h3>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-slate-50 lg:bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="flex justify-center lg:justify-start lg:hidden mb-6">
               <Hexagon className="w-10 h-10 text-violet-600 fill-violet-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900">Get Started</h2>
            <p className="mt-2 text-slate-500">Sign in with your university email to verify your status.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {isSignUp && (
              <>
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-semibold text-slate-700">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required={isSignUp}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 focus:outline-none transition-all"
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="university" className="text-sm font-semibold text-slate-700">
                    University/School
                  </label>
                  <input
                    id="university"
                    type="text"
                    required={isSignUp}
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 focus:outline-none transition-all"
                    placeholder="Harvard University"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="skills" className="text-sm font-semibold text-slate-700">
                    Your Skills
                  </label>
                  <input
                    id="skills"
                    type="text"
                    required={isSignUp}
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 focus:outline-none transition-all"
                    placeholder="Web Design, Photography, Tutoring"
                  />
                  <p className="text-xs text-slate-500">Separate multiple skills with commas</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="bio" className="text-sm font-semibold text-slate-700">
                    Bio <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    id="bio"
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 focus:outline-none transition-all resize-none"
                    placeholder="Tell others about yourself and what you're great at..."
                    maxLength={200}
                  />
                  <p className="text-xs text-slate-500">{bio.length}/200 characters</p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                School Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 focus:outline-none transition-all"
                placeholder="student@university.edu"
              />
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Must be a .edu or .ac email
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 focus:outline-none transition-all pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-slate-500">Minimum 6 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-violet-500/20 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Enter Marketplace'}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </button>
          </form>
          
          <div className="pt-6 space-y-4">
            <div className="text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">
                Try <span className="font-mono text-violet-600 bg-violet-50 px-1 py-0.5 rounded">demo@uni.edu</span> for instant access.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;