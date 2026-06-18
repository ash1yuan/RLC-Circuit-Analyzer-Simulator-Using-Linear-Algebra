import React, { useState, useRef, useEffect } from 'react';
import { CircuitElement, Wire, PinReference, ComponentType } from '../types';
import { RotateCw, Trash2, X, AlertCircle } from 'lucide-react';

interface CircuitCanvasProps {
  elements: CircuitElement[];
  wires: Wire[];
  nodesList?: { nodeId: string; pinKeys: string[] }[];
  highlightNodes: boolean;
  onAddElement: (type: ComponentType, x: number, y: number) => void;
  onUpdateElementPosition: (id: string, x: number, y: number) => void;
  onUpdateElementValue: (id: string, value: number) => void;
  onRotateElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
  onAddWire: (from: PinReference, to: PinReference) => void;
  onDeleteWire: (id: string) => void;
  onUpdateElementSourceMode?: (id: string, mode: 'DC' | 'AC') => void;
  onUpdateElementPhase?: (id: string, phase: number) => void;
}

// Gorgeous colors for electrical nodes mapping:
// Node 0 is Reference Ground (Emerald Green). Others are distinct vibrant network colors.
const NODE_COLORS = [
  '#10b981', // ground
  '#6366f1', // node 1: Indigo
  '#0d9488', // node 2: Teal
  '#f97316', // node 3: Orange
  '#a855f7', // node 4: Purple
  '#ec4899', // node 5: Pink
  '#06b6d4', // node 6: Cyan
  '#eab308', // node 7: Yellow
  '#ef4444', // node 8: Red
];

