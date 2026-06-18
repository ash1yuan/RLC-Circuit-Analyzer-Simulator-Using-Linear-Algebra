import React from 'react';
import { ComponentType } from '../types';
import { HelpCircle, BookOpen, Hash, Layers } from 'lucide-react';

interface SidebarProps {
  onSpawnElement: (type: ComponentType) => void;
}

export default function Sidebar({ onSpawnElement }: SidebarProps) {
  // Configured default elements in the library, now including Inductor L and Capacitor C
  const elements = [
    {
      type: 'R' as ComponentType,
      title: 'Resistor (R)',
      desc: 'Resistive element obeying Ohm\'s Law V = I * R. Contributes conductance G = 1/R terms to the admittance matrix during Modified Nodal Analysis (MNA).',
      defaultVal: '10 Ω',
      unit: 'Ω',
      iconSvg: (
        <svg className="w-12 h-8 stroke-amber-600 fill-none" viewBox="0 0 100 40" strokeWidth="2.5">
          <path d="M 10,20 L 30,20 L 35,10 L 45,30 L 55,10 L 65,30 L 70,20 L 90,20" />
        </svg>
      ),
      bgClass: 'bg-amber-50 border-amber-200 hover:border-amber-400 hover:bg-amber-100/30'
    },
    {
      type: 'C' as ComponentType,
      title: 'Capacitor (C)',
      desc: 'Reactive energy-storage element. Under DC, equivalent to an open circuit. Under AC, imports complex admittance Y_C = j * ω * C.',
      defaultVal: '100 μF',
      unit: 'μF',
      iconSvg: (
        <svg className="w-12 h-8 stroke-indigo-600 fill-none" viewBox="0 0 100 40" strokeWidth="2.5">
          <path d="M 10,20 L 42,20" />
          <path d="M 42,8 L 42,32 M 50,8 L 50,32" strokeWidth="3" />
          <path d="M 50,20 L 90,20" />
        </svg>
      ),
      bgClass: 'bg-indigo-50 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-100/30'
    },
    {
      type: 'L' as ComponentType,
      title: 'Inductor (L)',
      desc: 'Reactive energy-storage element. Under DC, acts as a short circuit. Under AC, imports complex admittance Y_L = -j / (ω * L).',
      defaultVal: '10 mH',
      unit: 'mH',
      iconSvg: (
        <svg className="w-12 h-8 stroke-violet-600 fill-none" viewBox="0 0 100 40" strokeWidth="2.5">
          <path d="M 10,20 L 26,20" strokeLinecap="round" />
          <path d="M 26,20 C 26,10 32,10 32,20 C 32,10 38,10 38,20 C 38,10 44,10 44,20 C 44,10 50,10 50,20 C 50,10 56,10 56,20 C 56,10 62,10 62,20 C 62,10 68,10 68,20" strokeLinecap="round" />
          <path d="M 68,20 L 90,20" strokeLinecap="round" />
        </svg>
      ),
      bgClass: 'bg-violet-50 border-violet-200 hover:border-violet-400 hover:bg-violet-100/30'
    },
    {
      type: 'V' as ComponentType,
      title: 'Voltage Source (V)',
      desc: 'Independent voltage source. Enforces a constant potential difference between terminals. Supports both AC (amplitude & phase phasor) and DC modes.',
      defaultVal: '12 V',
      unit: 'V',
      iconSvg: (
        <svg className="w-12 h-8 stroke-blue-600 fill-none" viewBox="0 0 100 40" strokeWidth="2.5">
          <circle cx="50" cy="20" r="14" />
          <path d="M 42,20 L 48,20 M 45,17 L 45,23" strokeWidth="2" />
          <path d="M 52,20 L 58,20" strokeWidth="2" />
          <path d="M 10,20 L 36,20 M 64,20 L 90,20" />
        </svg>
      ),
      bgClass: 'bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100/30'
    },
    {
      type: 'I' as ComponentType,
      title: 'Current Source (I)',
      desc: 'Independent current source. Pumps a constant current from pin A to pin B. Directly affects the source vector (RHS) of the KCL equations. Supports both AC and DC modes.',
      defaultVal: '2 A',
      unit: 'A',
      iconSvg: (
        <svg className="w-12 h-8 stroke-teal-600 fill-none" viewBox="0 0 100 40" strokeWidth="2.5">
          <circle cx="50" cy="20" r="14" />
          <path d="M 40,20 L 60,20 M 54,14 L 60,20 L 54,26" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 10,20 L 36,20 M 64,20 L 90,20" />
        </svg>
      ),
      bgClass: 'bg-teal-50 border-teal-200 hover:border-teal-400 hover:bg-teal-100/30'
    },
  ];

  const handleDragStart = (e: React.DragEvent, type: ComponentType) => {
    e.dataTransfer.setData('application/react-circuit-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 h-full overflow-y-auto z-20">
      {/* Title */}
      <div className="p-4 border-b border-slate-200 bg-white shadow-sm shrink-0">
        <h2 className="text-xs font-bold text-slate-800 tracking-wider uppercase flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          Circuit Elements Library
        </h2>
        <p className="text-[11px] text-slate-500 mt-1">
          Drag elements to the canvas or click to spawn them directly in the center.
        </p>
      </div>

      {/* Grid List */}
      <div className="p-4 space-y-3.5 flex-1">
        {elements.map((el) => (
          <div
            key={el.type}
            draggable
            onDragStart={(e) => handleDragStart(e, el.type)}
            onClick={() => onSpawnElement(el.type)}
            className={`border rounded-xl p-3 cursor-grab hover:shadow-md transition-all active:cursor-grabbing group select-none ${el.bgClass}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-800 text-xs group-hover:text-indigo-600 transition-colors">
                {el.title}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-100 font-mono font-bold shadow-sm">
                Default: {el.defaultVal}
              </span>
            </div>

            <div className="flex items-center justify-center bg-white rounded-lg p-2 border border-slate-100/50 group-hover:border-indigo-100/50 transition-colors mb-2">
              {el.iconSvg}
            </div>

            <p className="text-[10px] leading-relaxed text-slate-500">
              {el.desc}
            </p>
          </div>
        ))}

        {/* Math explanation card */}
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 rounded-xl p-4 text-white shadow-md border border-indigo-800/20">
          <h3 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 uppercase tracking-wide">
            <HelpCircle className="w-3.5 h-3.5" />
            MNA & Impedance Formulas
          </h3>
          <div className="mt-2.5 space-y-2 text-[11px] text-slate-300 leading-normal">
            <p className="border-b border-indigo-900/40 pb-1.5 text-[10px] text-slate-400">
              AC steady-state extends Ohm's law to complex impedance. Core definitions of element impedance Z and admittance Y = 1/Z are:
            </p>
            <ul className="space-y-1 font-mono text-[10px] text-indigo-200">
              <li className="flex justify-between border-b border-indigo-950 pb-0.5">
                <span>● Resistance:</span>
                <span className="text-amber-300">Z_R = R</span>
              </li>
              <li className="flex justify-between border-b border-indigo-950 pb-0.5">
                <span>● Inductance impedance (AC):</span>
                <span className="text-violet-300">Z_L = j * ω * L</span>
              </li>
              <li className="flex justify-between border-b border-indigo-950 pb-0.5">
                <span>● Capacitance impedance (AC):</span>
                <span className="text-indigo-300">Z_C = 1 / (j * ω * C)</span>
              </li>
              <li className="flex justify-between">
                <span>● Angular Frequency:</span>
                <span className="text-teal-300">ω = 2 * π * f</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Manual interactive helper */}
      <div className="p-4 border-t border-slate-200 bg-slate-100/30 text-[10px] text-slate-500 space-y-1.5 shrink-0">
        <h4 className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
          <Hash className="w-3 h-3 text-indigo-600" /> Pin Terminals & Controls
        </h4>
        <p className="leading-normal">
          Each element has two red terminals (Pins A & B).
          Click on <strong>Pin A</strong> to start drawing a wire, then click on <strong>another pin</strong> to connect them.
          Select an element to rotate it by 90° or edit its parameter value.
        </p>
      </div>
    </aside>
  );
}
