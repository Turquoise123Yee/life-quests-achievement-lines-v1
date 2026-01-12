import React, { useState, useRef, useEffect } from 'react';
import { Plus, ZoomIn, ZoomOut, Download, Upload } from 'lucide-react';
import { Track, LifeNode } from './types';
import { DEFAULT_TRACKS, DEFAULT_NODES, INITIAL_ZOOM, MIN_ZOOM, MAX_ZOOM } from './constants';
import { TimelineRow } from './components/TimelineRow';
import { TrackModal } from './components/TrackModal';
import { NodeModal } from './components/NodeModal';

function App() {
  // --- State ---
  const [tracks, setTracks] = useState<Track[]>(DEFAULT_TRACKS);
  const [nodes, setNodes] = useState<LifeNode[]>(DEFAULT_NODES);
  const [zoomLevel, setZoomLevel] = useState(INITIAL_ZOOM);
  
  // Start date (e.g., 5 years ago from now)
  const [startDate] = useState(Date.now() - (1000 * 60 * 60 * 24 * 365 * 3));
  
  // Modals
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<LifeNode | null>(null);
  const [newNodeContext, setNewNodeContext] = useState<{trackId: string, timestamp: number} | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Touch refs for pinch-to-zoom
  const touchDistRef = useRef<number | null>(null);

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

  // Zoom Handlers - Updated for 2x scaling
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(MAX_ZOOM, prev * 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(MIN_ZOOM, prev / 2));
  };

  // Unified Zoom & Touch Handling Effect
  // Using native event listeners with { passive: false } is critical to prevent browser zoom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // --- Wheel (Trackpad/Mouse) ---
    const handleWheel = (e: WheelEvent) => {
        // Detect trackpad pinch (ctrlKey is usually set by browsers during pinch gesture)
        if (e.ctrlKey) {
            e.preventDefault();
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
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
          // IMPORTANT: Prevent browser native zoom
          e.preventDefault();
          
          if (touchDistRef.current !== null) {
              const dist = Math.hypot(
                  e.touches[0].clientX - e.touches[1].clientX,
                  e.touches[0].clientY - e.touches[1].clientY
              );
              
              const scale = dist / touchDistRef.current;
              
              setZoomLevel(prev => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev * (scale > 1 ? 1.02 : 0.98)))); 
              touchDistRef.current = dist;
          }
      }
    };

    const handleTouchEnd = () => {
      touchDistRef.current = null;
    };

    // Add native listeners
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
  }, []);

  // --- Render Helpers ---

  // Time Scale Markers
  const renderTimeScale = () => {
    const elements = [];
    const startYear = new Date(startDate).getFullYear();
    const endYear = startYear + 10; // Render enough future
    
    // Thresholds
    const showAllMonths = zoomLevel >= 1.0;
    const showBiMonths = zoomLevel > 0.6;

    for (let y = startYear; y <= endYear; y++) {
      const yearDate = new Date(y, 0, 1).getTime();
      const xYear = (yearDate - startDate) / (1000 * 60 * 60 * 24) * zoomLevel;
      
      // Don't render if too far left (optimization)
      if (xYear < -200) continue;

      // Render Year
      elements.push(
        <div 
          key={`y-${y}`} 
          className="absolute top-0 bottom-0 border-l-2 border-slate-200 pointer-events-none select-none z-0"
          style={{ left: xYear }}
        >
          <div className="pl-2 pt-2 text-xs font-bold text-slate-400">{y}</div>
        </div>
      );

      // Render Months if Zoomed In
      if (showBiMonths) {
          for (let m = 1; m < 12; m++) {
              // Logic: 
              // If we are between 0.6 and 1.0, only show even months (2=Mar, 4=May, etc.)
              // Jan (0) is covered by Year.
              if (!showAllMonths && m % 2 !== 0) continue;

              const monthDate = new Date(y, m, 1).getTime();
              const xMonth = (monthDate - startDate) / (1000 * 60 * 60 * 24) * zoomLevel;
              // Just use english short month names for consistency
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
    <div className="flex flex-col h-screen w-full bg-paper text-slate-900 font-sans overflow-hidden">
      
      {/* Top Bar - Fixed */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-4 border-b border-slate-100 bg-white/90 backdrop-blur-md z-50">
        <h1 className="text-lg font-bold tracking-tight">My Questlines</h1>
        <div className="flex items-center gap-1">
            {/* Data Controls */}
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

            {/* Zoom Controls */}
            <button onClick={handleZoomOut} className="p-2 text-slate-400 hover:text-slate-600"><ZoomOut size={18}/></button>
            <button onClick={handleZoomIn} className="p-2 text-slate-400 hover:text-slate-600"><ZoomIn size={18}/></button>
        </div>
      </div>

      {/* Main Scroll Area - Handles both X and Y scrolling for content */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto mt-16 relative no-scrollbar cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => {
            const ele = scrollContainerRef.current;
            if(!ele) return;
            // Only trigger drag scroll if clicking background/timeline, not sidebar
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
            <div className="flex flex-col w-full pb-20"> {/* pb-20 for Add Button space */}
               {tracks.map(track => (
                <div 
                  key={track.id} 
                  className="group relative w-full h-[120px] cursor-pointer" 
                  onClick={() => handleEditTrack(track)}
                >
                  {/* Centered Icon */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-white border-2 border-slate-100 text-slate-700 transition-all group-hover:scale-110 group-hover:border-slate-300">
                      {track.icon}
                    </div>
                  </div>
                  
                  {/* Name Label */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 pt-8 w-full text-center pointer-events-none">
                    <span className="text-[10px] font-medium text-slate-400 truncate block px-1 group-hover:text-slate-800 transition-colors">
                      {track.name}
                    </span>
                  </div>
                  
                  {/* Active Indicator Line */}
                  <div className={`absolute right-0 top-1/2 w-1 h-1 rounded-full bg-${track.color}-400 translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity`} />
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Body */}
          <div className="flex-1 min-w-[300vw] relative">
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