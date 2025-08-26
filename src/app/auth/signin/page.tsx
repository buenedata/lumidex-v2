import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { SignInForm } from '@/components/auth/SignInForm';

export default async function SignInPage() {
  const user = await getCurrentUser();
  
  // If user is already signed in, redirect to collection
  if (user) {
    redirect('/collection');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">L</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Lumidex
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Access your Pokemon card collection
          </p>
        </div>
        
        <SignInForm />
        
        <div className="text-center">
          <p className="text-xs text-gray-500">
            We'll send you a magic link to sign in without a password.
            <br />
            No account needed - we'll create one for you automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Sign In - Lumidex v2',
  description: 'Sign in to manage your Pokemon TCG collection on Lumidex v2',
};