export default function CircuitCanvas({
  elements,
  wires,
  nodesList = [],
  highlightNodes,
  onAddElement,
  onUpdateElementPosition,
  onUpdateElementValue,
  onRotateElement,
  onDeleteElement,
  onAddWire,
  onDeleteWire,
  onUpdateElementSourceMode,
  onUpdateElementPhase,
}: CircuitCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  // States for element dragging
  const [draggedElId, setDraggedElId] = useState<string | null>(null);
  const [selectedElId, setSelectedElId] = useState<string | null>(null);

  // States for wiring (from terminal A or B)
  const [wiringMode, setWiringMode] = useState(false);
  const [activePin, setActivePin] = useState<PinReference | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const canvasWidth = 1600;
  const canvasHeight = 1200;

  // Keypress event handler to cancel wiring mode with Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelWiring();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [wiringMode]);

  // Helper: Retrieve absolute coordinates of a specific element's pin based on its current grid position & rotation
  const getPinCoords = (el: CircuitElement, pin: 'A' | 'B') => {
    const { x, y, rotation } = el;
    const distance = 60; // Distance of the pin from the component's center (width is 120, so 60)

    if (rotation === 0) {
      return pin === 'A' ? { x: x - distance, y } : { x: x + distance, y };
    } else if (rotation === 90) {
      return pin === 'A' ? { x, y: y - distance } : { x, y: y + distance };
    } else if (rotation === 180) {
      return pin === 'A' ? { x: x + distance, y } : { x: x - distance, y };
    } else { // 270 deg
      return pin === 'A' ? { x, y: y + distance } : { x, y: y - distance };
    }
  };

  // Helper: Determine node statistics for a given pin to support custom layout coloring
  const getPinNodeInfo = (componentId: string, pin: 'A' | 'B') => {
    if (!nodesList || nodesList.length === 0) return null;
    const pinKey = `${componentId}_${pin}`;
    const idx = nodesList.findIndex((node) => node.pinKeys.includes(pinKey));
    if (idx === -1) return null;
    
    // Check if Ground
    const isGround = nodesList[idx].nodeId.includes('Ground');
    return {
      nodeIndex: idx,
      nodeId: nodesList[idx].nodeId,
      name: isGround ? 'GND' : `N${idx}`,
      color: NODE_COLORS[idx % NODE_COLORS.length],
    };
  };

  // Drag and Drop (from library sidebar into canvas)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/react-circuit-type') as ComponentType;
    if (!type || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    // Snap to 20px grid
    const snapX = Math.round(rawX / 20) * 20;
    const snapY = Math.round(rawY / 20) * 20;

    // Boundary padding checks
    const boundedX = Math.max(80, Math.min(canvasWidth - 80, snapX));
    const boundedY = Math.max(80, Math.min(canvasHeight - 80, snapY));

    onAddElement(type, boundedX, boundedY);
  };

  // Component Dragging inside Canvas (MouseDown, MouseMove, MouseUp)
  const startDraggingElement = (id: string, e: React.MouseEvent) => {
    // Only drag with left mouse button, and bypass if clicking the rotate/delete buttons or the input box
    if (e.button !== 0) return;
    const targetTag = (e.target as HTMLElement).tagName.toUpperCase();
    if (
      targetTag === 'INPUT' || 
      targetTag === 'BUTTON' || 
      targetTag === 'SELECT' ||
      (e.target as HTMLElement).closest('.action-btn')
    ) {
      return;
    }

    e.preventDefault();
    setDraggedElId(id);
    setSelectedElId(id);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedElId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;

      // Snap to 20px grid
      const snapX = Math.round(rawX / 20) * 20;
      const snapY = Math.round(rawY / 20) * 20;

      const boundedX = Math.max(80, Math.min(canvasWidth - 80, snapX));
      const boundedY = Math.max(80, Math.min(canvasHeight - 80, snapY));

      onUpdateElementPosition(draggedElId, boundedX, boundedY);
    }

    if (wiringMode && activePin && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseUp = () => {
    setDraggedElId(null);
  };

  // Wiring Logic (connecting pin terminals)
  const handlePinClick = (elementId: string, pin: 'A' | 'B', e: React.MouseEvent) => {
    e.stopPropagation();

    if (!wiringMode) {
      // Start wire
      const element = elements.find((el) => el.id === elementId);
      if (!element) return;

      const coords = getPinCoords(element, pin);
      setWiringMode(true);
      setActivePin({ componentId: elementId, pin });
      setMousePosition(coords);
    } else {
      // End wire - click another pin to connect
      if (!activePin) return;

      // Prevent connecting to the exact same pin (self-wire) or same component (short-circuiting components itself)
      if (activePin.componentId === elementId) {
        if (activePin.pin === pin) {
          cancelWiring();
          return;
        }
      }

      onAddWire(activePin, { componentId: elementId, pin });
      cancelWiring();
    }
  };

  const cancelWiring = () => {
    setWiringMode(false);
    setActivePin(null);
  };

  return (
    <div
      ref={canvasRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={() => setSelectedElId(null)}
      className="flex-1 bg-slate-100 relative overflow-auto shadow-inner select-none"
      style={{
        backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Canvas indicators / status banner */}
      <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-2 text-[11px] text-slate-600 shadow-sm font-mono flex flex-col gap-1 pointer-events-none">
        <div className="flex items-center gap-1.5 font-bold">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span>Interactive Schematic Canvas</span>
        </div>
        <div className="text-[10px] text-slate-400">
          • Click on any pin (red dot) to draw a wire, then click another pin to connect.
        </div>
        {wiringMode && (
          <div className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded mt-0.5 flex items-center gap-1 font-bold animate-pulse">
            <AlertCircle className="w-3 h-3" />
            Wiring active. Click another pin or press ESC to cancel.
          </div>
        )}
      </div>

      <svg className="absolute inset-0 pointer-events-none w-[1600px] h-[1200px] z-0">
        {/* Render all Wires */}
        {wires.map((wire) => {
          const fromEl = elements.find((el) => el.id === wire.from.componentId);
          const toEl = elements.find((el) => el.id === wire.to.componentId);
          if (!fromEl || !toEl) return null;

          const p1 = getPinCoords(fromEl, wire.from.pin);
          const p2 = getPinCoords(toEl, wire.to.pin);

          // Determine wire color based on electrical nodes if highlight is on
          let wireColor = wire.color || '#3b82f6';
          let hoverText = 'Click to delete wire';
          if (highlightNodes) {
            const nodeInfo = getPinNodeInfo(wire.from.componentId, wire.from.pin);
            if (nodeInfo) {
              wireColor = nodeInfo.color;
              hoverText = `Wire belongs to: ${nodeInfo.nodeId} (${nodeInfo.name})`;
            }
          }

          return (
            <g key={wire.id}>
              {/* Thick interactive detection lane for clicking wires with ease */}
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="transparent"
                strokeWidth="12"
                className="cursor-pointer pointer-events-auto"
                title={hoverText}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteWire(wire.id);
                }}
              />
              {/* Visual electrical line */}
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={wireColor}
                strokeWidth={highlightNodes ? '3.5' : '2.5'}
                strokeLinecap="round"
                className="transition-all duration-200 drop-shadow-[0_1px_2px_rgba(30,41,59,0.2)]"
              />
              {/* Connection visual small dot pivots */}
              <circle cx={p1.x} cy={p1.y} r="3.5" fill={wireColor} />
              <circle cx={p2.x} cy={p2.y} r="3.5" fill={wireColor} />
              
              {/* Small close floating button in the center-edge of the wire */}
              <foreignObject
                x={(p1.x + p2.x) / 2 - 9}
                y={(p1.y + p2.y) / 2 - 9}
                width="18"
                height="18"
                className="pointer-events-auto cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteWire(wire.id);
                }}
              >
                <div className="w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-white ring-2 ring-white shadow-sm hover:bg-red-600 transform scale-90 hover:scale-105 transition-all">
                  <X className="w-3 h-3" strokeWidth="3" />
                </div>
              </foreignObject>
            </g>
          );
        })}

        {/* Live Wiring Preview Line */}
        {wiringMode && activePin && (
          <g>
            {(() => {
              const startEl = elements.find((el) => el.id === activePin.componentId);
              if (!startEl) return null;
              const startCoords = getPinCoords(startEl, activePin.pin);
              return (
                <line
                  x1={startCoords.x}
                  y1={startCoords.y}
                  x2={mousePosition.x}
                  y2={mousePosition.y}
                  stroke="#5046e5"
                  strokeWidth="2.5"
                  strokeDasharray="5 5"
                />
              );
            })()}
          </g>
        )}
      </svg>

      {/* Render All Components in Canvas */}
      <div className="absolute top-0 left-0 w-[1600px] h-[1200px] z-10 pointer-events-none">
        {elements.map((el) => {
          const isSelected = selectedElId === el.id;
          const isSource = el.type === 'V' || el.type === 'I';
          const pinA = getPinCoords(el, 'A');
          const pinB = getPinCoords(el, 'B');

          // Lookup Highlight info for pins
          const nodeInfoA = getPinNodeInfo(el.id, 'A');
          const nodeInfoB = getPinNodeInfo(el.id, 'B');

          return (
            <div
              key={el.id}
              className={`absolute flex items-center justify-center pointer-events-auto bg-white border-2 rounded-xl cursor-move select-none transition-all ${
                isSelected
                  ? 'border-indigo-600 shadow-xl ring-2 ring-indigo-500/20'
                  : 'border-slate-300 shadow-sm hover:shadow hover:border-slate-400'
              }`}
              style={{
                left: el.x - 60,
                top: el.y - 30,
                width: 120,
                height: 60,
                transform: `rotate(${el.rotation}deg)`,
                transformOrigin: 'center center',
              }}
              onMouseDown={(e) => startDraggingElement(el.id, e)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedElId(el.id);
              }}
            >
              {/* Selection actions HUD visible above components */}
              {isSelected && (
                <div
                  className="absolute -top-12 left-0 right-0 h-10 flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-2 shadow-lg z-50 action-btn"
                  style={{
                    transform: `rotate(${-el.rotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRotateElement(el.id);
                    }}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 cursor-pointer"
                    title="Rotate element 90 degrees clockwise"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  {/* Component identifier name */}
                  <span className="text-[10px] font-mono text-slate-300 font-bold px-1.5 uppercase tracking-wider">
                    {el.name}
                  </span>

                  {/* AC/DC switch selector only for Voltage (V) and Current (I) sources */}
                  {isSource && onUpdateElementSourceMode && (
                    <div className="flex items-center bg-slate-800 border border-slate-700 rounded p-0.5 text-[9px] font-bold">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateElementSourceMode(el.id, 'DC');
                        }}
                        className={`px-1.5 py-0.5 rounded cursor-pointer ${
                          el.sourceMode !== 'AC' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        DC
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateElementSourceMode(el.id, 'AC');
                        }}
                        className={`px-1.5 py-0.5 rounded cursor-pointer ${
                          el.sourceMode === 'AC' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        AC
                      </button>
                    </div>
                  )}

                  {/* Remove bin button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteElement(el.id);
                      if (selectedElId === el.id) setSelectedElId(null);
                    }}
                    className="p-1 rounded bg-slate-800 hover:bg-red-950 text-red-400 hover:text-red-300 cursor-pointer"
                    title="Remove this element"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Pin Terminal A (Connected to Pin A) */}
              <div
                onClick={(e) => handlePinClick(el.id, 'A', e)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`absolute -left-2.5 top-[23px] w-3 h-3 rounded-full border transition-all cursor-crosshair shadow-sm z-35 pointer-events-auto ${
                  highlightNodes && nodeInfoA
                    ? 'scale-110 shadow'
                    : 'border-red-700 bg-red-500 hover:bg-red-600'
                } ${
                  wiringMode && activePin?.componentId === el.id && activePin?.pin === 'A'
                    ? 'ring-4 ring-indigo-500 scale-125 animate-ping'
                    : 'hover:scale-135'
                }`}
                style={{
                  backgroundColor: highlightNodes && nodeInfoA ? nodeInfoA.color : undefined,
                  borderColor: highlightNodes && nodeInfoA ? '#ffffff' : undefined,
                }}
                title={nodeInfoA ? `Terminal A (${nodeInfoA.nodeId})` : 'Pin A Terminal'}
              >
                {/* Floating pill designation label if highlight requested */}
                {highlightNodes && nodeInfoA && (
                  <div
                    className="absolute -top-4 -left-1 px-1 bg-slate-900 border border-slate-700/80 rounded text-[8px] font-bold font-mono text-white pointer-events-none scale-90 whitespace-nowrap shadow"
                    style={{
                      transform: `rotate(${-el.rotation}deg)`,
                      transformOrigin: 'center center',
                    }}
                  >
                    {nodeInfoA.name}
                  </div>
                )}
              </div>

              {/* Pin Terminal B (Connected to Pin B) */}
              <div
                onClick={(e) => handlePinClick(el.id, 'B', e)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`absolute -right-2.5 top-[23px] w-3 h-3 rounded-full border transition-all cursor-crosshair shadow-sm z-35 pointer-events-auto ${
                  highlightNodes && nodeInfoB
                    ? 'scale-110 shadow'
                    : 'border-red-700 bg-red-500 hover:bg-red-600'
                } ${
                  wiringMode && activePin?.componentId === el.id && activePin?.pin === 'B'
                    ? 'ring-4 ring-indigo-500 scale-125 animate-ping'
                    : 'hover:scale-135'
                }`}
                style={{
                  backgroundColor: highlightNodes && nodeInfoB ? nodeInfoB.color : undefined,
                  borderColor: highlightNodes && nodeInfoB ? '#ffffff' : undefined,
                }}
                title={nodeInfoB ? `Terminal B (${nodeInfoB.nodeId})` : 'Pin B Terminal'}
              >
                {/* Floating pill designation label if highlight requested */}
                {highlightNodes && nodeInfoB && (
                  <div
                    className="absolute -top-4 -right-2 px-1 bg-slate-900 border border-slate-700/80 rounded text-[8px] font-bold font-mono text-white pointer-events-none scale-90 whitespace-nowrap shadow"
                    style={{
                      transform: `rotate(${-el.rotation}deg)`,
                      transformOrigin: 'center center',
                    }}
                  >
                    {nodeInfoB.name}
                  </div>
                )}
              </div>

              {/* Graphics Content Frame */}
              <div className="absolute inset-x-2.5 inset-y-1.5 flex flex-col items-center justify-between pointer-events-none">
                {/* Visual Label name */}
                <span className="text-[10px] text-slate-500 font-mono font-bold select-none">
                  {el.name}
                </span>

                {/* Draw matching electric symbol SVGs gracefully */}
                <div className="w-full flex-1 flex items-center justify-center -my-1 pb-1">
                  {el.type === 'R' && (
                    <svg className="w-16 h-6 stroke-slate-700 stroke-[2.2] fill-none" viewBox="0 0 80 20">
                      <path d="M 0,10 L 15,10 L 20,4 L 28,16 L 36,4 L 44,16 L 52,4 L 60,16 L 65,10 L 80,10" />
                    </svg>
                  )}
                  {el.type === 'C' && (
                    <svg className="w-16 h-6 stroke-slate-700 stroke-[2.2] fill-none" viewBox="0 0 80 20">
                      <line x1="0" y1="10" x2="35" y2="10" />
                      <line x1="35" y1="2" x2="35" y2="18" strokeWidth="2.8" />
                      <line x1="45" y1="2" x2="45" y2="18" strokeWidth="2.8" />
                      <line x1="45" y1="10" x2="80" y2="10" />
                    </svg>
                  )}
                  {el.type === 'L' && (
                    <svg className="w-16 h-6 stroke-slate-700 stroke-[2.2] fill-none" viewBox="0 0 80 20">
                      <path d="M 0,10 L 16,10" />
                      <path d="M 16,10 C 16,2 24,2 24,10 C 24,2 32,2 32,10 C 32,2 40,2 40,10 C 40,2 48,2 48,10 C 48,2 56,2 56,10 C 56,2 64,2 64,10" />
                      <line x1="64" y1="10" x2="80" y2="10" />
                    </svg>
                  )}
                  {el.type === 'V' && (
                    <svg className="w-16 h-6 stroke-slate-700 stroke-[2.2] fill-none" viewBox="0 0 80 20">
                      <line x1="0" y1="10" x2="30" y2="10" />
                      <circle cx="40" cy="10" r="9" fill="white" />
                      {el.sourceMode === 'AC' ? (
                        /* Sinusoidal indicator path */
                        <path d="M 35,10 C 37.5,5 37.5,15 40,10 C 42.5,5 42.5,15 45,10" strokeWidth="2" />
                      ) : (
                        /* DC +/- indicators */
                        <>
                          <path d="M 34,10 L 38,10 M 36,8 L 36,12" strokeWidth="1.5" />
                          <path d="M 42,10 L 46,10" strokeWidth="1.5" strokeLinecap="round" />
                        </>
                      )}
                      <line x1="50" y1="10" x2="80" y2="10" />
                    </svg>
                  )}
                  {el.type === 'I' && (
                    <svg className="w-16 h-6 stroke-slate-700 stroke-[2.2] fill-none" viewBox="0 0 80 20">
                      <line x1="0" y1="10" x2="30" y2="10" />
                      <circle cx="40" cy="10" r="9" fill="white" />
                      {el.sourceMode === 'AC' ? (
                        <>
                          {/* AC design inside circle */}
                          <path d="M 34,10 C 36,6 36,14 38,10 C 40,6 40,14 42,10" strokeWidth="1.5" />
                          <path d="M 43,8 L 46,10 L 43,12" strokeWidth="1.5" fill="none" />
                        </>
                      ) : (
                        /* Standard arrow heading direction Pin A (+) down to B (-) */
                        <path d="M 33,10 L 47,10 M 42,6 L 47,10 L 42,14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      )}
                      <line x1="50" y1="10" x2="80" y2="10" />
                    </svg>
                  )}
                </div>

                {/* Parameter input ribbon */}
                <div
                  className="flex items-center space-x-1.5 pointer-events-auto h-5 z-40 bg-white"
                  style={{
                    transform: `rotate(${-el.rotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                >
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    value={el.value}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        onUpdateElementValue(el.id, Math.abs(val));
                      }
                    }}
                    className="w-11 h-5 text-center text-[10px] font-bold font-mono border-b border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent hover:bg-slate-50 focus:bg-indigo-50/50 rounded"
                    title="Component parameter value"
                  />
                  <span className="text-[9px] font-bold font-mono text-slate-500 select-none">
                    {el.type === 'R' ? 'Ω' : el.type === 'C' ? 'μF' : el.type === 'L' ? 'mH' : el.type === 'V' ? 'V' : 'A'}
                  </span>

                  {/* Display Phase angle input if it is AC source */}
                  {isSource && el.sourceMode === 'AC' && onUpdateElementPhase && (
                    <div className="flex items-center space-x-0.5 border-l border-slate-200 pl-1">
                      <span className="text-[9px] font-bold text-indigo-500">∠</span>
                      <input
                        type="number"
                        value={el.phase || 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            onUpdateElementPhase(el.id, val);
                          }
                        }}
                        className="w-8 h-5 text-center text-[9px] font-semibold font-mono border-b border-slate-300 focus:border-indigo-500 focus:outline-none"
                        title="AC Phase Angle (Degrees)"
                      />
                      <span className="text-[8px] text-slate-400">°</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
