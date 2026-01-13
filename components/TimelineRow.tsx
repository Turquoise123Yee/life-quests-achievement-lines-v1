import React, { useRef, useMemo } from 'react';
import { Track, LifeNode, NodeType } from '../types';
import { getColorHex } from '../constants';

interface TimelineRowProps {
  track: Track;
  nodes: LifeNode[];
  zoomLevel: number;
  startDate: number;
  onAddNode: (trackId: string, timestamp: number) => void;
  onEditNode: (node: LifeNode) => void;
}

// Define label positions relative to center Y
const LANE_OFFSETS = [
    { x: 12, y: 12 },   // Lane 0: Standard (Bottom Right)
    { x: 12, y: 32 },   // Lane 1: Lower (Stacked below)
    { x: 12, y: -45 },  // Lane 2: Upper (Top Right)
];

export const TimelineRow: React.FC<TimelineRowProps> = ({
  track,
  nodes,
  zoomLevel,
  startDate,
  onAddNode,
  onEditNode,
}) => {
  const sortedNodes = useMemo(() => [...nodes].sort((a, b) => a.timestamp - b.timestamp), [nodes]);
  
  // Configuration
  const rowHeight = 120;
  const centerY = rowHeight / 2;
  const colorHex = getColorHex(track.color);

  // Long press state
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{x: number, y: number} | null>(null);
  const isLongPressTriggered = useRef(false);

  // Helper to get X position
  const getX = (timestamp: number) => (timestamp - startDate) / (1000 * 60 * 60 * 24) * zoomLevel;

  // --- Label Collision Logic ---
  const positionedNodes = useMemo(() => {
    // We track the 'end X' pixel of the last label in each lane
    const laneEnds = [-1000, -1000, -1000]; // Initialize far left
    const MIN_GAP = 20; // Minimum pixels between labels in same lane
    const LABEL_WIDTH_ESTIMATE = 100; // Rough estimate of label width in pixels

    return sortedNodes.map(node => {
        const x = getX(node.timestamp);
        let chosenLane = 0;

        // Try to find the first lane where this label fits
        let found = false;
        for(let i=0; i < LANE_OFFSETS.length; i++) {
            if (x > laneEnds[i] + MIN_GAP) {
                chosenLane = i;
                found = true;
                break;
            }
        }
        
        // If not found (super dense), just cycle lanes to distribute overlap
        if (!found) {
             let minEnd = laneEnds[0];
             let minIdx = 0;
             for(let i=1; i < LANE_OFFSETS.length; i++) {
                 if (laneEnds[i] < minEnd) {
                     minEnd = laneEnds[i];
                     minIdx = i;
                 }
             }
             chosenLane = minIdx;
        }

        // Update lane end
        laneEnds[chosenLane] = x + LABEL_WIDTH_ESTIMATE;

        return {
            ...node,
            x,
            laneIndex: chosenLane
        };
    });
  }, [sortedNodes, zoomLevel, startDate]);

  // --- Generate Dynamic Line Segments ---
  const lineSegments = useMemo(() => {
    const segments = [];
    const milestoneNodes = sortedNodes.filter(n => n.type === NodeType.MILESTONE);
    
    // Start with base thickness
    let currentThickness = 2.0; 
    const THICKNESS_STEP = 0.75;
    
    // Start very far left to ensure line covers past events if zoomed out or scrolled back
    let cursorX = -100000; 

    milestoneNodes.forEach((node) => {
        const x = getX(node.timestamp);
        // Add segment from cursor to this milestone
        segments.push({
            x1: cursorX,
            x2: x,
            thickness: currentThickness
        });
        
        // Update cursor and thickness for next segment
        cursorX = x;
        currentThickness += THICKNESS_STEP;
    });

    // Add final segment to infinity (far right)
    segments.push({
        x1: cursorX,
        x2: 1000000,
        thickness: currentThickness
    });

    return segments;
  }, [sortedNodes, zoomLevel, startDate]);


  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    isLongPressTriggered.current = false;
    
    let clientX;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }

    startPosRef.current = { x: clientX, y: 0 };
    
    if ('touches' in e && e.touches.length > 1) {
        return;
    }

    const svgElement = e.currentTarget as SVGSVGElement;
    const rect = svgElement.getBoundingClientRect();
    const relativeX = clientX - rect.left;

    timerRef.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      // Trigger add
      const dayOffset = relativeX / zoomLevel;
      const clickedTimestamp = startDate + (dayOffset * 1000 * 60 * 60 * 24);
      onAddNode(track.id, clickedTimestamp);
      
      if (navigator.vibrate) navigator.vibrate(50);
    }, 800);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!startPosRef.current) return;
    
    let clientX;
    if ('touches' in e) {
       if(e.touches.length > 1) {
           if (timerRef.current) clearTimeout(timerRef.current);
           timerRef.current = null;
           startPosRef.current = null;
           return;
       }
      clientX = e.touches[0].clientX;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }

    if (Math.abs(clientX - startPosRef.current.x) > 10) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPosRef.current = null;
  };

  return (
    <div className="relative w-full" style={{ height: rowHeight }}>
      <svg 
        className="w-full h-full absolute top-0 left-0 overflow-visible cursor-crosshair touch-none"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* 1. Progressive Line Segments */}
        {lineSegments.map((seg, i) => (
            <line
                key={`track-seg-${i}`}
                x1={seg.x1} y1={centerY}
                x2={seg.x2} y2={centerY}
                stroke={colorHex}
                strokeWidth={seg.thickness}
                strokeOpacity={0.8}
                strokeLinecap="butt"
            />
        ))}

        {/* 2. Moment Bulges (Optional: can remain as small highlighting segments or be removed if cluttering) */}
        {sortedNodes.map((node) => {
          if (node.type !== NodeType.MOMENT) return null;
          const x = getX(node.timestamp);
          
          // Determine local thickness at this point to ensure bulge is visible
          // Simple heuristic: Find the segment this node belongs to
          const segment = lineSegments.find(s => x >= s.x1 && x < s.x2) || lineSegments[0];
          const bulgeThickness = segment.thickness + 4; 

          return (
            <line
              key={`bulge-${node.id}`}
              x1={x - 8} y1={centerY}
              x2={x + 8} y2={centerY}
              stroke={colorHex}
              strokeWidth={bulgeThickness}
              strokeOpacity={0.8}
              strokeLinecap="round"
            />
          );
        })}

        {/* 3. Nodes (Bubbles) */}
        {positionedNodes.map((node) => {
          const x = node.x;
          const radius = 10 + (node.weight * 3);
          
          // Get offset based on calculated lane
          const offset = LANE_OFFSETS[node.laneIndex];
          
          return (
            <g 
              key={node.id} 
              className="group cursor-pointer"
              onClick={(e) => {
                // Allow bubble click to propagate if needed, but here we want to edit
                // We stop propagation to avoid triggering the background 'add node' logic if click was fast
                // But we handle 'drag anywhere' in App.tsx by not stopping propagation on MouseDown.
                // Here, onClick is fine.
                // Actually, previous request said "drag anywhere", so we removed stopPropagation on MouseDown.
                // We keep onClick to trigger Edit.
                e.stopPropagation();
                if (!isLongPressTriggered.current) {
                  onEditNode(node);
                }
              }}
              // Removed stopPropagation for MouseDown/TouchStart to allow global drag
            >
              {/* Connection Line for offset labels (Lane 2 - Upper) */}
              {node.laneIndex === 2 && (
                 <line 
                   x1={x} y1={centerY - 10} 
                   x2={x + 8} y2={centerY + offset.y + 15}
                   stroke={colorHex}
                   strokeWidth={1}
                   strokeOpacity={0.5}
                 />
              )}

              {/* The Bubble */}
              <circle
                cx={x}
                cy={centerY}
                r={radius}
                fill={colorHex}
                fillOpacity={0.2}
                className="mix-blend-multiply transition-all duration-300 ease-out group-hover:fill-opacity-40 group-hover:scale-110"
                style={{ 
                    mixBlendMode: 'multiply',
                    transformBox: 'fill-box',
                    transformOrigin: 'center'
                }}
              />
              
              {node.type === NodeType.MILESTONE && (
                <circle cx={x} cy={centerY} r={4} fill={colorHex} fillOpacity={1} />
              )}

              {/* Title Label */}
              <foreignObject 
                x={x + offset.x} 
                y={centerY + offset.y} 
                width={200} 
                height={60} 
                className="overflow-visible pointer-events-none"
                style={{ overflow: 'visible' }}
              >
                 <div className="flex flex-col items-start justify-start">
                    <span 
                        className={`text-xs font-medium text-slate-800 bg-white/70 backdrop-blur-sm px-1.5 py-0.5 rounded-md shadow-sm opacity-100 whitespace-nowrap font-sans border border-white/50
                            ${node.laneIndex === 2 ? 'mb-1' : ''} 
                        `}
                    >
                      {node.title}
                    </span>
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity pl-0.5 font-sans">
                      {new Date(node.timestamp).getFullYear()}
                    </span>
                 </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
};