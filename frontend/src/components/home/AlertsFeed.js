// components/home/AlertsFeed.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from 'next/image';
import { ReportModal } from "./ReportModal";

// This would come from your Redux store
const mockReports = {
  local: [
    { id: 1, title: "Coastal Road Flooding", description: "Water has started to cover the road near the turning point...", image: "/placeholder.jpg", distance: "2.5 km away", time: "15 mins ago" },
    { id: 2, title: "High Waves near RK Beach", description: "Waves are much larger than usual, reaching the promenade.", image: "/placeholder.jpg", distance: "5.1 km away", time: "45 mins ago" },
  ],
  verified: [
     { id: 1, title: "Coastal Road Flooding", description: "Water has started to cover the road near the turning point...", image: "/placeholder.jpg", distance: "2.5 km away", time: "15 mins ago" },
  ],
  unverified: [
     { id: 2, title: "High Waves near RK Beach", description: "Waves are much larger than usual, reaching the promenade.", image: "/placeholder.jpg", distance: "5.1 km away", time: "45 mins ago" },
  ]
};

const AlertCard = ({ report }) => (
  <Card className="mb-4 hover:bg-gray-50 cursor-pointer">
    <CardHeader>
      <CardTitle>{report.title}</CardTitle>
      <CardDescription>{report.distance} • {report.time}</CardDescription>
    </CardHeader>
    <CardContent className="flex items-center gap-4">
      <Image src={report.image} alt={report.title} width={100} height={100} className="rounded-md object-cover h-24 w-24" />
      <p className="text-sm text-muted-foreground">{report.description}</p>
    </CardContent>
  </Card>
);

export function AlertsFeed() {
  return (
    <div className="flex flex-col h-full w-full relative">
      <Tabs defaultValue="local" className="flex flex-col flex-grow p-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="local">Local</TabsTrigger>
          <TabsTrigger value="verified">Verified</TabsTrigger>
          <TabsTrigger value="unverified">Unverified</TabsTrigger>
        </TabsList>
        <div className="flex-grow overflow-y-auto mt-4 pr-2">
          <TabsContent value="local">
            {mockReports.local.map(report => <AlertCard key={report.id} report={report} />)}
          </TabsContent>
          <TabsContent value="verified">
            {mockReports.verified.map(report => <AlertCard key={report.id} report={report} />)}
          </TabsContent>
          <TabsContent value="unverified">
            <div className="text-center p-2 text-sm text-orange-600 bg-orange-100 rounded-md mb-4">
              ⚠️ These are unconfirmed reports. Please exercise caution.
            </div>
            {mockReports.unverified.map(report => <AlertCard key={report.id} report={report} />)}
          </TabsContent>
        </div>
      </Tabs>
      <div className="absolute bottom-6 right-6">
        <ReportModal />
      </div>
    </div>
  );
}