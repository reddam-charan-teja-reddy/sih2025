'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Video, MapPin, Upload, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/components/auth/AuthGuards';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/authSlice';

const HAZARD_TYPES = [
  { value: 'flood', label: 'Flooding', icon: 'flood' },
  { value: 'storm', label: 'Storm/Cyclone', icon: 'storm' },
  { value: 'fire', label: 'Fire', icon: 'fire' },
  { value: 'landslide', label: 'Landslide', icon: 'landslide' },
  { value: 'accident', label: 'Accident', icon: 'accident' },
  { value: 'medical', label: 'Medical Emergency', icon: 'medical' },
  { value: 'roadblock', label: 'Road Blockage', icon: 'roadblock' },
  { value: 'other', label: 'Other Emergency', icon: 'other' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-[#007AFF]/10 text-[#007AFF]' },
  { value: 'medium', label: 'Medium', color: 'bg-[#FFCC00]/10 text-[#FFCC00]' },
  { value: 'high', label: 'High', color: 'bg-[#FF9500]/10 text-[#FF9500]' },
  {
    value: 'critical',
    label: 'Critical',
    color: 'bg-[#FF3B30]/10 text-[#FF3B30]',
  },
];

export function ReportModal() {
  const [step, setStep] = useState(1); // 1: Choose media, 2: Capture, 3: Form, 4: Success
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const formRef = useRef(null);

  // Helper function to create authenticated headers
  const getAuthHeaders = () => {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
  };

  const { user, canPerformAction } = useAuth();
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  // Get user location when modal opens
  useEffect(() => {
    if (step === 3 && !location) {
      getCurrentLocation();
    }
  }, [step]);

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    setError(null);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      setLocation(coords);

      // Reverse geocoding to get address
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&addressdetails=1`
        );
        const data = await response.json();
        setAddress(data.display_name || 'Location obtained via GPS');
      } catch (err) {
        setAddress(
          `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`
        );
      }
    } catch (err) {
      setError(
        'Unable to get your location. Please enable location access and try again.'
      );
      console.error('Geolocation error:', err);
    } finally {
      setGettingLocation(false);
    }
  };

  const handleFileChange = async (event, type = 'image') => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const sizeLimit = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for video, 10MB for images

      return (isImage || isVideo) && file.size <= sizeLimit;
    });

    if (validFiles.length === 0) {
      setError(
        'Please select valid image or video files under the size limit.'
      );
      return;
    }

    // Capture current location with the media for geotagging
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0, // Force fresh location for media
        });
      });

      const mediaLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString(),
      };

      const newPreviews = validFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'video' : 'image',
        location: mediaLocation, // Attach location to media
        capturedAt: new Date().toISOString(),
      }));

      setMediaFiles((prev) => [...prev, ...validFiles]);
      setMediaPreviews((prev) => [...prev, ...newPreviews]);
      setStep(3); // Go to form step

      // Set the captured location as the report location
      if (!location) {
        setLocation(mediaLocation);
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${mediaLocation.latitude}&lon=${mediaLocation.longitude}&addressdetails=1`
          );
          const data = await response.json();
          setAddress(
            data.display_name ||
              `${mediaLocation.latitude.toFixed(
                6
              )}, ${mediaLocation.longitude.toFixed(6)}`
          );
        } catch (err) {
          setAddress(
            `${mediaLocation.latitude.toFixed(
              6
            )}, ${mediaLocation.longitude.toFixed(6)}`
          );
        }
      }
    } catch (error) {
      console.error('Error capturing location with media:', error);
      // Still allow media upload but warn about missing location
      const newPreviews = validFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'video' : 'image',
        location: null,
        capturedAt: new Date().toISOString(),
      }));

      setMediaFiles((prev) => [...prev, ...validFiles]);
      setMediaPreviews((prev) => [...prev, ...newPreviews]);
      setError(
        'Media captured but location unavailable. Please enable location services for better emergency reporting.'
      );
      setStep(3);
    }
  };

  const removeMedia = (index) => {
    URL.revokeObjectURL(mediaPreviews[index].url);
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const resetFlow = () => {
    setStep(1);
    setMediaFiles([]);
    mediaPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    setMediaPreviews([]);
    setIsSubmitting(false);
    setError(null);
    setLocation(null);
    setAddress('');
    setGettingLocation(false);
    if (formRef.current) {
      formRef.current.reset();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canPerformAction('submit_report')) {
      setError('You do not have permission to submit reports.');
      return;
    }

    if (!user) {
      setError('You must be logged in to submit reports.');
      return;
    }

    if (!accessToken) {
      setError(
        'Authentication session expired. Please refresh the page and try again.'
      );
      return;
    }

    if (!location) {
      setError('Location is required. Please allow location access.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(event.target);
      const reportData = {
        title: formData.get('title'),
        description: formData.get('description'),
        hazardType: formData.get('hazardType'),
        severity: formData.get('severity'),
        location: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude],
        },
        address: address,
        landmark: formData.get('landmark'),
        peopleAtRisk: formData.get('peopleAtRisk') === 'yes',
        emergencyContact: {
          name: formData.get('emergencyContactName'),
          phone: formData.get('emergencyContactPhone'),
        },
      };

      // Upload files first if any
      let uploadedFiles = [];
      if (mediaFiles.length > 0) {
        for (const file of mediaFiles) {
          try {
            // Get signed upload URL
            const urlResponse = await fetch('/api/upload/signed-url', {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({
                fileName: file.name,
                contentType: file.type,
                fileSize: file.size,
                fileCategory: file.type.startsWith('video/')
                  ? 'videos'
                  : 'images',
              }),
            });

            if (!urlResponse.ok) {
              throw new Error('Failed to get upload URL');
            }

            const { uploadUrl, downloadUrl, fileName } =
              await urlResponse.json();

            // Upload file to GCS
            const uploadResponse = await fetch(uploadUrl, {
              method: 'PUT',
              body: file,
              headers: { 'Content-Type': file.type },
            });

            if (!uploadResponse.ok) {
              throw new Error('Failed to upload file');
            }

            uploadedFiles.push({
              url: downloadUrl,
              fileName: fileName,
              type: file.type,
              caption: formData.get(`caption_${file.name}`) || '',
            });
          } catch (uploadError) {
            console.error('File upload error:', uploadError);
            // Continue with other files
          }
        }
      }

      // Add uploaded files to report data
      reportData.images = uploadedFiles.filter((f) =>
        f.type.startsWith('image/')
      );
      reportData.videos = uploadedFiles.filter((f) =>
        f.type.startsWith('video/')
      );

      // Submit report
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(reportData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit report');
      }

      const result = await response.json();
      console.log('Report submitted successfully:', result);
      setStep(4); // Success step
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canPerformAction('submit_report')) {
    return null; // Don't show modal for users who can't submit reports
  }

  return (
    <Dialog onOpenChange={(open) => !open && resetFlow()}>
      <DialogTrigger asChild>
        <Button className='w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg hover:shadow-xl transition-all duration-300 py-3 rounded-lg font-semibold'>
          <AlertTriangle className='h-5 w-5 mr-2' />
          Report Emergency
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[500px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Report Emergency</DialogTitle>
          <DialogDescription>
            Help keep your community safe by reporting emergencies and hazards.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Card className='border-destructive/20 bg-destructive/5'>
            <CardContent className='p-3'>
              <p className='text-destructive text-sm'>{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Choose media type */}
        {step === 1 && (
          <div className='space-y-4'>
            <div className='mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg'>
              <p className='text-sm text-primary font-medium'>
                📸 Live Capture Only
              </p>
              <p className='text-xs text-primary/80 mt-1'>
                For verification purposes, only live photos and videos can be
                captured. Location will be automatically recorded with your
                media.
              </p>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <Button
                variant='outline'
                className='h-24 flex-col gap-2 border-[#34C759]/20 hover:bg-[#34C759]/5'
                onClick={() => fileInputRef.current?.click()}>
                <Camera className='h-8 w-8 text-green-600' />
                <span className='font-medium'>Take Photo</span>
                <span className='text-xs text-gray-500'>Live capture</span>
              </Button>
              <Button
                variant='outline'
                className='h-24 flex-col gap-2 border-blue-200 hover:bg-blue-50'
                onClick={() => videoInputRef.current?.click()}>
                <Video className='h-8 w-8 text-blue-600' />
                <span className='font-medium'>Record Video</span>
                <span className='text-xs text-gray-500'>Live recording</span>
              </Button>
            </div>

            <div className='text-center'>
              <Button
                variant='ghost'
                onClick={() => setStep(3)}
                className='text-sm text-gray-600 hover:text-gray-800'>
                Skip and continue without media
              </Button>
            </div>

            {/* Hidden inputs for live capture only */}
            <input
              type='file'
              ref={fileInputRef}
              className='hidden'
              accept='image/*'
              capture='environment'
              multiple={false}
              onChange={(e) => handleFileChange(e, 'image')}
            />
            <input
              type='file'
              ref={videoInputRef}
              className='hidden'
              accept='video/*'
              capture='environment'
              onChange={(e) => handleFileChange(e, 'video')}
            />
          </div>
        )}

        {/* Step 3: Form */}
        {step === 3 && (
          <form ref={formRef} onSubmit={handleSubmit} className='space-y-4'>
            {/* Media previews */}
            {mediaPreviews.length > 0 && (
              <div className='space-y-2'>
                <Label>Captured Media</Label>
                <div className='grid grid-cols-2 gap-2'>
                  {mediaPreviews.map((preview, index) => (
                    <div key={index} className='relative'>
                      {preview.type === 'video' ? (
                        <video
                          src={preview.url}
                          controls
                          className='w-full h-20 object-cover rounded border'
                        />
                      ) : (
                        <Image
                          src={preview.url}
                          alt={`Preview ${index + 1}`}
                          width={150}
                          height={80}
                          className='w-full h-20 object-cover rounded border'
                        />
                      )}
                      <Button
                        type='button'
                        size='sm'
                        variant='destructive'
                        className='absolute top-1 right-1 h-6 w-6 p-0'
                        onClick={() => removeMedia(index)}>
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => fileInputRef.current?.click()}
                  className='w-full'>
                  <Upload className='h-4 w-4 mr-2' />
                  Add More Media
                </Button>
              </div>
            )}

            {/* Location */}
            <div className='space-y-2'>
              <Label className='flex items-center gap-2'>
                <MapPin className='h-4 w-4' />
                Location
              </Label>
              {gettingLocation ? (
                <div className='flex items-center gap-2 text-sm text-gray-600'>
                  <div className='animate-spin rounded-full h-4 w-4 border-b border-blue-600'></div>
                  Getting your location...
                </div>
              ) : location ? (
                <div className='text-sm bg-green-50 p-2 rounded border'>
                  <p className='text-green-800'>📍 {address}</p>
                  <p className='text-xs text-gray-600'>
                    {location.latitude.toFixed(6)},{' '}
                    {location.longitude.toFixed(6)}
                    {location.accuracy &&
                      ` (±${Math.round(location.accuracy)}m)`}
                  </p>
                </div>
              ) : (
                <Button
                  type='button'
                  variant='outline'
                  onClick={getCurrentLocation}
                  className='w-full'>
                  <MapPin className='h-4 w-4 mr-2' />
                  Get Current Location
                </Button>
              )}
            </div>

            {/* Form fields */}
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='title'>Title *</Label>
                <Input
                  id='title'
                  name='title'
                  required
                  placeholder='Brief description of emergency'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='hazardType'>Hazard Type *</Label>
                <Select name='hazardType' required>
                  <SelectTrigger>
                    <SelectValue placeholder='Select hazard' />
                  </SelectTrigger>
                  <SelectContent>
                    {HAZARD_TYPES.map((hazard) => (
                      <SelectItem key={hazard.value} value={hazard.value}>
                        <div className='flex items-center gap-2'>
                          <img
                            src={`/assets/icons/${hazard.icon}.svg`}
                            alt={hazard.label}
                            className='w-4 h-4'
                          />
                          {hazard.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='description'>Description *</Label>
              <textarea
                id='description'
                name='description'
                required
                className='w-full p-2 border rounded-md'
                rows={3}
                placeholder='Provide detailed information about the emergency...'
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='severity'>Severity *</Label>
                <Select name='severity' required>
                  <SelectTrigger>
                    <SelectValue placeholder='Select severity' />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <Badge className={level.color}>{level.label}</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='peopleAtRisk'>People at Risk?</Label>
                <Select name='peopleAtRisk'>
                  <SelectTrigger>
                    <SelectValue placeholder='Select...' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='no'>No</SelectItem>
                    <SelectItem value='yes'>Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='landmark'>Nearby Landmark</Label>
              <Input
                id='landmark'
                name='landmark'
                placeholder='Nearest landmark or recognizable location'
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='emergencyContactName'>
                  Emergency Contact Name
                </Label>
                <Input
                  id='emergencyContactName'
                  name='emergencyContactName'
                  placeholder='Contact person name'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='emergencyContactPhone'>
                  Emergency Contact Phone
                </Label>
                <Input
                  id='emergencyContactPhone'
                  name='emergencyContactPhone'
                  type='tel'
                  placeholder='+91 XXXXX XXXXX'
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type='submit'
                disabled={isSubmitting || !location}
                className='w-full'>
                {isSubmitting ? (
                  <div className='flex items-center gap-2'>
                    <div className='animate-spin rounded-full h-4 w-4 border-b border-white'></div>
                    Submitting Report...
                  </div>
                ) : (
                  'Submit Emergency Report'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className='text-center space-y-4'>
            <div className='text-green-600 text-6xl'>✓</div>
            <div>
              <h3 className='text-lg font-semibold text-green-800'>
                Report Submitted Successfully!
              </h3>
              <p className='text-sm text-gray-600 mt-2'>
                Your emergency report has been submitted and will be reviewed by
                local authorities. You will receive updates on the status of
                your report.
              </p>
            </div>
            <Button onClick={resetFlow} className='w-full'>
              Submit Another Report
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
