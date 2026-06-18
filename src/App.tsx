import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import CircuitCanvas from './components/CircuitCanvas';
import MatrixSolverView from './components/MatrixSolverView';
import { CircuitElement, Wire, PinReference, ComponentType, CircuitSolution } from './types';
import { solveCircuit } from './utils/circuitSolver';

export default function App() {
  // Elements and wires are initialized as blank arrays to give a clean drawing board!
  // This complies with "不需要预设情况，允许用户自主搭建电路"
  const [elements, setElements] = useState<CircuitElement[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);

  // Simulation parameters
  const [frequency, setFrequency] = useState<number>(50); // AC Ang Frequency f = 50Hz default
  const [isACMode, setIsACMode] = useState<boolean>(false); // Starts as DC Mode
  const [highlightNodes, setHighlightNodes] = useState<boolean>(true); // Dynamic Node Highlighting turned on by default!

  // Calculations solution state
  const [solution, setSolution] = useState<CircuitSolution>({
    solvingStatus: 'idle',
    isACMode: false,
    frequency: 0,
  });

  // Unique elements naming counter
  const getNextName = (type: ComponentType, currentElements: CircuitElement[]): string => {
    let suffix = 1;
    let name = `${type}${suffix}`;
    while (currentElements.some((el) => el.name === name)) {
      suffix++;
      name = `${type}${suffix}`;
    }
    return name;
  };

  // Run Solver automatically or on click
  const handleSolveCircuit = () => {
    const res = solveCircuit(elements, wires, frequency, isACMode);
    setSolution(res);
  };

  // Re-run solver instantly whenever components, wires, or parameters are edited to provide instant feedback!
  useEffect(() => {
    if (elements.length > 0) {
      const res = solveCircuit(elements, wires, frequency, isACMode);
      setSolution(res);
    } else {
      setSolution({ solvingStatus: 'empty', isACMode, frequency });
    }
  }, [elements, wires, frequency, isACMode]);

  // 1. Spawning / Adding components
  const handleAddElement = (type: ComponentType, x: number, y: number) => {
    const id = `el_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const name = getNextName(type, elements);
    const defaultValue = type === 'R' ? 10 : type === 'C' ? 100 : type === 'L' ? 10 : type === 'V' ? 12 : 2;

    const newElement: CircuitElement = {
      id,
      type,
      name,
      x,
      y,
      rotation: 0,
      value: defaultValue,
      sourceMode: isACMode ? 'AC' : 'DC', // Match current active analysis mode
      phase: 0,
    };

    setElements((prev) => [...prev, newElement]);
  };

  const handleSpawnElementFromSidebar = (type: ComponentType) => {
    // Spawn element in safe center area of visible canvas
    handleAddElement(type, 280, 240);
  };

  // 2. Element edits (Position, Value, Rotation, Deletion, AC/DC mode toggle, Phase angles)
  const handleUpdateElementPosition = (id: string, x: number, y: number) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, x, y } : el)));
  };

  const handleUpdateElementValue = (id: string, value: number) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, value } : el)));
  };

  const handleUpdateElementSourceMode = (id: string, mode: 'DC' | 'AC') => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, sourceMode: mode } : el)));
  };

  const handleUpdateElementPhase = (id: string, phase: number) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, phase } : el)));
  };

  const handleRotateElement = (id: string) => {
    setElements((prev) =>
      prev.map((el) => {
        if (el.id === id) {
          const nextRotation = ((el.rotation + 90) % 360) as 0 | 90 | 180 | 270;
          return { ...el, rotation: nextRotation };
        }
        return el;
      })
    );
  };

  const handleDeleteElement = (id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    // Clear all connection wires that used pins of the deleted component
    setWires((prev) => prev.filter((wire) => wire.from.componentId !== id && wire.to.componentId !== id));
  };

  // 3. Connection wiring management
  const handleAddWire = (from: PinReference, to: PinReference) => {
    // Check if duplicate wire already exists (pin connections are symmetrical)
    const isDuplicate = wires.some(
      (wire) =>
        (wire.from.componentId === from.componentId &&
          wire.from.pin === from.pin &&
          wire.to.componentId === to.componentId &&
          wire.to.pin === to.pin) ||
        (wire.from.componentId === to.componentId &&
          wire.from.pin === to.pin &&
          wire.to.componentId === from.componentId &&
          wire.to.pin === from.pin)
    );

    if (isDuplicate) return;

    // Direct wire ID
    const id = `wire_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const wireColors = ['#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ec4899'];
    const selectedColor = wireColors[wires.length % wireColors.length];

    const newWire: Wire = { id, from, to, color: selectedColor };
    setWires((prev) => [...prev, newWire]);
  };

  const handleDeleteWire = (id: string) => {
    setWires((prev) => prev.filter((wire) => wire.id !== id));
  };

  const handleClearCanvas = () => {
    if (window.confirm('Are you sure you want to clear the canvas? All drawn elements and wires will be permanently removed so you can start clean.')) {
      setElements([]);
      setWires([]);
    }
  };

  // Quick helper to load a smart AC tutorial bridge to help first-time users explore!
  const loadTutorialBridge = () => {
    setElements([
      { id: 'v1', type: 'V', name: 'V1', x: 200, y: 240, rotation: 90, value: 24, sourceMode: 'AC', phase: 0 },
      { id: 'c1', type: 'C', name: 'C1', x: 360, y: 140, rotation: 0, value: 100 },
      { id: 'r1', type: 'R', name: 'R1', x: 520, y: 240, rotation: 90, value: 10 },
      { id: 'l1', type: 'L', name: 'L1', x: 360, y: 340, rotation: 0, value: 15 },
    ]);
    setWires([
      { id: 'w1', from: { componentId: 'v1', pin: 'A' }, to: { componentId: 'c1', pin: 'A' } },
      { id: 'w2', from: { componentId: 'c1', pin: 'B' }, to: { componentId: 'r1', pin: 'A' } },
      { id: 'w3', from: { componentId: 'r1', pin: 'B' }, to: { componentId: 'l1', pin: 'B' } },
      { id: 'w4', from: { componentId: 'l1', pin: 'A' }, to: { componentId: 'v1', pin: 'B' } },
      // Shunt connection to form dual loop for matrix solvability
      { id: 'w5', from: { componentId: 'c1', pin: 'B' }, to: { componentId: 'l1', pin: 'A' } },
    ]);
    setIsACMode(true);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 text-slate-900 select-none overflow-hidden font-sans">
      {/* Upper header action navigation */}
      <Header
        onClear={handleClearCanvas}
        onSolve={handleSolveCircuit}
        solvingStatus={solution.solvingStatus}
        frequency={frequency}
        onFrequencyChange={setFrequency}
        isACMode={isACMode}
        onACModeChange={setIsACMode}
        highlightNodes={highlightNodes}
        onHighlightNodesChange={setHighlightNodes}
      />

      {/* Main workspaces */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Library panel */}
        <Sidebar onSpawnElement={handleSpawnElementFromSidebar} />

        {/* Right workspace split containing Canvas and Equation matrix solvers */}
        <div className="flex flex-col flex-1 overflow-hidden relative">
          
          {/* Welcome tutorial ribbon displayed if canvas is empty */}
          {elements.length === 0 && (
            <div className="absolute top-20 left-12 right-12 mx-auto max-w-xl z-20 text-center bg-white/95 backdrop-blur border border-slate-200 p-6 rounded-2xl shadow-xl space-y-3 pointer-events-auto">
              <span className="text-2xl">⚡</span>
              <h3 className="text-sm font-bold text-slate-800">Start Building Your Custom Circuit</h3>
              <p className="text-xs text-slate-500 leading-normal">
                To support a wide range of linear algebra and circuit theory assignments, the canvas is initialized completely blank. You can drag and drop resistors, inductors, capacitors, or voltage/current sources from the sidebar, or click the button below to quickly load a preset R-L-C dual-loop AC circuit:
              </p>
              <button
                onClick={loadTutorialBridge}
                className="mt-2.5 px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow cursor-pointer transition-all active:scale-95"
              >
                💡 Quick Load R-L-C AC Circuit Demo
              </button>
            </div>
          )}

          {/* Main interactive grid canvas */}
          <CircuitCanvas
            elements={elements}
            wires={wires}
            nodesList={solution.nodesList}
            highlightNodes={highlightNodes}
            onAddElement={handleAddElement}
            onUpdateElementPosition={handleUpdateElementPosition}
            onUpdateElementValue={handleUpdateElementValue}
            onRotateElement={handleRotateElement}
            onDeleteElement={handleDeleteElement}
            onAddWire={handleAddWire}
            onDeleteWire={handleDeleteWire}
            onUpdateElementSourceMode={handleUpdateElementSourceMode}
            onUpdateElementPhase={handleUpdateElementPhase}
          />

          {/* Lower interactive matrix viewer detailing variables / gauss elimination steps */}
          <MatrixSolverView solution={solution} />
        </div>
      </div>
    </div>
  );
}
