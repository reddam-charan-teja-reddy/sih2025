'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertTriangle, ArrowLeft, Home } from 'lucide-react';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='flex justify-center mb-4'>
            <div className='p-3 bg-red-100 dark:bg-red-900 rounded-full'>
              <AlertTriangle className='h-8 w-8 text-red-600 dark:text-red-400' />
            </div>
          </div>
          <CardTitle className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Access Denied
          </CardTitle>
          <CardDescription className='text-gray-600 dark:text-gray-400'>
            You don't have permission to access this resource.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='text-center text-sm text-gray-500 dark:text-gray-400'>
            <p>
              This page requires additional permissions that your account
              doesn't have.
            </p>
            <p className='mt-2'>
              Contact your administrator if you believe this is an error.
            </p>
          </div>

          <div className='flex flex-col space-y-2'>
            <Button
              onClick={() => router.back()}
              variant='outline'
              className='w-full'>
              <ArrowLeft className='h-4 w-4 mr-2' />
              Go Back
            </Button>
            <Button onClick={() => router.push('/')} className='w-full'>
              <Home className='h-4 w-4 mr-2' />
              Return Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
