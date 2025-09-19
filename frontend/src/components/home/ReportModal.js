// components/home/ReportModal.tsx
'use client';

import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Video } from 'lucide-react';
import Image from 'next/image';

export function ReportModal() {
  const [step, setStep] = useState(1); // 1: Choose, 2: Preview/Form
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
      setStep(2);
    }
  };
  
  const handleRetake = () => {
    setMediaFile(null);
    setMediaPreview('');
    fileInputRef.current?.click();
  };

  const resetFlow = () => {
    setStep(1);
    setMediaFile(null);
    setMediaPreview('');
    setIsSubmitting(false);
  };
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    
    // This is where you'd call your API
    const formData = new FormData(event.currentTarget);
    if(mediaFile) {
        formData.append('media', mediaFile);
    }
    
    console.log("Submitting form data...", Object.fromEntries(formData.entries()));
    // Example: await api.submitReport(formData);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log("Submission successful!");
    setIsSubmitting(false);
    // You would close the dialog here and show a success toast.
    // For now, we just reset.
    resetFlow();
  };

  return (
    <Dialog onOpenChange={(open) => !open && resetFlow()}>
      <DialogTrigger asChild>
        <Button className="h-16 w-16 rounded-full text-lg shadow-lg">+</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report a Hazard</DialogTitle>
          <DialogDescription>Your report helps keep the community safe. Follow the steps below.</DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="grid grid-cols-2 gap-4 py-8">
            <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => fileInputRef.current?.click()}>
              <Camera className="h-8 w-8" />
              <span>Take Photo</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => fileInputRef.current?.click()}>
              <Video className="h-8 w-8" />
              <span>Record Video</span>
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,video/*"
              capture // This encourages the OS to open the camera on mobile
              onChange={handleFileChange}
            />
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {mediaPreview && (
                <div>
                  <Label>Media Preview</Label>
                  {mediaFile?.type.startsWith('video/') ? (
                    <video src={mediaPreview} controls className="w-full rounded-md mt-2" />
                  ) : (
                    <Image src={mediaPreview} alt="Preview" width={400} height={300} className="w-full h-auto rounded-md mt-2" />
                  )}
                  <div className="flex justify-end mt-2">
                     <Button type="button" variant="ghost" onClick={handleRetake}>Retake</Button>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">Title</Label>
                <Input id="title" name="title" required className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="hazardType" className="text-right">Hazard</Label>
                <Select name="hazardType" required>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a hazard type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Flooding">Flooding</SelectItem>
                    <SelectItem value="High Waves">High Waves</SelectItem>
                    <SelectItem value="Coastal Damage">Coastal Damage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Input id="description" name="description" className="col-span-3" />
              </div>
            </div>
             <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}