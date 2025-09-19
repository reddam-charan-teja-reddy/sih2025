'use client';

import dynamic from 'next/dynamic';
import { AlertsFeed } from "@/components/home/AlertsFeed";
import { Header } from "@/components/layout/Header";

// Dynamically import the MapView to ensure it only runs on the client-side
const MapView = dynamic(() => import('@/components/home/MapView').then(mod => mod.MapView), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center bg-gray-200"><p>Loading Map...</p></div>,
});


export default function Home() {
  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden">
      <Header />
      <div className="flex flex-1 flex-col md:flex-row">
        {/* Top 50% on mobile, Left 50% on desktop */}
        <div className="h-1/2 w-full md:h-full md:w-1/2">
          <MapView />
        </div>
        {/* Bottom 50% on mobile, Right 50% on desktop */}
        <div className="h-1/2 w-full md:h-full md:w-1/2">
          <AlertsFeed />
        </div>
      </div>
    </main>
  );
}