'use client';

/**
 * EnvironmentBadge displays a visual indicator of the current environment.
 * - Development: Blue "DEV" badge
 * - Staging: Yellow "STAGING" badge
 * - Production: No badge (hidden)
 */
export default function EnvironmentBadge() {
  const env = process.env.NEXT_PUBLIC_APP_ENV;

  // Don't render anything in production
  if (env === 'production' || !env) {
    return null;
  }

  const isStaging = env === 'staging';

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg ${
        isStaging
          ? 'bg-yellow-400 text-yellow-900'
          : 'bg-blue-500 text-white'
      }`}
    >
      {isStaging ? 'Staging' : 'Dev'}
    </div>
  );
}
