import { useState } from 'react';
import { CircuitSolution, ComplexNum } from '../types';
import { BookOpen, Table, FileText, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

interface MatrixSolverViewProps {
  solution: CircuitSolution;
}

export default function MatrixSolverView({ solution }: MatrixSolverViewProps) {
  const [activeTab, setActiveTab] = useState<'matrix' | 'steps' | 'results'>('matrix');

  const {
    solvingStatus,
    isACMode,
    frequency,
    matrixARe,
    matrixAIm,
    vectorBRe,
    vectorBIm,
    variableNames = [],
    solutionRe,
    solutionIm,
    steps = [],
  } = solution;

  // Custom complex formatter
  const formatComplex = (re: number, im: number, dec = 2): string => {
    if (Math.abs(im) < 1e-5) return re.toFixed(dec);
    if (Math.abs(re) < 1e-5) {
      return `${im >= 0 ? '' : '-'}${Math.abs(im).toFixed(dec)}j`;
    }
    return `(${re.toFixed(dec)}${im >= 0 ? '+' : '-'}${Math.abs(im).toFixed(dec)}j)`;
  };

  const calculatePhasor = (re: number, im: number) => {
    const r = Math.sqrt(re * re + im * im);
    const theta = (Math.atan2(im, re) * 180) / Math.PI;
    return { mag: r, angle: theta };
  };

  if (solvingStatus === 'empty') {
    return (
      <div className="bg-white border-t border-slate-200 p-6 flex flex-col items-center justify-center text-center text-slate-500 h-64 shrink-0">
        <HelpCircle className="w-8 h-8 text-slate-300 mb-2 animate-bounce" />
        <h3 className="font-semibold text-slate-700 text-sm">No Solving Data / Empty Canvas</h3>
        <p className="text-xs text-slate-400 max-w-md mt-1">
          There are no connected components on the canvas yet. Please drag resistors (R), capacitors (C), inductors (L), or voltage/current sources from the sidebar, connect them in a closed circuit, and the system will automatically formulate and solve the equations!
        </p>
      </div>
    );
  }

  if (solvingStatus === 'no_ground') {
    return (
      <div className="bg-amber-50 border-t border-amber-200 p-6 flex flex-col items-center justify-center text-center text-amber-700 h-64 shrink-0">
        <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
        <h3 className="font-semibold text-amber-800 text-sm">No Reference Ground Node (0V) Found</h3>
        <p className="text-xs text-amber-600 max-w-sm mt-1">
          To formulate the Modified Nodal Analysis (MNA) equations, the circuit needs a closed connection and a reference ground node. Please connect elements using wires on the canvas.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border-t-2 border-slate-200 flex flex-col shrink-0 h-80 z-20">
      {/* Tab select banner */}
      <div className="bg-slate-50 border-b border-slate-200 flex items-center justify-between px-6 py-2">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'matrix' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            1. Equations Matrix [A | b]
          </button>
          <button
            onClick={() => setActiveTab('steps')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'steps' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            2. Elementary Row Steps
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'results' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            3. Solved Potentials & Currents
          </button>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-slate-400">Analysis Mode:</span>
          <span className="text-slate-700 font-bold bg-slate-200/80 px-2 py-0.5 rounded border border-slate-300">
            {isACMode ? `AC (${frequency}Hz)` : 'DC'}
          </span>
          {solvingStatus === 'success' ? (
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              ● Solved Successfully
            </span>
          ) : (
            <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
              ▲ Singular / Unsolvable
            </span>
          )}
        </div>
      </div>

      {/* Main tab content */}
      <div className="flex-1 overflow-auto p-5 font-sans bg-slate-950 text-slate-100">
        
        {/* Tab 1: Algebraic equation and brackets display */}
        {activeTab === 'matrix' && (
          <div className="h-full flex flex-col lg:flex-row gap-6">
            {/* Algebraic Representation */}
            <div className="flex-1 min-w-[300px] max-h-[220px] overflow-y-auto">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                MNA Algebraic Equations
              </h4>
              <p className="text-[10px] text-slate-400 mb-3">
                Formulated via Kirchhoff's Current Law (KCL) and voltage constraint equations at each non-reference node in the circuit:
              </p>

              <div className="space-y-2">
                {matrixARe && vectorBRe && (
                  matrixARe.map((rowReArr, rowIndex) => {
                    const rowImArr = matrixAIm?.[rowIndex] || [];
                    const rhsRe = vectorBRe[rowIndex];
                    const rhsIm = vectorBIm?.[rowIndex] || 0;

                    let equationTerms: string[] = [];

                    rowReArr.forEach((coeffRe, colIndex) => {
                      const coeffIm = rowImArr[colIndex] || 0;
                      if (Math.abs(coeffRe) < 1e-9 && Math.abs(coeffIm) < 1e-9) return;

                      const label = variableNames[colIndex] || `x${colIndex + 1}`;
                      const coeffStr = formatComplex(coeffRe, coeffIm, 2);
                      equationTerms.push(`${coeffStr}·${label}`);
                    });

                    let eqStr = equationTerms.join(' + ').replace(/\+ -/g, '- ');
                    if (eqStr === '') eqStr = '0';

                    const rhsFormatted = formatComplex(rhsRe, rhsIm, 2);

                    return (
                      <div key={rowIndex} className="bg-slate-900 border border-slate-800 p-2 rounded font-mono text-xs flex items-center justify-between">
                        <span className="text-slate-300">
                          <strong className="text-indigo-400 mr-1.5 flex-shrink-0">Eq {rowIndex + 1}:</strong> {eqStr}
                        </span>
                        <span className="text-amber-400 font-bold ml-1 flex-shrink-0">= {rhsFormatted}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Matrix Form Visualizer */}
            <div className="flex-1 flex flex-col justify-start">
              <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Augmented Input Matrix [A | b] Form:
              </h4>

              {matrixARe && vectorBRe && (
                <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800/80 p-3 rounded-xl font-mono text-[10px] overflow-x-auto shadow-inner max-h-[160px]">
                  <span className="text-4xl text-slate-500 font-light select-none">[</span>
                  <div className="flex flex-col space-y-1 py-1">
                    {matrixARe.map((rowReArr, rowIndex) => (
                      <div key={rowIndex} className="flex items-center space-x-2 text-slate-300 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          {rowReArr.map((coeffRe, colIndex) => {
                            const coeffIm = matrixAIm?.[rowIndex]?.[colIndex] || 0;
                            const termRepr = formatComplex(coeffRe, coeffIm, 1);
                            return (
                              <span
                                key={colIndex}
                                className={`w-20 text-right ${
                                  Math.abs(coeffRe) > 1e-9 || Math.abs(coeffIm) > 1e-9
                                    ? 'text-indigo-300 font-semibold'
                                    : 'text-slate-600'
                                }`}
                              >
                                {termRepr}
                              </span>
                            );
                          })}
                        </div>
                        <div className="border-l border-dashed border-slate-600 h-4 mx-1.5" />
                        <span className="w-16 text-right text-amber-400 font-bold">
                          {formatComplex(vectorBRe[rowIndex], vectorBIm?.[rowIndex] || 0, 1)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <span className="text-4xl text-slate-500 font-light select-none">]</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Gauss steps output */}
        {activeTab === 'steps' && (
          <div className="h-full flex flex-col">
            <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2">
              Gaussian Elimination Step Logs (MNA)
            </h4>
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-3 overflow-y-auto font-mono text-[10px] leading-relaxed text-slate-300 space-y-3 shadow-inner">
              {steps.length > 0 ? (
                steps.map((step, idx) => (
                  <div key={idx} className="whitespace-pre-wrap border-b border-slate-800/40 pb-2 last:border-none">
                    {step}
                  </div>
                ))
              ) : (
                <div className="text-slate-500 italic p-4 text-center">
                  No step logs yet. Please build a valid circuit on the canvas and click "Solve Matrix".
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Detailed simulation reports */}
        {activeTab === 'results' && (
          <div className="h-full flex flex-col justify-start">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">
              Resolved Electrical Node Potentials & Branch Currents
            </h4>

            {solvingStatus === 'success' && solutionRe ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[160px] pr-1">
                {variableNames.map((name, idx) => {
                  const isVolt = name.startsWith('V');
                  const re = solutionRe[idx] || 0;
                  const im = solutionIm?.[idx] || 0;
                  const rectangularStr = formatComplex(re, im, 3);
                  const polar = calculatePhasor(re, im);

                  return (
                    <div
                      key={name}
                      className={`p-2.5 rounded-lg border flex items-center justify-between shadow-sm ${
                        isVolt
                          ? 'bg-gradient-to-br from-indigo-950 to-slate-900 border-indigo-900/60'
                          : 'bg-gradient-to-br from-teal-950 to-slate-900 border-teal-900/60'
                      }`}
                    >
                      <div>
                        <div className="text-[8px] text-slate-400 uppercase font-mono tracking-widest font-bold">
                          {isVolt ? 'Node Potential' : 'Voltage Source Current'}
                        </div>
                        <div className="font-mono text-xs font-bold text-slate-100 mt-1 flex flex-col">
                          <div>
                            <code className={isVolt ? 'text-indigo-400' : 'text-teal-400'}>{name}</code> ={' '}
                            <span className="text-amber-400 font-bold">{rectangularStr}</span>{' '}
                            <span className="text-[9px] text-slate-400">{isVolt ? 'V' : 'A'}</span>
                          </div>
                          
                          {/* Polar Phasor Angle shown in AC Mode */}
                          {isACMode && (
                            <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">
                              Phasor: <span className="font-extrabold">{polar.mag.toFixed(3)}</span> ∠{' '}
                              <span className="font-extrabold">{polar.angle.toFixed(1)}°</span>{' '}
                              {isVolt ? 'V' : 'A'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={`p-1 text-xs rounded-md ${isVolt ? 'bg-indigo-950 text-indigo-400' : 'bg-teal-950 text-teal-400'} flex-shrink-0`}>
                        {isVolt ? '⚡ V' : '⇄ I'}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-rose-400 font-semibold text-center border border-dashed border-rose-950 bg-rose-950/20 rounded-lg p-5">
                <AlertTriangle className="w-7 h-7 mx-auto mb-1 text-rose-500" />
                <span className="text-xs">
                  Detected singular matrix or vanishing pivot. This usually indicates floating/isolated electrical nodes, or conflicting voltage sources connected in parallel. Please adjust elements and wires on the canvas.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
