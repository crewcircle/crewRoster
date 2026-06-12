'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

const DEMO_PERSONAS = [
  {
    email: 'demo-owner@crewcircle.co',
    password: 'Demo2026!',
    role: 'Owner',
    roleType: 'owner',
    name: 'Maria',
    color: 'orange',
    emoji: '👩‍💼',
    description: 'See the full picture — build rosters, track hours, manage your team from your laptop.',
    features: ['Build & publish rosters', 'Track team hours', 'Export timesheets', 'Manage roles & settings'],
  },
  {
    email: 'demo-manager@crewcircle.co',
    password: 'Demo2026!',
    role: 'Manager',
    roleType: 'manager',
    name: 'Jake',
    color: 'blue',
    emoji: '👨‍🍳',
    description: 'Keep things running smoothly — adjust shifts and see what\'s happening on the floor.',
    features: ['View team roster', 'Adjust shifts', 'See clock-in times', 'Coordinate coverage'],
  },
  {
    email: 'demo-employee1@crewcircle.co',
    password: 'Demo2026!',
    role: 'Staff',
    roleType: 'employee',
    name: 'Sarah',
    color: 'green',
    emoji: '☕',
    description: 'Know exactly when you\'re on — check your shifts and clock in from your phone.',
    features: ['View your shifts', 'Clock in/out', 'Request availability', 'Get notified'],
  },
  {
    email: 'demo-employee2@crewcircle.co',
    password: 'Demo2026!',
    role: 'Staff',
    roleType: 'employee',
    name: 'Emma',
    color: 'purple',
    emoji: '🍽️',
    description: 'Simple, clear shifts — open the app and you know exactly when you work this week.',
    features: ['View your shifts', 'Clock in/out', 'Request availability', 'Get notified'],
  },
  {
    email: 'demo-pilot@crewcircle.co',
    password: 'Demo2026!',
    role: 'Pilot',
    roleType: 'pilot',
    name: 'Alex',
    color: 'amber',
    emoji: '🚀',
    description: 'Everything unlocked — try every feature like a power user with full admin access.',
    features: ['Full admin access', 'All features unlocked', 'Team management', 'Reports & analytics'],
  },
];

export default function DemoPage() {
  const router = useRouter();
  const [isSettingUp, setIsSettingUp] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    setupDemo();
  }, []);

  const setupDemo = async () => {
    setIsSettingUp(true);
    setError(null);

    try {
      const response = await fetch('/api/demo', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        setIsReady(true);
        if (data.tenantId) {
          setTenantId(data.tenantId);
        }
      } else {
        setError(data.error || 'Failed to set up demo');
      }
    } catch (err) {
      setError('Failed to set up demo. Please try again.');
    } finally {
      setIsSettingUp(false);
    }
  };

  const loginAsUser = async (email: string, password: string, _role: string) => {
    const currentTenantId = tenantId;
    if (!currentTenantId) {
      setError('Demo not set up yet. Please try again.');
      return;
    }
    setIsLoggingIn(email);

    try {
      const response = await fetch('/api/demo/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: _role, tenantId: currentTenantId }),
      });

      const data = await response.json();

      if (data.success && data.token) {
        const params = new URLSearchParams({
          token: data.token,
          email: encodeURIComponent(email),
          role: encodeURIComponent(_role),
          tenantId: currentTenantId,
        });
        router.push(`/demo-login?${params.toString()}`);
      } else {
        setError(data.error || 'Failed to sign in. Please try again.');
        setIsLoggingIn(null);
      }
    } catch (err) {
      setError('Failed to sign in. Please try again.');
      setIsLoggingIn(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <nav className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-amber-100 sticky top-0 z-50">
        <Logo size="md" />
        <Link href="/" className="text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors">
          Back to home
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Try crewRoster Demo</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Pick a persona and explore how crewRoster works for{' '}
            <span className="font-semibold text-orange-600">The Daily Grind Cafe</span> in Sydney.
          </p>
        </div>

        {isSettingUp && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="animate-spin h-10 w-10 text-orange-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Setting up your demo...</h2>
            <p className="text-gray-600">Creating The Daily Grind Cafe with 4 team members</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={setupDemo} className="mt-2 text-sm text-red-700 font-medium underline">
              Try again
            </button>
          </div>
        )}

        {isReady && !isSettingUp && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Choose your persona</h2>
                  <p className="text-gray-600">Each one sees crewRoster differently — pick who you want to be</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DEMO_PERSONAS.map((persona) => (
                  <button
                    key={persona.email}
                    onClick={() => loginAsUser(persona.email, persona.password, persona.roleType)}
                    disabled={isLoggingIn !== null || !tenantId}
                    className={`p-6 border-2 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                      tenantId ? 'border-gray-200' : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">{persona.emoji}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-gray-900">{persona.name}</p>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            persona.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                            persona.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                            persona.color === 'green' ? 'bg-green-100 text-green-700' :
                            persona.color === 'purple' ? 'bg-purple-100 text-purple-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {persona.role}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{persona.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {persona.features.map((feature) => (
                            <span key={feature} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              {feature}
                            </span>
                          ))}
                        </div>
                        {isLoggingIn === persona.email && (
                          <p className="text-xs text-orange-600 mt-2 font-medium">Signing in...</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">💡 Demo Mode:</span> All actions are simulated — no real data is affected. 
                  Feel free to explore everything!
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">What&apos;s inside The Daily Grind Cafe:</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  <div>
                    <p className="font-semibold text-gray-900">4 team members</p>
                    <p className="text-sm text-gray-600">Owner, Manager, and 2 Staff with different roles</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  <div>
                    <p className="font-semibold text-gray-900">Surry Hills, Sydney</p>
                    <p className="text-sm text-gray-600">GPS geofencing enabled for clock-in</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  <div>
                    <p className="font-semibold text-gray-900">Weekly roster with shifts</p>
                    <p className="text-sm text-gray-600">Pre-populated roster for the current week</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  <div>
                    <p className="font-semibold text-gray-900">Clock events</p>
                    <p className="text-sm text-gray-600">Sample clock-in records for today (if weekday)</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
