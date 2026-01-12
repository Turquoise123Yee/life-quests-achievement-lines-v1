import React, { useState } from 'react';
import { LifeNode, NodeType } from '../types';
import { Sparkles, Milestone, Trash2 } from 'lucide-react';

interface NodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (node: Omit<LifeNode, 'id'> & { id?: string }) => void;
  onDelete?: (id: string) => void;
  initialData?: LifeNode | null;
  trackId: string;
  timestamp: number;
}

export const NodeModal: React.FC<NodeModalProps> = ({ 
  isOpen, onClose, onSave, onDelete, initialData, trackId, timestamp 
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [weight, setWeight] = useState(initialData?.weight || 5);
  const [type, setType] = useState<NodeType>(initialData?.type || NodeType.MOMENT);
  
  // Convert timestamp to date input format YYYY-MM-DD
  const dateObj = new Date(initialData?.timestamp || timestamp);
  const dateStr = dateObj.toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(dateStr);

  React.useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setWeight(initialData?.weight || 5);
      setType(initialData?.type || NodeType.MOMENT);
      const d = new Date(initialData?.timestamp || timestamp);
      setSelectedDate(d.toISOString().split('T')[0]);
    }
  }, [isOpen, initialData, timestamp]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      id: initialData?.id,
      trackId,
      timestamp: new Date(selectedDate).getTime(),
      title,
      weight,
      type
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full sm:max-w-sm bg-white sm:rounded-[2rem] rounded-t-[2rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.2)] overflow-hidden transform transition-all animate-in slide-in-from-bottom duration-300">
        
        <div className="pt-8 px-6 pb-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">
            {initialData ? 'Edit Memory' : 'New Memory'}
          </h3>

          <div className="space-y-6">
            {/* Input */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What happened?"
                autoFocus
                className="w-full text-3xl font-serif text-slate-900 placeholder:text-slate-300 bg-transparent border-none focus:ring-0 p-0"
              />
            </div>

            {/* Date */}
            <div>
               <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">When</label>
               <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
               />
            </div>

            {/* Type Selection */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setType(NodeType.MOMENT)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${type === NodeType.MOMENT ? 'border-slate-900 bg-slate-50' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <Sparkles className={`w-6 h-6 mb-2 ${type === NodeType.MOMENT ? 'text-amber-500' : 'text-slate-400'}`} />
                <span className="text-sm font-medium text-slate-700">Moment</span>
                <span className="text-[10px] text-slate-400 mt-1 text-center leading-tight">Fleeting joy or result</span>
              </button>

              <button
                onClick={() => setType(NodeType.MILESTONE)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${type === NodeType.MILESTONE ? 'border-slate-900 bg-slate-50' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <Milestone className={`w-6 h-6 mb-2 ${type === NodeType.MILESTONE ? 'text-blue-500' : 'text-slate-400'}`} />
                <span className="text-sm font-medium text-slate-700">Milestone</span>
                <span className="text-[10px] text-slate-400 mt-1 text-center leading-tight">Permanent shift</span>
              </button>
            </div>

            {/* Weight/Significance */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Impact</label>
                <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">{weight}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={weight}
                onChange={(e) => setWeight(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-black"
              />
              <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-medium">
                <span>Small detail</span>
                <span>Life changing</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
           {initialData && onDelete && (
            <button 
              onClick={() => { onDelete(initialData.id); onClose(); }}
              className="p-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button onClick={onClose} className="flex-1 py-3 px-4 rounded-xl font-medium text-slate-500 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex-1 py-3 px-4 rounded-xl font-medium bg-black text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
