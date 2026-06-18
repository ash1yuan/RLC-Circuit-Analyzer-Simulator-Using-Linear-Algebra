import { Cpu, RefreshCw, Sparkles, Sliders, Eye } from 'lucide-react';

interface HeaderProps {
  onClear: () => void;
  onSolve: () => void;
  solvingStatus: string;
  frequency: number;
  onFrequencyChange: (f: number) => void;
  isACMode: boolean;
  onACModeChange: (ac: boolean) => void;
  highlightNodes: boolean;
  onHighlightNodesChange: (hl: boolean) => void;
}

export default function Header({
  onClear,
  onSolve,
  solvingStatus,
  frequency,
  onFrequencyChange,
  isACMode,
  onACModeChange,
  highlightNodes,
  onHighlightNodesChange,
}: HeaderProps) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white py-3 px-6 shrink-0 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md z-40">
      {/* Brand & Title */}
      <div className="flex items-center space-x-3.5 self-start md:self-auto">
        <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/30 animate-pulse">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-100 bg-clip-text text-transparent">
            Linear Algebra Circuit Analyzer & Simulator
          </h1>
          <p className="text-[10px] text-slate-400 font-mono">
            College Linear Algebra & Circuit Matrix Analyzer — L, C & AC Steady State
          </p>
        </div>
      </div>

      {/* Global parameters and visual node highlights */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
        {/* Toggle highlight nodes */}
        <label className="flex items-center space-x-2 text-xs font-semibold hover:text-indigo-300 transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={highlightNodes}
            onChange={(e) => onHighlightNodesChange(e.target.checked)}
            className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
          />
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            Highlight Nodes
          </span>
        </label>

        {/* Divider separator */}
        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        {/* Toggle AC/DC solving mode */}
        <div className="flex items-center space-x-2 text-xs font-semibold">
          <span className="text-slate-400">Analysis Mode:</span>
          <button
            onClick={() => onACModeChange(false)}
            className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
              !isACMode ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            DC
          </button>
          <button
            onClick={() => onACModeChange(true)}
            className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
              isACMode ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            AC
          </button>
        </div>

        {/* Dynamic frequency control slider for AC steady-state */}
        {isACMode && (
          <>
            <div className="h-4 w-px bg-slate-800 hidden md:block" />
            <div className="flex items-center space-x-2 text-xs font-medium">
              <Sliders className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-slate-400">AC Frequency:</span>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={frequency}
                onChange={(e) => onFrequencyChange(parseInt(e.target.value))}
                className="w-24 accent-teal-400 cursor-pointer"
              />
              <span className="font-mono text-teal-400 font-bold bg-slate-900 px-1.5 py-0.5 border border-slate-800 rounded">
                {frequency}Hz
              </span>
            </div>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center space-x-3 self-end md:self-auto shrink-0">
        <button
          onClick={onClear}
          className="py-1.5 px-3.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg shadow-inner flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer hover:text-red-400"
          title="Clear all elements and wires on the canvas"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Clear Canvas
        </button>

        <button
          onClick={onSolve}
          className={`py-1.5 px-4 text-xs font-bold rounded-lg shadow-lg transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
            solvingStatus === 'success'
              ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40 text-white ring-2 ring-emerald-500/20'
              : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/40 text-white ring-2 ring-indigo-500/20'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Solve Matrix</span>
        </button>
      </div>
    </header>
  );
}
