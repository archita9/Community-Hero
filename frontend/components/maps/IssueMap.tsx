'use client';
import { useState } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface Issue {
  id: string;
  issue_number: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  priority_score: number;
  latitude: number;
  longitude: number;
  address?: string;
  image_urls?: string[];
}

interface MapProps {
  issues: Issue[];
  onSelectIssue?: (issue: Issue) => void;
}

export default function IssueMap({ issues, onSelectIssue }: MapProps) {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const handleMarkerClick = (issue: Issue) => {
    setSelectedIssue(issue);
    if (onSelectIssue) onSelectIssue(issue);
  };

  // Pre-configured mock locations around sector-4 (default coordinates if user GPS is not set)
  const defaultLat = 12.9716;
  const defaultLng = 77.5946;

  // Let's compute relative offsets to draw a beautiful localized SVG micro-grid
  // This is a custom visual map widget ensuring 100% availability even without Google Maps API credits
  return (
    <div className="relative w-full h-[600px] bg-[#111827] rounded-2xl overflow-hidden border border-white/5 flex">
      {/* Grid Canvas */}
      <div className="flex-1 relative bg-[#090d16] bg-[radial-gradient(#1f2937_1px,transparent_1.5px)] [background-size:24px_24px] overflow-hidden flex items-center justify-center">
        
        {/* Decorative Grid Lines / City streets mock layout */}
        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <line x1="10%" y1="0%" x2="10%" y2="100%" stroke="white" strokeWidth="2" />
          <line x1="30%" y1="0%" x2="30%" y2="100%" stroke="white" strokeWidth="2" />
          <line x1="70%" y1="0%" x2="70%" y2="100%" stroke="white" strokeWidth="2" />
          <line x1="90%" y1="0%" x2="90%" y2="100%" stroke="white" strokeWidth="2" />
          <line x1="0%" y1="20%" x2="100%" y2="20%" stroke="white" strokeWidth="2" />
          <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="white" strokeWidth="2" />
          <line x1="0%" y1="80%" x2="100%" y2="80%" stroke="white" strokeWidth="2" />
        </svg>

        {/* Legend */}
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/10 text-xs space-y-2 z-10">
          <div className="font-bold text-white mb-1">Issue Category Markers</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Potholes</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Garbage</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Water Leakage</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Streetlights</div>
        </div>

        {/* Map pins */}
        {issues.map((issue) => {
          // Normalize coordinates around defaults to position pins within SVG frame
          const latDiff = issue.latitude - defaultLat;
          const lngDiff = issue.longitude - defaultLng;

          // Scaling factor to keep pins inside bounds
          const left = 50 + (lngDiff * 12000);
          const top = 50 - (latDiff * 12000);

          // Bound limits
          const x = Math.min(92, Math.max(8, left));
          const y = Math.min(92, Math.max(8, top));

          const pinColor =
            issue.category === 'pothole' ? 'bg-purple-500' :
            issue.category === 'garbage' ? 'bg-green-500' :
            issue.category === 'water_leakage' ? 'bg-blue-500' :
            issue.category === 'streetlight' ? 'bg-amber-500' : 'bg-red-500';

          return (
            <button
              key={issue.id}
              onClick={() => handleMarkerClick(issue)}
              className="absolute -translate-x-1/2 -translate-y-1/2 group z-20"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              {/* Outer ring */}
              <span className={`absolute -inset-2 rounded-full opacity-40 group-hover:scale-150 transition-all duration-300 ${pinColor} animate-ping`} />
              
              {/* Pin */}
              <div className={`w-4 h-4 rounded-full border-2 border-white shadow-lg relative flex items-center justify-center ${pinColor}`}>
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/90 text-[10px] text-white py-1 px-2 rounded border border-white/10 whitespace-nowrap z-50">
                {issue.title} ({issue.priority_score}/100)
              </div>
            </button>
          );
        })}

        {issues.length === 0 && (
          <div className="text-gray-500 text-sm">No issues to display in this sector.</div>
        )}
      </div>

      {/* Side detail panel */}
      {selectedIssue && (
        <div className="w-80 border-l border-white/5 bg-[#111827]/90 backdrop-blur-md p-6 flex flex-col justify-between overflow-y-auto animate-slide-left z-30">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <Badge variant={
                selectedIssue.severity === 'critical' ? 'destructive' :
                selectedIssue.severity === 'high' ? 'warning' : 'default'
              } className="capitalize">
                {selectedIssue.severity}
              </Badge>
              <button onClick={() => setSelectedIssue(null)} className="text-gray-400 hover:text-white text-xs">
                Close [x]
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 block font-bold">{selectedIssue.issue_number}</span>
              <h4 className="font-bold text-white text-base leading-tight">{selectedIssue.title}</h4>
            </div>

            {selectedIssue.image_urls && selectedIssue.image_urls.length > 0 && (
              <div className="rounded-xl overflow-hidden border border-white/10 aspect-video bg-black/40 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedIssue.image_urls[0]} alt="Issue Photo" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="space-y-2">
              <span className="text-[10px] text-gray-400 block uppercase font-bold">Citizen Description</span>
              <p className="text-xs text-gray-300 leading-relaxed max-h-24 overflow-y-auto">
                {selectedIssue.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-white/5 rounded border border-white/5">
                <span className="text-[9px] text-gray-400 block">PRIORITY</span>
                <span className="font-bold text-white">{selectedIssue.priority_score}/100</span>
              </div>
              <div className="p-2 bg-white/5 rounded border border-white/5">
                <span className="text-[9px] text-gray-400 block">STATUS</span>
                <span className="font-bold text-blue-400 capitalize">{selectedIssue.status.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <Link href={`/issues/${selectedIssue.id}`} className="w-full">
              <Button className="w-full">Open Issue Details</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
