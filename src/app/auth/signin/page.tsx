import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { AuthForm } from '@/components/auth/AuthForm';
import Image from 'next/image';
import LumidexLogo from '@/images/lumidex_logo_card_allcaps_transparent.png';

export default async function SignInPage() {
  const user = await getCurrentUser();
  
  // If user is already signed in, redirect to dashboard
  if (user) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg via-panel to-panel2 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden min-h-screen">
        <div className="absolute inset-0 bg-aurora opacity-95"></div>
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 w-full h-full">
          <div className="text-center space-y-8 max-w-lg">
            <div className="flex items-center justify-center">
              <div className="w-48 h-16 relative">
                <Image
                  src={LumidexLogo}
                  alt="Lumidex Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">
                The Ultimate Pokemon TCG Collection Manager
              </h2>
              <p className="text-white/90 text-lg leading-relaxed">
                Track your cards, monitor real-time pricing from Cardmarket and TCGplayer,
                and build the collection of your dreams.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="text-2xl font-bold">1M+</div>
                  <div className="text-white/80 text-sm">Cards Tracked</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="text-2xl font-bold">Real-time</div>
                  <div className="text-white/80 text-sm">Price Data</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 border-2 border-white rounded-full"></div>
          <div className="absolute bottom-32 right-16 w-24 h-24 border-2 border-white rounded-lg rotate-45"></div>
          <div className="absolute top-1/2 left-8 w-16 h-16 border-2 border-white rounded-full"></div>
        </div>
      </div>

      {/* Right Side - Authentication Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl border border-border p-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="lg:hidden mx-auto w-32 h-10 relative">
                <Image
                  src={LumidexLogo}
                  alt="Lumidex Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 via-red-700 to-red-800 bg-clip-text text-transparent">
                  Welcome to Lumidex
                </h2>
                <p className="text-gray-600 mt-2">
                  Sign in to your account or create a new one
                </p>
              </div>
            </div>
            
            {/* Auth Form */}
            <AuthForm />
            
            {/* Footer */}
            <div className="pt-6 border-t border-border">
              <p className="text-xs text-muted text-center leading-relaxed">
                By continuing, you agree to our{' '}
                <a href="#" className="text-brand hover:text-brand2 font-medium">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-brand hover:text-brand2 font-medium">Privacy Policy</a>.
                <br />
                Your collection data is securely encrypted and never shared.
              </p>
            </div>
          </div>
          
          {/* Feature Cards */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-panel border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-text text-sm">Secure Storage</div>
                  <div className="text-muted text-xs">Bank-level encryption</div>
                </div>
              </div>
            </div>
            
            <div className="bg-panel border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-text text-sm">Live Pricing</div>
                  <div className="text-muted text-xs">Updated hourly</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Sign In - Lumidex v2',
  description: 'Sign in or create an account to manage your Pokemon TCG collection on Lumidex v2',
};