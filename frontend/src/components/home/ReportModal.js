'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
import {
  Camera,
  Video,
  MapPin,
  Upload,
  AlertTriangle,
  Mic,
  StopCircle,
} from 'lucide-react';
import OptimizedImage from '@/components/ui/optimized-image';
import { debounce, logError } from '@/lib/performance';
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

  // Debug: Track all changes to mediaFiles
  const trackedSetMediaFiles = (newFiles) => {
    console.log('🔄 MEDIA FILES STATE CHANGE:', {
      from: mediaFiles.length,
      to: Array.isArray(newFiles)
        ? newFiles.length
        : typeof newFiles === 'function'
        ? 'function'
        : newFiles,
      stack: new Error().stack.split('\n')[1]?.trim(),
    });
    setMediaFiles(newFiles);
  };
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useVoice, setUseVoice] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioDuration, setAudioDuration] = useState(0);
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

  // Direct camera access for mobile devices
  const openCameraForPhoto = async () => {
    try {
      setError(null);
      console.log('📸 Opening camera for photo on mobile...');

      // Check if we're on mobile
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      console.log('📱 Mobile detected:', isMobile);
      console.log('🔍 User agent:', navigator.userAgent);
      console.log('🔍 Photo input ref status:', {
        exists: !!fileInputRef.current,
        type: fileInputRef.current?.type,
        accept: fileInputRef.current?.accept,
        capture: fileInputRef.current?.capture,
      });

      // Wait a moment for React to finish rendering
      await new Promise((resolve) => setTimeout(resolve, 50));

      // For mobile browsers, we need to make sure the input is properly set up
      if (fileInputRef.current) {
        console.log('📸 Photo input ready, triggering click...');

        // Reset the input to ensure it works
        fileInputRef.current.value = '';

        // Directly click without setTimeout first
        try {
          fileInputRef.current.click();
          console.log('✅ Photo input clicked successfully');
        } catch (clickError) {
          console.warn(
            '⚠️ Direct click failed, trying with delay:',
            clickError
          );
          // Fallback to delayed click
          setTimeout(() => {
            if (fileInputRef.current) {
              fileInputRef.current.click();
            }
          }, 100);
        }

        return;
      } else {
        console.error('❌ Photo input ref not available, trying fallback...');

        // Fallback: Create and trigger input dynamically
        try {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.capture = 'environment';
          input.style.display = 'none';

          input.onchange = (e) => {
            handleFileChange(e, 'image');
            document.body.removeChild(input);
          };

          document.body.appendChild(input);
          input.click();
          console.log('✅ Fallback photo input created and triggered');
          return;
        } catch (fallbackError) {
          console.error('❌ Fallback photo input failed:', fallbackError);
        }

        console.log('🔍 All refs status:', {
          fileInputRef: !!fileInputRef.current,
          videoInputRef: !!videoInputRef.current,
        });
        setError(
          'Camera interface not ready. Please wait a moment and try again.'
        );
      }
    } catch (error) {
      console.error('❌ Failed to open camera for photo:', error);
      setError('Camera access failed. Please try again or check permissions.');
    }
  };

  const openCameraForVideo = async () => {
    try {
      setError(null);
      console.log('🎥 Opening camera for video on mobile...');

      // Check if we're on mobile
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      console.log('📱 Mobile detected:', isMobile);
      console.log('🔍 Video input ref status:', {
        exists: !!videoInputRef.current,
        type: videoInputRef.current?.type,
        accept: videoInputRef.current?.accept,
        capture: videoInputRef.current?.capture,
      });

      // Wait a moment for React to finish rendering
      await new Promise((resolve) => setTimeout(resolve, 50));

      // For mobile browsers, we need to make sure the input is properly set up
      if (videoInputRef.current) {
        console.log('🎥 Video input ready, triggering click...');

        // Reset the input to ensure it works
        videoInputRef.current.value = '';

        // Directly click without setTimeout first
        try {
          videoInputRef.current.click();
          console.log('✅ Video input clicked successfully');
        } catch (clickError) {
          console.warn(
            '⚠️ Direct click failed, trying with delay:',
            clickError
          );
          // Fallback to delayed click
          setTimeout(() => {
            if (videoInputRef.current) {
              videoInputRef.current.click();
            }
          }, 100);
        }

        return;
      } else {
        console.error('❌ Video input ref not available, trying fallback...');

        // Fallback: Create and trigger input dynamically
        try {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'video/*';
          input.capture = 'environment';
          input.style.display = 'none';

          input.onchange = (e) => {
            handleFileChange(e, 'video');
            document.body.removeChild(input);
          };

          document.body.appendChild(input);
          input.click();
          console.log('✅ Fallback video input created and triggered');
          return;
        } catch (fallbackError) {
          console.error('❌ Fallback video input failed:', fallbackError);
        }

        console.log('🔍 All refs status:', {
          fileInputRef: !!fileInputRef.current,
          videoInputRef: !!videoInputRef.current,
        });
        setError(
          'Camera interface not ready. Please wait a moment and try again.'
        );
      }
    } catch (error) {
      console.error('❌ Failed to open camera for video:', error);
      setError('Camera access failed. Please try again or check permissions.');
    }
  };

  // Voice recording controls
  const startRecording = async () => {
    try {
      setError(null);
      // Opportunistically capture location
      if (!location) {
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
        } catch (e) {
          // non-blocking
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        const a = document.createElement('audio');
        a.src = url;
        a.onloadedmetadata = () => setAudioDuration(a.duration || 0);
      };
      mediaRecorder.start();
      setRecorder(mediaRecorder);
      setRecording(true);
    } catch (err) {
      setError(
        'Microphone access denied. Please enable microphone and try again.'
      );
    }
  };

  const stopRecording = () => {
    if (recorder) {
      recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
    }
  };

  const quickSubmitVoice = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      console.log('🚀 QUICK SUBMIT VOICE CALLED with media files:', {
        mediaFilesCount: mediaFiles.length,
        hasAudioBlob: !!audioBlob,
        mediaFiles: mediaFiles.map((f) => ({
          name: f.name,
          type: f.type,
          size: f.size,
        })),
      });

      if (!user) throw new Error('You must be logged in to submit reports.');
      if (!accessToken)
        throw new Error('Session expired. Please refresh and try again.');
      if (!audioBlob) throw new Error('Please record a voice message first.');

      // Ensure we have a location
      let coords = location;
      if (!coords) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000,
            });
          });
          coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLocation(coords);
        } catch (e) {
          throw new Error(
            'Location is required. Please allow location access.'
          );
        }
      }

      // Upload media files first if any
      let uploadedFiles = [];
      let failedFiles = [];

      if (mediaFiles.length > 0) {
        console.log(
          `📤 Uploading ${mediaFiles.length} media files in voice mode...`
        );
        for (const [index, file] of mediaFiles.entries()) {
          try {
            console.log(
              `📎 Uploading media file ${index + 1}/${mediaFiles.length}:`,
              {
                name: file.name,
                type: file.type,
                size: file.size,
              }
            );

            // Get signed upload URL for media file
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
              throw new Error(`Failed to get upload URL for ${file.name}`);
            }

            const { uploadUrl, downloadUrl, fileName, requiredHeaders } =
              await urlResponse.json();

            // Upload file to GCS
            const uploadResponse = await fetch(uploadUrl, {
              method: 'PUT',
              body: file,
              headers: requiredHeaders || { 'Content-Type': file.type },
            });

            if (!uploadResponse.ok) {
              throw new Error(`Failed to upload ${file.name}`);
            }

            uploadedFiles.push({
              url: downloadUrl,
              fileName: fileName,
              type: file.type,
              caption: '', // No caption in voice mode
            });

            console.log(`✅ Successfully uploaded media file: ${file.name}`);
          } catch (uploadError) {
            console.error(`❌ Failed to upload ${file.name}:`, uploadError);
            failedFiles.push({ file: file.name, error: uploadError.message });
          }
        }

        console.log(
          `📊 Media upload summary: ${uploadedFiles.length} successful, ${failedFiles.length} failed`
        );
      }

      // Upload audio
      const audioFileName = `voice-${Date.now()}.webm`;
      const urlResponse = await fetch('/api/upload/signed-url', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          fileName: audioFileName,
          contentType: 'audio/webm',
          fileSize: audioBlob.size,
          fileCategory: 'audio',
        }),
      });
      if (!urlResponse.ok)
        throw new Error('Failed to get upload URL for audio');
      const { uploadUrl, downloadUrl, fileName, requiredHeaders } =
        await urlResponse.json();
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: audioBlob,
        headers: requiredHeaders || { 'Content-Type': 'audio/webm' },
      });
      if (!uploadResponse.ok) throw new Error('Failed to upload audio');

      // Separate uploaded files by type
      const images = uploadedFiles.filter((f) => f.type.startsWith('image/'));
      const videos = uploadedFiles.filter((f) => f.type.startsWith('video/'));

      const reportData = {
        title:
          uploadedFiles.length > 0 ? 'Voice Report with Media' : 'Voice Report',
        description:
          uploadedFiles.length > 0
            ? `Voice message with ${uploadedFiles.length} media file(s) attached. Please review the audio and media.`
            : 'Voice message attached. Please review the audio.',
        hazardType: 'other',
        severity: 'medium',
        location: {
          type: 'Point',
          coordinates: [coords.longitude, coords.latitude],
        },
        address,
        landmark: '',
        peopleAtRisk: false,
        emergencyContact: {},
        images: images,
        videos: videos,
        audio: [
          { url: downloadUrl, fileName, duration: Math.round(audioDuration) },
        ],
      };

      console.log('📤 Submitting voice report with media:', {
        title: reportData.title,
        imagesCount: images.length,
        videosCount: videos.length,
        hasAudio: reportData.audio.length > 0,
        failedUploads: failedFiles.length,
      });

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(reportData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit voice report');
      }
      setStep(4);
    } catch (e) {
      setError(e.message || 'Failed to submit voice report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const { user, canPerformAction } = useAuth();
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  // Get user location when modal opens
  useEffect(() => {
    if (step === 3 && !location) {
      getCurrentLocation();
    }
  }, [step]);

  // Request location permission when component mounts (proactive)
  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        console.log('📍 Proactively requesting location permission...');
        if (navigator.geolocation && !location) {
          // Make a quick location request to trigger permission prompt
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('✅ Initial location permission granted');
              // Don't set location yet, just establish permission
            },
            (error) => {
              console.log(
                '⚠️ Initial location permission issue:',
                error.message
              );
              // Permission denied or error, but non-blocking
            },
            {
              enableHighAccuracy: false,
              timeout: 5000,
              maximumAge: 300000, // 5 minutes cache
            }
          );
        }
      } catch (error) {
        console.log('🚫 Location permission request failed:', error);
      }
    };

    // Request permission when component mounts
    requestLocationPermission();
  }, []);

  // Ensure file input refs are ready (only check once on mount)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const checkRefs = () => {
        console.log('🔍 File input refs ready:', {
          fileInputRef: !!fileInputRef.current,
          videoInputRef: !!videoInputRef.current,
        });
      };

      // Check refs only once after component mounts
      const timer = setTimeout(checkRefs, 100);
      return () => clearTimeout(timer);
    }
  }, []); // Only run once on mount

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    setError(null);

    try {
      console.log('📍 Requesting location permission...');

      // Check if geolocation is supported
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser.');
      }

      // Request location with improved settings for mobile
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          (error) => {
            console.error('📍 Geolocation error:', error);
            switch (error.code) {
              case error.PERMISSION_DENIED:
                reject(
                  new Error(
                    'Location access denied. Please enable location services in your browser settings and try again.'
                  )
                );
                break;
              case error.POSITION_UNAVAILABLE:
                reject(
                  new Error(
                    'Location information unavailable. Please check your GPS/network connection.'
                  )
                );
                break;
              case error.TIMEOUT:
                reject(
                  new Error('Location request timed out. Please try again.')
                );
                break;
              default:
                reject(
                  new Error(
                    'An unknown error occurred while retrieving location.'
                  )
                );
                break;
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 15000, // Increased timeout for mobile
            maximumAge: 60000,
          }
        );
      });

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      setLocation(coords);
      console.log('✅ Location obtained:', coords);

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
      console.error('Location error:', err);
      setError(
        err.message ||
          'Unable to get your location. Please enable location access and try again.'
      );
    } finally {
      setGettingLocation(false);
    }
  };

  const handleFileChange = async (event, type = 'image') => {
    console.log('📁 handleFileChange called:', {
      type,
      filesLength: event.target.files?.length,
    });
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      console.log('❌ No files selected');
      return;
    }

    console.log(
      '📁 Files received:',
      files.map((f) => ({ name: f.name, type: f.type, size: f.size }))
    );

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

    // Capture current location with the media for geotagging (non-blocking)
    let mediaLocation = null;
    try {
      console.log('📍 Attempting to get location for media...');
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 30000, // Allow cached location up to 30 seconds
        });
      });

      mediaLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString(),
      };
      console.log('✅ Location captured for media:', mediaLocation);
    } catch (error) {
      console.warn(
        '⚠️ Location capture failed for media (non-blocking):',
        error
      );
      // Continue without location - this is non-blocking
    }

    const newPreviews = validFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
      location: mediaLocation, // Will be null if location failed
      capturedAt: new Date().toISOString(),
    }));

    trackedSetMediaFiles((prev) => [...prev, ...validFiles]);
    setMediaPreviews((prev) => [...prev, ...newPreviews]);

    // Debug: Log file addition
    console.log('📁 FILES ADDED:', {
      addedFiles: validFiles.map((f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
      })),
      totalMediaFiles: mediaFiles.length + validFiles.length,
      newPreviewsCount: newPreviews.length,
      hasLocation: !!mediaLocation,
    });

    // Log each file individually to avoid object truncation
    validFiles.forEach((file, index) => {
      console.log(
        `📎 File ${index + 1}: ${file.name} (${file.type}, ${file.size} bytes)`
      );
    });

    setStep(3); // Go to form step

    // Set the captured location as the report location (only if we don't have one yet)
    if (!location && mediaLocation) {
      console.log('📍 Setting media location as report location');
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
  };

  const removeMedia = (index) => {
    URL.revokeObjectURL(mediaPreviews[index].url);
    trackedSetMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const resetFlow = () => {
    setStep(1);
    trackedSetMediaFiles([]);
    mediaPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    setMediaPreviews([]);
    setIsSubmitting(false);
    setError(null);
    setLocation(null);
    setAddress('');
    setGettingLocation(false);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl('');
    setAudioDuration(0);
    setRecording(false);
    setRecorder(null);
    if (formRef.current) {
      formRef.current.reset();
    }
  };

  const handleSubmit = async (event) => {
    console.log('🚀 HANDLE SUBMIT CALLED!', { event: event.type });
    event.preventDefault();
    // Guests are allowed to submit reports like citizens

    // Debug: Log current state before submission
    console.log('🔍 SUBMIT DEBUG - Current state:', {
      mediaFilesCount: mediaFiles.length,
      hasAudioBlob: !!audioBlob,
      audioBlobSize: audioBlob?.size,
      step: step,
      location: location,
    });

    // Log each media file individually
    console.log('🔍 MEDIA FILES IN STATE:');
    mediaFiles.forEach((file, index) => {
      console.log(
        `  📎 File ${index + 1}: ${file.name} (${file.type}, ${
          file.size
        } bytes)`
      );
    });

    if (audioBlob) {
      console.log('🎤 AUDIO BLOB:', {
        size: audioBlob.size,
        type: audioBlob.type,
        duration: audioDuration,
      });
    }

    console.log('🔍 ABOUT TO START UPLOAD PROCESS...');

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
      // Make location warning but not blocking
      setError(
        '⚠️ Location is recommended for emergency reports. You can still submit, but location helps emergency responders find you faster.'
      );
      // Don't return - allow submission to continue
    }

    setIsSubmitting(true);
    setError(null); // Clear the warning once user proceeds

    try {
      const formData = new FormData(event.target);
      const reportData = {
        title: formData.get('title'),
        description: formData.get('description'),
        hazardType: formData.get('hazardType'),
        severity: formData.get('severity'),
        location: location
          ? {
              type: 'Point',
              coordinates: [location.longitude, location.latitude],
            }
          : null, // Allow null location
        address: address || 'Location not available',
        landmark: formData.get('landmark'),
        peopleAtRisk: formData.get('peopleAtRisk') === 'yes',
        emergencyContact: {
          name: formData.get('emergencyContactName'),
          phone: formData.get('emergencyContactPhone'),
        },
      };

      console.log('📋 FORM DATA COLLECTED:', {
        title: reportData.title,
        description: reportData.description,
        hazardType: reportData.hazardType,
        severity: reportData.severity,
        hasLocation: !!reportData.location,
        address: reportData.address,
      });

      // Upload files first if any
      let uploadedFiles = [];
      let failedFiles = [];

      console.log('🔍 CHECKING FILES FOR UPLOAD:', {
        mediaFilesLength: mediaFiles.length,
        willEnterUploadLoop: mediaFiles.length > 0,
      });

      if (mediaFiles.length > 0) {
        console.log(`📤 Starting upload of ${mediaFiles.length} files...`);
        for (const [index, file] of mediaFiles.entries()) {
          try {
            console.log(
              `📎 Uploading file ${index + 1}/${mediaFiles.length}:`,
              {
                name: file.name,
                type: file.type,
                size: file.size,
              }
            );

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
              const errorText = await urlResponse.text();
              console.error(
                `❌ Failed to get upload URL for ${file.name}:`,
                errorText
              );
              throw new Error(`Failed to get upload URL for ${file.name}`);
            }

            const { uploadUrl, downloadUrl, fileName, requiredHeaders } =
              await urlResponse.json();

            console.log('🔍 Upload details for', file.name, ':', {
              uploadUrl: uploadUrl.substring(0, 100) + '...',
              fileName,
              requiredHeaders,
            });

            // Upload file to GCS with all required headers
            console.log(
              '📤 Making upload request for',
              file.name,
              'with headers:',
              requiredHeaders
            );
            const uploadResponse = await fetch(uploadUrl, {
              method: 'PUT',
              body: file,
              headers: requiredHeaders || { 'Content-Type': file.type },
            });

            console.log(`📥 Upload response for ${file.name}:`, {
              status: uploadResponse.status,
              statusText: uploadResponse.statusText,
              ok: uploadResponse.ok,
            });

            if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text();
              console.error(`❌ Upload failed for ${file.name} with details:`, {
                status: uploadResponse.status,
                statusText: uploadResponse.statusText,
                headers: Object.fromEntries(uploadResponse.headers.entries()),
                body: errorText,
              });
              throw new Error(`Failed to upload ${file.name}`);
            }

            const uploadedFile = {
              url: downloadUrl,
              fileName: fileName,
              type: file.type,
              caption: formData.get(`caption_${file.name}`) || '',
            };

            uploadedFiles.push(uploadedFile);
            console.log(`✅ Successfully uploaded ${file.name}:`, uploadedFile);
          } catch (uploadError) {
            console.error(`❌ CRITICAL: File upload error for ${file.name}:`, {
              error: uploadError,
              message: uploadError.message,
              stack: uploadError.stack,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
            });
            failedFiles.push({ file: file.name, error: uploadError.message });
            // Continue with other files but track failures
          }
        }

        console.log(
          `📊 Upload summary: ${uploadedFiles.length} successful, ${failedFiles.length} failed`
        );
        if (failedFiles.length > 0) {
          console.warn('⚠️ Failed uploads:', failedFiles);
        }
      }

      // Upload voice audio if present
      let uploadedAudio = null;
      if (audioBlob) {
        try {
          console.log('🎤 Starting audio upload...', {
            size: audioBlob.size,
            duration: audioDuration,
          });

          const audioFileName = `voice-${Date.now()}.webm`;
          const urlResponse = await fetch('/api/upload/signed-url', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              fileName: audioFileName,
              contentType: 'audio/webm',
              fileSize: audioBlob.size,
              fileCategory: 'audio',
            }),
          });
          if (!urlResponse.ok) {
            const errorText = await urlResponse.text();
            console.error('❌ Failed to get upload URL for audio:', errorText);
            throw new Error('Failed to get upload URL for audio');
          }
          const { uploadUrl, downloadUrl, fileName, requiredHeaders } =
            await urlResponse.json();

          console.log('🎤 Audio upload details:', {
            fileName,
            requiredHeaders,
          });

          const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: audioBlob,
            headers: requiredHeaders || { 'Content-Type': 'audio/webm' },
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('❌ Audio upload failed:', {
              status: uploadResponse.status,
              statusText: uploadResponse.statusText,
              body: errorText,
            });
            throw new Error('Failed to upload audio');
          }

          uploadedAudio = {
            url: downloadUrl,
            fileName,
            duration: Math.round(audioDuration),
          };

          console.log('✅ Successfully uploaded audio:', uploadedAudio);
        } catch (e) {
          console.error('❌ Audio upload error:', e);
        }
      }

      // Add uploaded files to report data
      const images = uploadedFiles.filter((f) => f.type.startsWith('image/'));
      const videos = uploadedFiles.filter((f) => f.type.startsWith('video/'));

      console.log('📋 Preparing report data with media:', {
        totalUploaded: uploadedFiles.length,
        images: images.length,
        videos: videos.length,
        hasAudio: !!uploadedAudio,
        failedUploads: failedFiles.length,
      });

      reportData.images = images;
      reportData.videos = videos;
      if (uploadedAudio) {
        reportData.audio = [uploadedAudio];
      }

      console.log('📤 Final report data:', {
        ...reportData,
        images: reportData.images?.map((img) => ({
          fileName: img.fileName,
          type: img.type,
        })),
        videos: reportData.videos?.map((vid) => ({
          fileName: vid.fileName,
          type: vid.type,
        })),
        audio: reportData.audio?.map((aud) => ({
          fileName: aud.fileName,
          duration: aud.duration,
        })),
      });

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
      console.log('✅ Report submitted successfully:', result);

      // Show warning if some files failed to upload
      if (failedFiles.length > 0) {
        console.warn(
          `⚠️ Report submitted but ${failedFiles.length} file(s) failed to upload:`,
          failedFiles
        );
        // You could show a toast notification here
      }

      setStep(4); // Success step
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Report modal is available to authenticated users and guests

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
                onClick={openCameraForPhoto}>
                <Camera className='h-8 w-8 text-green-600' />
                <span className='font-medium'>Take Photo</span>
                <span className='text-xs text-gray-500'>Live capture</span>
              </Button>
              <Button
                variant='outline'
                className='h-24 flex-col gap-2 border-blue-200 hover:bg-blue-50'
                onClick={openCameraForVideo}>
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
              capture
              multiple={false}
              onChange={(e) => handleFileChange(e, 'image')}
              style={{ display: 'none' }}
            />
            <input
              type='file'
              ref={videoInputRef}
              className='hidden'
              accept='video/*'
              capture
              multiple={false}
              onChange={(e) => handleFileChange(e, 'video')}
              style={{ display: 'none' }}
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
                        <div className='relative w-full h-20 rounded border overflow-hidden'>
                          <OptimizedImage
                            src={preview.url}
                            alt={`Preview ${index + 1}`}
                            fill
                            className='object-cover'
                            sizes='(max-width: 768px) 150px, 150px'
                          />
                        </div>
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
                <div className='grid grid-cols-2 gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={openCameraForPhoto}
                    className='w-full'>
                    <Camera className='h-4 w-4 mr-2' />
                    Add Photo
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={openCameraForVideo}
                    className='w-full'>
                    <Video className='h-4 w-4 mr-2' />
                    Add Video
                  </Button>
                </div>
              </div>
            )}

            {/* Toggle: Use voice instead of form (only if media captured) */}
            {mediaPreviews.length > 0 && (
              <div className='flex items-center justify-between rounded border p-3 bg-purple-50'>
                <div>
                  <p className='text-sm font-medium'>
                    Use voice instead of form
                  </p>
                  <p className='text-xs text-gray-600'>
                    Record a voice message to describe the emergency. Form
                    fields will be hidden.
                  </p>
                </div>
                <Switch checked={useVoice} onCheckedChange={setUseVoice} />
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

            {/* Voice path */}
            {useVoice && mediaPreviews.length > 0 ? (
              <div className='space-y-3'>
                <Label className='flex items-center gap-2'>
                  <Mic className='h-4 w-4' /> Voice Message
                </Label>
                {!recording && !audioBlob && (
                  <Button
                    type='button'
                    variant='outline'
                    className='w-full h-12 flex items-center justify-center gap-2 border-purple-200 hover:bg-purple-50'
                    onClick={startRecording}>
                    <Mic className='h-5 w-5 text-purple-600' />
                    Start Voice Recording
                  </Button>
                )}
                {recording && (
                  <Button
                    type='button'
                    className='w-full h-12 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white'
                    onClick={stopRecording}>
                    <StopCircle className='h-5 w-5' />
                    Stop Recording
                  </Button>
                )}
                {audioBlob && !recording && (
                  <div className='space-y-2'>
                    <audio controls src={audioUrl} className='w-full' />
                    <p className='text-xs text-gray-500'>
                      Duration: {Math.round(audioDuration)}s
                    </p>
                    <div className='flex gap-2'>
                      <Button
                        type='button'
                        variant='secondary'
                        className='flex-1'
                        onClick={() => {
                          URL.revokeObjectURL(audioUrl);
                          setAudioBlob(null);
                          setAudioUrl('');
                          setAudioDuration(0);
                        }}>
                        Retake
                      </Button>
                      <Button
                        type='button'
                        className='flex-1 bg-destructive hover:bg-destructive/90'
                        onClick={quickSubmitVoice}
                        disabled={isSubmitting}>
                        Submit Voice Report
                      </Button>
                    </div>
                  </div>
                )}
                {!audioBlob && !recording && (
                  <p className='text-xs text-gray-600'>
                    Record a short description and submit your report.
                  </p>
                )}
              </div>
            ) : (
              <>
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
                    disabled={isSubmitting}
                    className='w-full'
                    onClick={() => {
                      console.log('🖱️ SUBMIT BUTTON CLICKED!', {
                        isSubmitting,
                        hasLocation: !!location,
                        location: location,
                        disabled: isSubmitting,
                      });
                    }}>
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
              </>
            )}
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
