import { CircuitElement, Wire, ComplexNum, CircuitSolution } from '../types';

/**
 * Custom math utility for Complex Numbers
 */
export const Complex = {
  zero: (): ComplexNum => ({ re: 0, im: 0 }),
  one: (): ComplexNum => ({ re: 1, im: 0 }),
  create: (re: number, im = 0): ComplexNum => ({ re, im }),
  add: (a: ComplexNum, b: ComplexNum): ComplexNum => ({ re: a.re + b.re, im: a.im + b.im }),
  sub: (a: ComplexNum, b: ComplexNum): ComplexNum => ({ re: a.re - b.re, im: a.im - b.im }),
  mul: (a: ComplexNum, b: ComplexNum): ComplexNum => ({
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  }),
  div: (a: ComplexNum, b: ComplexNum): ComplexNum => {
    const denom = b.re * b.re + b.im * b.im;
    if (denom < 1e-15) {
      return { re: 1e9, im: 0 }; // Guard against division by zero
    }
    return {
      re: (a.re * b.re + a.im * b.im) / denom,
      im: (a.im * b.re - a.re * b.im) / denom,
    };
  },
  abs: (a: ComplexNum): number => Math.sqrt(a.re * a.re + a.im * a.im),
  phase: (a: ComplexNum): number => {
    // Phase angle in degrees
    return (Math.atan2(a.im, a.re) * 180) / Math.PI;
  },
  format: (a: ComplexNum, decimals = 3): string => {
    const r = a.re;
    const i = a.im;
    if (Math.abs(i) < 1e-5) return r.toFixed(decimals);
    if (Math.abs(r) < 1e-5) {
      return `${i >= 0 ? '' : '-'}${Math.abs(i).toFixed(decimals)}j`;
    }
    return `${r.toFixed(decimals)}${i >= 0 ? '+' : '-'}${Math.abs(i).toFixed(decimals)}j`;
  },
};

/**
 * Union-Find implementation to find electrical nodes (connected components of pins)
 */
class UnionFind {
  parent: Record<string, string> = {};

  find(id: string): string {
    if (!this.parent[id]) {
      this.parent[id] = id;
    }
    if (this.parent[id] === id) {
      return id;
    }
    this.parent[id] = this.find(this.parent[id]);
    return this.parent[id];
  }

  union(id1: string, id2: string): void {
    const root1 = this.find(id1);
    const root2 = this.find(id2);
    if (root1 !== root2) {
      this.parent[root1] = root2;
    }
  }
}

/**
 * Solve circuit using Nodal / Modified Nodal Analysis (MNA)
 */
