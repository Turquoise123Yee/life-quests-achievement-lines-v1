import React, { useRef, useState } from 'react';
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

export const TimelineRow: React.FC<TimelineRowProps> = ({
  track,
  nodes,
  zoomLevel,
  startDate,
  onAddNode,
  onEditNode,
}) => {
  const sortedNodes = [...nodes].sort((a, b) => a.timestamp - b.timestamp);
  
  // Configuration
  const rowHeight = 120;
  const centerY = rowHeight / 2;
  const baseThickness = 1.5;
  const milestoneThickness = 3.5;
  const colorHex = getColorHex(track.color);

  // Long press state
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{x: number, y: number} | null>(null);
  const isLongPressTriggered = useRef(false);

  // Helper to get X position
  const getX = (timestamp: number) => (timestamp - startDate) / (1000 * 60 * 60 * 24) * zoomLevel;

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    isLongPressTriggered.current = false;
    
    let clientX;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }

    startPosRef.current = { x: clientX, y: 0 };
    
    // Only set the timer if we are sure it's a potential click/long-press
    // If it's multi-touch (pinch), the pinch handler in App.tsx prevents default, 
    // but here we might still get touchstart for the first finger.
    // However, usually we don't want to trigger if 2 fingers are down.
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
    }, 1000); // Increased to 1000ms
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!startPosRef.current) return;
    
    let clientX;
    if ('touches' in e) {
       // If a second finger touches down during the wait, cancel the long press
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
        {/* 1. Base Line */}
        <line
          x1="0" y1={centerY}
          x2="1000000" y2={centerY}
          stroke={colorHex}
          strokeWidth={baseThickness}
          strokeOpacity={0.3}
          strokeLinecap="round"
        />

        {/* 2. Milestone Segments */}
        {sortedNodes.map((node, i) => {
          if (node.type !== NodeType.MILESTONE) return null;
          const startX = getX(node.timestamp);
          
          const nextMilestone = sortedNodes.slice(i + 1).find(n => n.type === NodeType.MILESTONE);
          const endX = nextMilestone ? getX(nextMilestone.timestamp) : startX + 5000;

          return (
            <line
              key={`line-${node.id}`}
              x1={startX} y1={centerY}
              x2={endX} y2={centerY}
              stroke={colorHex}
              strokeWidth={milestoneThickness}
              strokeOpacity={0.6}
              strokeLinecap="butt"
            />
          );
        })}

        {/* 3. Moment Bulges */}
        {sortedNodes.map((node) => {
          if (node.type !== NodeType.MOMENT) return null;
          const x = getX(node.timestamp);
          return (
            <line
              key={`bulge-${node.id}`}
              x1={x - 10 * (node.weight/5)} y1={centerY}
              x2={x + 10 * (node.weight/5)} y2={centerY}
              stroke={colorHex}
              strokeWidth={milestoneThickness * 0.8}
              strokeOpacity={0.6}
              strokeLinecap="round"
            />
          );
        })}

        {/* 5. Nodes (Bubbles) */}
        {sortedNodes.map((node) => {
          const x = getX(node.timestamp);
          const radius = 10 + (node.weight * 3);
          
          // Position labels offset from center
          const labelOffsetX = 12; 
          const labelOffsetY = 12;

          return (
            <g 
              key={node.id} 
              className="group cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (!isLongPressTriggered.current) {
                  onEditNode(node);
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              {/* The Bubble - Use cx/cy instead of group transform */}
              <circle
                cx={x}
                cy={centerY}
                r={radius}
                fill={colorHex}
                fillOpacity={0.2}
                className="mix-blend-multiply transition-all duration-300 ease-out group-hover:fill-opacity-40 group-hover:scale-110"
                style={{ mixBlendMode: 'multiply' }}
              />
              
              {/* Inner core for milestones */}
              {node.type === NodeType.MILESTONE && (
                <circle cx={x} cy={centerY} r={4} fill={colorHex} fillOpacity={0.8} />
              )}

              {/* Title Label - Bottom Right of Center */}
              {/* Using explicit x/y coordinates instead of group transform to ensure stability */}
              <foreignObject 
                x={x + labelOffsetX} 
                y={centerY + labelOffsetY} 
                width={200} 
                height={60} 
                className="overflow-visible pointer-events-none"
                style={{ overflow: 'visible' }}
              >
                 <div className="flex flex-col items-start justify-start">
                    <span className="text-xs font-medium text-slate-800 bg-white/60 backdrop-blur-sm px-1.5 py-0.5 rounded-md shadow-sm opacity-100 whitespace-nowrap font-sans">
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