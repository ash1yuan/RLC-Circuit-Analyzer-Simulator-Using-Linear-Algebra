export type ComponentType = 'R' | 'V' | 'I' | 'L' | 'C';

export interface PinReference {
  componentId: string;
  pin: 'A' | 'B';
}

export interface CircuitElement {
  id: string;
  type: ComponentType;
  name: string;
  x: number; // Grid X (multiple of 20)
  y: number; // Grid Y (multiple of 20)
  rotation: 0 | 90 | 180 | 270; // Rotation in degrees
  value: number; // Resistance (Ω), Capacitance (μF / F), Inductance (mH / H), Voltage (V), or Current (A)
  sourceMode?: 'DC' | 'AC'; // For V and I sources
  phase?: number; // AC phase in degrees, e.g. V = value * ∠phase
}

export interface Wire {
  id: string;
  from: PinReference;
  to: PinReference;
  color?: string;
}

export interface PinPosition {
  x: number;
  y: number;
}

export interface ComplexNum {
  re: number;
  im: number;
}

export interface CircuitSolution {
  solvingStatus: 'idle' | 'success' | 'singular' | 'no_ground' | 'empty';
  isACMode: boolean;
  frequency: number;
  matrixARe?: number[][];
  matrixAIm?: number[][];
  vectorBRe?: number[];
  vectorBIm?: number[];
  variableNames?: string[];
  solutionRe?: number[];
  solutionIm?: number[];
  steps?: string[];
  nodesList?: { nodeId: string; pinKeys: string[] }[]; // Mapped electrical nodes for highlighting
}
