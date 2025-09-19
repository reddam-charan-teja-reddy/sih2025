'use client';

import { store, persistor } from '@/store/store';

// Loading component shown during persistence rehydration
const PersistenceLoading = () => (
  <div className='flex min-h-screen items-center justify-center'>
    <div className='animate-pulse text-center'>
      <p className='text-sm text-muted-foreground'>Loading your account...</p>
    </div>
  </div>
);

export function Providers({ children }) {
  return (
    <Provider store={store}>
          {children}
    </Provider>
  );
}