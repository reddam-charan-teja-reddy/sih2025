// components/layout/Header.js

"use client"; // This component has a button, so it should be a client component.

import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header() {
  const handleProfileClick = () => {
    // In the full app, this would trigger the Drawer Menu to open.
    alert("Profile menu clicked!"); 
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        {/* You can add a logo here in the future */}
        <span className="font-bold text-lg">Samudra Sahayak</span>
      </div>
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full"
          onClick={handleProfileClick}
        >
          <User className="h-5 w-5" />
          <span className="sr-only">Toggle user menu</span>
        </Button>
      </div>
    </header>
  );
}