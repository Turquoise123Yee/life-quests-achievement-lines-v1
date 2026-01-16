
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Plus, ZoomIn, ZoomOut, Download, Upload, GripVertical } from 'lucide-react';
import { Track, LifeNode } from './types';
import { DEFAULT_TRACKS, DEFAULT_NODES, INITIAL_ZOOM, MIN_ZOOM, MAX_ZOOM } from './constants';
import { TimelineRow } from './components/TimelineRow';
import { TrackModal } from './components/TrackModal';
import { NodeModal } from './components/NodeModal';

const STORAGE_KEY = 'life_quests_v1_data';

function App() {
  // --- State with Persistence ---
  
  // Initialize from LocalStorage if available
  const [tracks, setTracks] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tracks) return parsed.tracks;
      }
    } catch (e) {
      console.error("Failed to load tracks from storage", e);
    }
    return DEFAULT_TRACKS;
  });

  const [nodes, setNodes] = useState<LifeNode[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.nodes) return parsed.nodes;
      }
    } catch (e) {
      console.error("Failed to load nodes from storage", e);
    }
    return DEFAULT_NODES;
  });

  const [zoomLevel, setZoomLevel] = useState(INITIAL_ZOOM);
  
  // Start date (e.g., 3 years ago from now)
  const [startDate] = useState(Date.now() - (1000 * 60 * 60 * 24 * 365 * 3));
  
  // Modals
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<LifeNode | null>(null);
  const [newNodeContext, setNewNodeContext] = useState<{trackId: string, timestamp: number} | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Zoom Centering Ref
  const pendingCenterTimeRef = useRef<number | null>(null);

  // Drag Reorder State
  const [draggedTrackId, setDraggedTrackId] = useState<string | null>(null);
  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartPosRef = useRef<{x: number, y: number} | null>(null);
  const [dragGhostY, setDragGhostY] = useState<number>(0);
  const [dragGhostIndex, setDragGhostIndex] = useState<number | null>(null); // Visual placeholder index

  // Touch refs for pinch-to-zoom
  const touchDistRef = useRef<number | null>(null);

  // --- Persistence Effect ---
  // Automatically save whenever tracks or nodes change
  useEffect(() => {
    const dataToSave = {
      tracks,
      nodes,
      lastUpdated: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [tracks, nodes]);

  // --- Handlers ---

  // Data Persistence Handlers
  const handleExport = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tracks,
      nodes,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `life-quests-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (Array.isArray(data.tracks) && Array.isArray(data.nodes)) {
            if (window.confirm(`Found ${data.tracks.length} tracks and ${data.nodes.length} memories. Replace current data?`)) {
                setTracks(data.tracks);
                setNodes(data.nodes);
            }
        } else {
           alert('Invalid file format: Missing tracks or nodes arrays.');
        }
      } catch (err) {
        alert('Error parsing JSON file. Please ensure it is a valid backup file.');
        console.error(err);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  // Track Handlers
  const handleAddTrack = () => {
    setEditingTrack(null);
    setIsTrackModalOpen(true);
  };

  const handleEditTrack = (track: Track) => {
    // If we were dragging, don't open edit
    if (draggedTrackId) return;
    setEditingTrack(track);
    setIsTrackModalOpen(true);
  };

  const handleSaveTrack = (trackData: any) => {
    if (trackData.id) {
      setTracks(tracks.map(t => t.id === trackData.id ? { ...t, ...trackData } : t));
    } else {
      const newTrack: Track = {
        ...trackData,
        id: `t${Date.now()}`,
        order: tracks.length,
      };
      setTracks([...tracks, newTrack]);
    }
    setIsTrackModalOpen(false);
  };

  // Node Handlers
  const handleTimelineClick = (trackId: string, timestamp: number) => {
    setEditingNode(null);
    setNewNodeContext({ trackId, timestamp });
    setIsNodeModalOpen(true);
  };

  const handleEditNode = (node: LifeNode) => {
    setEditingNode(node);
    setNewNodeContext({ trackId: node.trackId, timestamp: node.timestamp });
    setIsNodeModalOpen(true);
  };

  const handleSaveNode = (nodeData: any) => {
    if (nodeData.id) {
      setNodes(nodes.map(n => n.id === nodeData.id ? { ...n, ...nodeData } : n));
    } else {
      const newNode: LifeNode = {
        ...nodeData,
        id: `n${Date.now()}`,
      };
      setNodes([...nodes, newNode]);
    }
    setIsNodeModalOpen(false);
  };

  const handleDeleteNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
  };

  // --- Zoom Logic with Centering ---
  
  const captureCenterTime = () => {
    const container = scrollContainerRef.current;
    if (!container) return null;
    const centerOffset = container.scrollLeft + container.clientWidth / 2;
    // Calculate timestamp at the center of the screen
    return startDate + (centerOffset / zoomLevel) * (24 * 60 * 60 * 1000);
  };

  const handleZoomIn = () => {
    pendingCenterTimeRef.current = captureCenterTime();
    setZoomLevel(prev => Math.min(MAX_ZOOM, prev * 1.5));
  };

  const handleZoomOut = () => {
    pendingCenterTimeRef.current = captureCenterTime();
    setZoomLevel(prev => Math.max(MIN_ZOOM, prev / 1.5));
  };

  // Restore scroll position after zoom update
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (container && pendingCenterTimeRef.current !== null) {
      const newCenterOffset = (pendingCenterTimeRef.current - startDate) / (24 * 60 * 60 * 1000) * zoomLevel;
      const newScrollLeft = newCenterOffset - container.clientWidth / 2;
      container.scrollLeft = newScrollLeft;
      pendingCenterTimeRef.current = null;
    }
  }, [zoomLevel, startDate]);

  // Unified Zoom & Touch Handling Effect
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // --- Wheel (Trackpad/Mouse) ---
    const handleWheel = (e: WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            
            // Capture center for wheel zoom too
            const centerOffset = container.scrollLeft + container.clientWidth / 2;
            const centerTime = startDate + (centerOffset / zoomLevel) * (24 * 60 * 60 * 1000);
            pendingCenterTimeRef.current = centerTime;

            const delta = -e.deltaY;
            setZoomLevel(prev => {
                const scale = delta > 0 ? 1.05 : 0.95;
                return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev * scale));
            });
        }
    };

    // --- Touch (Mobile Pinch) ---
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
          const dist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
          );
          touchDistRef.current = dist;
          // Capture center
          const centerOffset = container.scrollLeft + container.clientWidth / 2;
          const centerTime = startDate + (centerOffset / zoomLevel) * (24 * 60 * 60 * 1000);
          pendingCenterTimeRef.current = centerTime;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
          e.preventDefault();
          if (touchDistRef.current !== null) {
              const dist = Math.hypot(
                  e.touches[0].clientX - e.touches[1].clientX,
                  e.touches[0].clientY - e.touches[1].clientY
              );
              const scale = dist / touchDistRef.current;
              // Update zoom
              setZoomLevel(prev => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev * (scale > 1 ? 1.02 : 0.98)))); 
              touchDistRef.current = dist;
          }
      }
    };

    const handleTouchEnd = () => {
      touchDistRef.current = null;
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
        container.removeEventListener('wheel', handleWheel);
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
        container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [zoomLevel, startDate]);

  // --- Sidebar Reorder Logic ---

  const handleSidebarPointerDown = (e: React.PointerEvent, track: Track) => {
    // Only left click or touch
    if (e.button !== 0) return;
    
    e.preventDefault(); // Prevent text selection/native drag
    const startY = e.clientY;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };

    // Start long press timer
    dragTimeoutRef.current = setTimeout(() => {
        setDraggedTrackId(track.id);
        setDragGhostY(startY);
        setDragGhostIndex(tracks.findIndex(t => t.id === track.id));
        if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handleGlobalPointerMove = (e: PointerEvent) => {
    if (!dragStartPosRef.current) return;

    // Check if moved too much to be a long press
    if (!draggedTrackId) {
        const dist = Math.hypot(e.clientX - dragStartPosRef.current.x, e.clientY - dragStartPosRef.current.y);
        if (dist > 10) {
            if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
            dragTimeoutRef.current = null;
            dragStartPosRef.current = null;
        }
        return;
    }

    // Dragging logic
    setDragGhostY(e.clientY);

    // Calculate new index
    // Assuming each row is 120px height
    const sidebarTop = 64; // header height
    const rowHeight = 120;
    const relativeY = e.clientY - sidebarTop;
    const rawIndex = Math.floor(relativeY / rowHeight);
    const newIndex = Math.max(0, Math.min(tracks.length - 1, rawIndex));
    
    setDragGhostIndex(newIndex);
  };

  const handleGlobalPointerUp = () => {
    if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
    
    if (draggedTrackId && dragGhostIndex !== null) {
        // Reorder
        const oldIndex = tracks.findIndex(t => t.id === draggedTrackId);
        if (oldIndex !== -1 && oldIndex !== dragGhostIndex) {
            const newTracks = [...tracks];
            const [moved] = newTracks.splice(oldIndex, 1);
            newTracks.splice(dragGhostIndex, 0, moved);
            // Update order property if needed
            newTracks.forEach((t, i) => t.order = i);
            setTracks(newTracks);
        }
    }

    setDraggedTrackId(null);
    setDragGhostIndex(null);
    dragStartPosRef.current = null;
    dragTimeoutRef.current = null;
  };

  useEffect(() => {
    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
        window.removeEventListener('pointermove', handleGlobalPointerMove);
        window.removeEventListener('pointerup', handleGlobalPointerUp);
        window.removeEventListener('pointercancel', handleGlobalPointerUp);
    }
  }, [draggedTrackId, dragGhostIndex, tracks]);


  // --- Render Helpers ---

  // Calculate total width needed based on zoom and end year
  const endYear = 2100;
  const maxDate = new Date(endYear, 0, 1).getTime();
  const totalWidth = Math.max(
    window.innerWidth, 
    (maxDate - startDate) / (1000 * 60 * 60 * 24) * zoomLevel + 200 // Add buffer
  );

  // Time Scale Markers
  const renderTimeScale = () => {
    const elements = [];
    const startYear = new Date(startDate).getFullYear();
    const showAllMonths = zoomLevel >= 1.0;
    const showBiMonths = zoomLevel > 0.6;

    for (let y = startYear; y <= endYear; y++) {
      const yearDate = new Date(y, 0, 1).getTime();
      const xYear = (yearDate - startDate) / (1000 * 60 * 60 * 24) * zoomLevel;
      
      if (xYear < -200) continue;

      elements.push(
        <div 
          key={`y-${y}`} 
          className="absolute top-0 bottom-0 border-l-2 border-slate-200 pointer-events-none select-none z-0"
          style={{ left: xYear }}
        >
          <div className="pl-2 pt-2 text-xs font-bold text-slate-400">{y}</div>
        </div>
      );

      if (showBiMonths) {
          for (let m = 1; m < 12; m++) {
              if (!showAllMonths && m % 2 !== 0) continue;
              const monthDate = new Date(y, m, 1).getTime();
              const xMonth = (monthDate - startDate) / (1000 * 60 * 60 * 24) * zoomLevel;
              const date = new Date(y, m, 1);
              const monthName = date.toLocaleString('default', { month: 'short' });

              elements.push(
                <div 
                  key={`m-${y}-${m}`} 
                  className="absolute top-0 bottom-0 border-l border-slate-100 pointer-events-none select-none z-0"
                  style={{ left: xMonth }}
                >
                  <div className="pl-2 pt-8 text-[10px] font-medium text-slate-300 uppercase tracking-wider">{monthName}</div>
                </div>
              );
          }
      }
    }
    return elements;
  };

  return (
    <div className="flex flex-col h-screen w-full bg-paper text-slate-900 font-sans overflow-hidden select-none">
      
      {/* Top Bar - Fixed */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-4 border-b border-slate-100 bg-white/90 backdrop-blur-md z-50">
        <h1 className="text-lg font-bold tracking-tight">My Questlines</h1>
        <div className="flex items-center gap-1">
            <button onClick={handleExport} title="Export Backup" className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <Download size={18} />
            </button>
            <button onClick={handleImportClick} title="Import Backup" className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <Upload size={18} />
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".json"
            />
            
            <div className="h-4 w-px bg-slate-200 mx-2"></div>

            <button onClick={handleZoomOut} className="p-2 text-slate-400 hover:text-slate-600"><ZoomOut size={18}/></button>
            <button onClick={handleZoomIn} className="p-2 text-slate-400 hover:text-slate-600"><ZoomIn size={18}/></button>
        </div>
      </div>

      {/* Main Scroll Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto mt-16 relative no-scrollbar cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => {
            const ele = scrollContainerRef.current;
            if(!ele) return;
            if((e.target as HTMLElement).closest('.sidebar-prevent-drag')) return;

            ele.style.cursor = 'grabbing';
            ele.style.userSelect = 'none';

            let pos = { left: ele.scrollLeft, top: ele.scrollTop, x: e.clientX, y: e.clientY };

            const onMouseMove = (e: MouseEvent) => {
              const dx = e.clientX - pos.x;
              const dy = e.clientY - pos.y;
              ele.scrollLeft = pos.left - dx;
              ele.scrollTop = pos.top - dy;
            };

            const onMouseUp = () => {
              ele.style.cursor = 'grab';
              ele.style.removeProperty('user-select');
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }}
      >
        <div className="flex min-w-fit h-full relative">
          
          {/* Sidebar Column - Sticky Left */}
          <div className="sticky left-0 z-40 w-20 flex-none bg-white border-r border-slate-100 sidebar-prevent-drag shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
            <div className="flex flex-col w-full pb-20 relative">
               {tracks.map((track, index) => {
                 const isDragging = draggedTrackId === track.id;
                 const isGhost = dragGhostIndex === index && draggedTrackId !== null;
                 
                 return (
                  <div 
                    key={track.id} 
                    className={`group relative w-full h-[120px] cursor-pointer transition-all duration-200 ${isDragging ? 'opacity-0' : 'opacity-100'} ${isGhost && draggedTrackId !== track.id ? 'translate-y-[10px]' : ''}`}
                    onPointerDown={(e) => handleSidebarPointerDown(e, track)}
                    onClick={() => handleEditTrack(track)}
                  >
                    {/* Visual Indicator for Ghost Drop Position */}
                    {dragGhostIndex === index && draggedTrackId && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 z-50 transform -translate-y-1/2" />
                    )}

                    {/* Centered Icon */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 touch-none">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-white border-2 border-slate-100 text-slate-700 transition-all group-hover:scale-110 group-hover:border-slate-300 ${isDragging ? 'scale-110 border-blue-400 shadow-xl' : ''}`}>
                        {track.icon}
                      </div>
                    </div>
                    
                    {/* Name Label */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 pt-8 w-full text-center pointer-events-none">
                      <span className="text-[10px] font-medium text-slate-400 truncate block px-1 group-hover:text-slate-800 transition-colors">
                        {track.name}
                      </span>
                    </div>
                  </div>
                );
               })}
            </div>
          </div>

          {/* Draggable Floating Proxy */}
          {draggedTrackId && (
              <div 
                className="fixed left-0 w-20 h-[120px] pointer-events-none z-[100] flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-r-xl shadow-2xl border-y border-r border-slate-200"
                style={{ top: dragGhostY - 60 }}
              >
                 <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl bg-white border-4 border-blue-500 text-slate-700 shadow-lg">
                    {tracks.find(t => t.id === draggedTrackId)?.icon}
                 </div>
              </div>
          )}

          {/* Timeline Body - Dynamic Width */}
          <div 
            className="flex-1 relative"
            style={{ minWidth: totalWidth }}
          >
             {/* Background Grid */}
             <div className="absolute inset-0 z-0">
               {renderTimeScale()}
            </div>

            {/* Tracks Rows */}
            <div className="relative z-10 flex flex-col">
              {tracks.map(track => (
                <TimelineRow
                  key={track.id}
                  track={track}
                  nodes={nodes.filter(n => n.trackId === track.id)}
                  zoomLevel={zoomLevel}
                  startDate={startDate}
                  onAddNode={handleTimelineClick}
                  onEditNode={handleEditNode}
                />
              ))}
            </div>
             {/* Bottom padding for scrolling comfort */}
             <div className="h-40 w-full" />
          </div>

        </div>
      </div>

      {/* Add Button - Fixed Bottom Left */}
      <div className="fixed bottom-0 left-0 w-20 p-4 z-50 bg-white border-t border-r border-slate-100">
         <button 
          onClick={handleAddTrack}
          className="w-full aspect-square rounded-full border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-50 hover:text-slate-800 transition-all"
        >
          <Plus size={24} strokeWidth={1.5} />
        </button>
      </div>

      {/* Modals */}
      <TrackModal 
        isOpen={isTrackModalOpen} 
        onClose={() => setIsTrackModalOpen(false)} 
        onSave={handleSaveTrack}
        initialData={editingTrack}
      />
      
      <NodeModal
        isOpen={isNodeModalOpen}
        onClose={() => setIsNodeModalOpen(false)}
        onSave={handleSaveNode}
        onDelete={handleDeleteNode}
        initialData={editingNode}
        trackId={newNodeContext?.trackId || ''}
        timestamp={newNodeContext?.timestamp || 0}
      />

    </div>
  );
}

export default App;
