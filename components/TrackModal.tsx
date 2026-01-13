
import React, { useState } from 'react';
import { Track, COLORS, EMOJI_CATEGORIES } from '../types';
import { X, Check } from 'lucide-react';

interface TrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (track: Omit<Track, 'id' | 'order'> & { id?: string }) => void;
  initialData?: Track | null;
}

export const TrackModal: React.FC<TrackModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [icon, setIcon] = useState(initialData?.icon || '🌱');
  const [color, setColor] = useState(initialData?.color || 'slate');

  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setIcon(initialData?.icon || '🌱');
      setColor(initialData?.color || 'slate');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Preview */}
        <div className={`pt-10 pb-6 px-6 flex flex-col items-center bg-slate-50 border-b border-slate-100`}>
          <div className={`w-24 h-24 rounded-full flex items-center justify-center text-6xl shadow-inner bg-white mb-4`}>
            {icon}
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name your quest..."
            className="text-center text-2xl font-serif text-slate-900 bg-transparent border-b-2 border-transparent focus:border-slate-300 focus:outline-none placeholder:text-slate-300 w-full"
            autoFocus
          />
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-8 max-h-[50vh] overflow-y-auto no-scrollbar">
          
          {/* Colors */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Theme Color</label>
            <div className="flex flex-wrap gap-3 justify-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                  style={{ backgroundColor: `var(--color-${c}-500, ${c})` }} // Fallback simplistic
                >
                  <div className={`w-full h-full rounded-full bg-${c}-500`} />
                </button>
              ))}
            </div>
          </div>

          {/* Icons Categorized */}
          <div>
             <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 block">Icon</label>
             <div className="space-y-6">
                {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                    <div key={category}>
                        <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">{category}</h4>
                        <div className="grid grid-cols-6 gap-2">
                        {emojis.map((e) => (
                            <button
                            key={e}
                            onClick={() => setIcon(e)}
                            className={`text-2xl p-2 rounded-xl hover:bg-slate-100 transition-colors ${icon === e ? 'bg-slate-100 ring-1 ring-slate-200' : ''}`}
                            >
                            {e}
                            </button>
                        ))}
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 px-4 rounded-xl font-medium text-slate-500 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button 
            onClick={() => onSave({ id: initialData?.id, name, icon, color })}
            disabled={!name.trim()}
            className="flex-1 py-3 px-4 rounded-xl font-medium bg-black text-white hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-200"
          >
            {initialData ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};