export function solveCircuit(
  elements: CircuitElement[],
  wires: Wire[],
  globalFrequency = 50,
  preferACMode = false
): CircuitSolution {
  if (elements.length === 0) {
    return { solvingStatus: 'empty', isACMode: false, frequency: 0 };
  }

  // Determine if we should perform AC simulation or DC simulation
  // We trigger AC steady-state if preferACMode is true or if ANY AC source exists or if C/L exists with frequency > 0
  const hasACSource = elements.some(
    (el) => (el.type === 'V' || el.type === 'I') && el.sourceMode === 'AC'
  );
  const hasLOrC = elements.some((el) => el.type === 'L' || el.type === 'C');
  const isACActive = preferACMode || (globalFrequency > 0 && (hasACSource || hasLOrC));
  const frequency = isACActive ? Math.max(0.1, globalFrequency) : 0;
  const omega = 2 * Math.PI * frequency;

  // 1. Collect all electrical pin keys: "elementId_A" and "elementId_B"
  const pinKeys: string[] = [];
  elements.forEach((el) => {
    pinKeys.push(`${el.id}_A`);
    pinKeys.push(`${el.id}_B`);
  });

  // 2. Perform Union-Find to group connected pins
  const uf = new UnionFind();

  // Connect pins through direct wires
  wires.forEach((wire) => {
    const pin1Key = `${wire.from.componentId}_${wire.from.pin}`;
    const pin2Key = `${wire.to.componentId}_${wire.to.pin}`;
    uf.union(pin1Key, pin2Key);
  });

  // Under DC steady-state, clean inductors (L) function as simple direct wire conductors.
  // We can treat them as direct shorts to avoid singular matrices and maintain elegant solver simplicity!
  if (!isACActive) {
    elements.forEach((el) => {
      if (el.type === 'L') {
        uf.union(`${el.id}_A`, `${el.id}_B`);
      }
    });
  }

  // 3. Extract unique electrical nodes
  const nodeRoots = new Set<string>();
  pinKeys.forEach((key) => {
    nodeRoots.add(uf.find(key));
  });

  const rootArray = Array.from(nodeRoots);
  const numNodes = rootArray.length;

  if (numNodes <= 1) {
    return { solvingStatus: 'no_ground', isACMode: isACActive, frequency };
  }

  // 4. Build node list representation for visualization / highlighting non-reference nodes
  // Let's sort nodes so we can choose Ground (Node 0)
  // We find candidate lowest absolute coordinates to select Ground Node
  let lowestY = -Infinity;
  let groundRoot = rootArray[0];

  elements.forEach((el) => {
    // Roughly compute absolute positions of terminals
    let pinAY = el.y;
    let pinBY = el.y;
    if (el.rotation === 90) {
      pinAY = el.y - 60;
      pinBY = el.y + 60;
    } else if (el.rotation === 270) {
      pinAY = el.y + 60;
      pinBY = el.y - 60;
    }

    const pinARoot = uf.find(`${el.id}_A`);
    const pinBRoot = uf.find(`${el.id}_B`);

    if (pinAY > lowestY) {
      lowestY = pinAY;
      groundRoot = pinARoot;
    }
    if (pinBY > lowestY) {
      lowestY = pinBY;
      groundRoot = pinBRoot;
    }
  });

  // Organize root arrays so ground is at index 0 explicitly
  const sortedRoots = [groundRoot, ...rootArray.filter((r) => r !== groundRoot)];
  
  // Format nodes list for highlighted UI returns
  const nodesList: { nodeId: string; pinKeys: string[] }[] = sortedRoots.map((root, index) => {
    const nodePins = pinKeys.filter((key) => uf.find(key) === root);
    return {
      nodeId: index === 0 ? 'Ground (Node 0)' : `Node ${index}`,
      pinKeys: nodePins,
    };
  });

  // Root mapping lookup for speedy index queries
  const rootToIndex: Record<string, number> = {};
  sortedRoots.forEach((root, idx) => {
    rootToIndex[root] = idx;
  });

  const getPinNodeIndex = (elementId: string, pin: 'A' | 'B'): number => {
    const key = `${elementId}_${pin}`;
    const root = uf.find(key);
    return rootToIndex[root] ?? 0;
  };

  // Identify independent voltage sources which require MNA equations
  const vSources = elements.filter((el) => el.type === 'V');
  const numVoltageSources = vSources.length;

  const numActiveNodes = numNodes - 1; // Exclusion of ground (0)
  const matrixSize = numActiveNodes + numVoltageSources;

  if (matrixSize === 0) {
    return { solvingStatus: 'singular', isACMode: isACActive, frequency, nodesList };
  }

  // 5. Construct complex Matrix A [size, size] and vector B [size]
  // Initialize as Complex numbers
  const A: ComplexNum[][] = Array(matrixSize)
    .fill(null)
    .map(() => Array(matrixSize).fill(null).map(() => Complex.zero()));
  const b: ComplexNum[] = Array(matrixSize).fill(null).map(() => Complex.zero());

  // Define variable names list (Voltages V_N1, V_N2... and Currents I_V1...)
  const variableNames: string[] = [];
  for (let i = 1; i <= numActiveNodes; i++) {
    variableNames.push(`V_n${i}`);
  }
  vSources.forEach((v) => {
    variableNames.push(`I_${v.name}`);
  });

  // Assistant function to add complex admittance to admittance matrix G
  const addAdmittance = (node1: number, node2: number, y: ComplexNum) => {
    if (node1 > 0) {
      A[node1 - 1][node1 - 1] = Complex.add(A[node1 - 1][node1 - 1], y);
    }
    if (node2 > 0) {
      A[node2 - 1][node2 - 1] = Complex.add(A[node2 - 1][node2 - 1], y);
    }
    if (node1 > 0 && node2 > 0) {
      A[node1 - 1][node2 - 1] = Complex.sub(A[node1 - 1][node2 - 1], y);
      A[node2 - 1][node1 - 1] = Complex.sub(A[node2 - 1][node1 - 1], y);
    }
  };

  // Add admittances of components (R, L, C)
  elements.forEach((el) => {
    const nodeA = getPinNodeIndex(el.id, 'A');
    const nodeB = getPinNodeIndex(el.id, 'B');

    if (el.type === 'R') {
      const g = 1.0 / Math.max(0.1, el.value); // Convert Resistance to Conductance
      addAdmittance(nodeA, nodeB, Complex.create(g, 0));
    } else if (el.type === 'C') {
      if (isACActive) {
        // Capacitance in microfarads: convert to Farads
        const capFarads = el.value * 1e-6;
        // Admittance Y_C = j * omega * C
        const yc = Complex.create(0, omega * capFarads);
        addAdmittance(nodeA, nodeB, yc);
      } else {
        // DC Capacitor is treated as Open Circuit (Admittance Y = 0)
        addAdmittance(nodeA, nodeB, Complex.zero());
      }
    } else if (el.type === 'L') {
      if (isACActive) {
        // Inductance in millihenry: convert to Henry
        const indHenry = el.value * 1e-3;
        // Impedance Z_L = j * omega * L. Admittance Y_L = 1 / Z_L = -j / (omega * L)
        const denominator = omega * indHenry;
        const yl = Complex.create(0, -1.0 / Math.max(1e-9, denominator));
        addAdmittance(nodeA, nodeB, yl);
      } else {
        // DC Inductor is treated as a short in Union Find, so it has effectively been shorted already.
        // We don't add extra admittance, as its nodes have been unioned.
      }
    }
  });

  // Add Current Source excitations (I)
  // Current flows from Pin A (+) to Pin B (-) inside the source.
  // In node equation terms: leaves nodeA (-) and enters nodeB (+) on right hand side
  elements.filter((el) => el.type === 'I').forEach((currentSrc) => {
    const nodeA = getPinNodeIndex(currentSrc.id, 'A');
    const nodeB = getPinNodeIndex(currentSrc.id, 'B');

    // Values of source: can be AC phasor (A * e^(j * phase)) or pure DC
    let val: ComplexNum;
    if (isACActive && currentSrc.sourceMode === 'AC') {
      const phaseRad = ((currentSrc.phase || 0) * Math.PI) / 180;
      val = Complex.create(
        currentSrc.value * Math.cos(phaseRad),
        currentSrc.value * Math.sin(phaseRad)
      );
    } else {
      val = Complex.create(currentSrc.value, 0);
    }

    if (nodeA > 0) {
      b[nodeA - 1] = Complex.sub(b[nodeA - 1], val); // Leave Node A (-)
    }
    if (nodeB > 0) {
      b[nodeB - 1] = Complex.add(b[nodeB - 1], val); // Enter Node B (+)
    }
  });

  // Fill in Voltage Source constraints (MNA additions)
  vSources.forEach((vSrc, vIndex) => {
    const nodeA = getPinNodeIndex(vSrc.id, 'A');
    const nodeB = getPinNodeIndex(vSrc.id, 'B');
    const varIdx = numActiveNodes + vIndex;

    // Phasor value for Voltage Source
    let val: ComplexNum;
    if (isACActive && vSrc.sourceMode === 'AC') {
      const phaseRad = ((vSrc.phase || 0) * Math.PI) / 180;
      val = Complex.create(
        vSrc.value * Math.cos(phaseRad),
        vSrc.value * Math.sin(phaseRad)
      );
    } else {
      val = Complex.create(vSrc.value, 0);
    }

    // Equation representing: V_nodeA - V_nodeB = val
    if (nodeA > 0) {
      A[varIdx][nodeA - 1] = Complex.create(1, 0);  // Equation constraint
      A[nodeA - 1][varIdx] = Complex.create(1, 0);  // Current contribution
    }
    if (nodeB > 0) {
      A[varIdx][nodeB - 1] = Complex.create(-1, 0); // Equation constraint
      A[nodeB - 1][varIdx] = Complex.create(-1, 0); // Current contribution
    }

    b[varIdx] = val; // RHS source value
  });

  // Save copy of pristine coefficients before Gauss-Jordan elimination
  const origARe = A.map((row) => row.map((val) => val.re));
  const origAIm = A.map((row) => row.map((val) => val.im));
  const origBRe = b.map((val) => val.re);
  const origBIm = b.map((val) => val.im);

  // Eliminate Matrix using Complex Gaussian-Jordan elimination
  const steps: string[] = [];
  const matrixLabel = isACActive ? 'complex branch impedances' : 'real branch conductances';
  steps.push(`[1] Formulate Modified Nodal Analysis (MNA) equations A · x = b using ${matrixLabel}:`);
  steps.push(`- Total electrical nodes detected: **${numNodes}**, including reference **Node 0 (Ground)**.`);
  steps.push(`- Number of independent unknown variables: **${variableNames.length}**`);
  steps.push(`- Current simulation mode: **${isACActive ? `AC Steady-State Analysis (Frequency: ${frequency} Hz)` : 'DC Steady-State Analysis'}**`);

  // Log non-reference nodes for instructional support
  nodesList.forEach((nd) => {
    steps.push(`- [${nd.nodeId}] connected pin terminals: \`${nd.pinKeys.join(', ')}\``);
  });

  // Perform Gaussian Elimination on Complex arrays!
  const size = matrixSize;
  const Aug: ComplexNum[][] = A.map((row, idx) => [...row, b[idx]]);

  steps.push(`[2] Construct the linear algebra augmented matrix [A | b]:`);
  steps.push(formatComplexAugmentedMatrix(Aug, variableNames, isACActive));

  for (let i = 0; i < size; i++) {
    // Pivot finding
    let maxRowIdx = i;
    let maxVal = Complex.abs(Aug[i][i]);
    for (let r = i + 1; r < size; r++) {
      const val = Complex.abs(Aug[r][i]);
      if (val > maxVal) {
        maxVal = val;
        maxRowIdx = r;
      }
    }

    // Singular check
    if (maxVal < 1e-12) {
      steps.push(`⚠️ Gaussian elimination failed: Pivot at column ${i + 1} is extremely small or 0 (singular or non-full-rank matrix). The circuit might contain floating/disconnected nodes, or conflicting voltage sources in parallel (short circuits)!`);
      return {
        solvingStatus: 'singular',
        isACMode: isACActive,
        frequency,
        matrixARe: origARe,
        matrixAIm: origAIm,
        vectorBRe: origBRe,
        vectorBIm: origBIm,
        variableNames,
        steps,
        nodesList,
      };
    }

    // Row swap
    if (maxRowIdx !== i) {
      const temp = Aug[i];
      Aug[i] = Aug[maxRowIdx];
      Aug[maxRowIdx] = temp;
      steps.push(`[Row Swap] Swap row ${i + 1} with row ${maxRowIdx + 1} (choosing the pivot with maximum magnitude):`);
      steps.push(formatComplexAugmentedMatrix(Aug, variableNames, isACActive));
    }

    // Normalize row
    const pivot = Aug[i][i];
    steps.push(`[Normalize] Divide row ${i + 1} by pivot ${Complex.format(pivot)}:`);
    for (let c = i; c <= size; c++) {
      Aug[i][c] = Complex.div(Aug[i][c], pivot);
    }
    steps.push(formatComplexAugmentedMatrix(Aug, variableNames, isACActive));

    // Eliminate other rows
    for (let r = 0; r < size; r++) {
      if (r !== i) {
        const factor = Aug[r][i];
        if (Complex.abs(factor) > 1e-11) {
          for (let c = i; c <= size; c++) {
            const product = Complex.mul(factor, Aug[i][c]);
            Aug[r][c] = Complex.sub(Aug[r][c], product);
          }
        }
      }
    }
    steps.push(`[Eliminate] Eliminate column ${i + 1} coefficients in all other rows:`);
    steps.push(formatComplexAugmentedMatrix(Aug, variableNames, isACActive));
  }

  // Extract solutions
  const solutionRe: number[] = [];
  const solutionIm: number[] = [];

  for (let i = 0; i < size; i++) {
    const sol = Aug[i][size];
    solutionRe.push(sol.re);
    solutionIm.push(sol.im);
  }

  steps.push(`[3] Elimination completed successfully! Extracting final solutions for unknown variables:`);
  variableNames.forEach((name, idx) => {
    const complexNum: ComplexNum = { re: solutionRe[idx], im: solutionIm[idx] };
    const formattedVal = Complex.format(complexNum);
    
    let unit = name.startsWith('V') ? 'V' : 'A';
    
    if (isACActive) {
      const mag = Complex.abs(complexNum).toFixed(3);
      const ph = Complex.phase(complexNum).toFixed(1);
      steps.push(`- ${name} = ${formattedVal} ${unit} (Phasor: ${mag} ∠ ${ph}° ${unit})`);
    } else {
      steps.push(`- ${name} = ${complexNum.re.toFixed(3)} ${unit}`);
    }
  });

  return {
    solvingStatus: 'success',
    isACMode: isACActive,
    frequency,
    matrixARe: origARe,
    matrixAIm: origAIm,
    vectorBRe: origBRe,
    vectorBIm: origBIm,
    variableNames,
    solutionRe,
    solutionIm,
    steps,
    nodesList,
  };
}

/**
 * Clean textual renderer for complex augmented matrices in monospace steps log
 */
function formatComplexAugmentedMatrix(Aug: ComplexNum[][], vars: string[], explainComplex: boolean): string {
  return Aug.map((row) => {
    const coefs = row
      .slice(0, row.length - 1)
      .map((val) => {
        const repr = Complex.format(val, 2);
        // Align spacing
        return repr.padStart(15);
      })
      .join(' ');
    const rhsVal = Complex.format(row[row.length - 1], 2).padStart(12);
    return `[ ${coefs}  |  ${rhsVal} ]`;
  }).join('\n');
}
