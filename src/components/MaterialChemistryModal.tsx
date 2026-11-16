import React from 'react';
import { MATERIALS_DATABASE } from '../physics/materialsData';
import { Atom, X, Zap, ShieldAlert, ArrowUpRight } from 'lucide-react';

interface MaterialChemistryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MaterialChemistryModal: React.FC<MaterialChemistryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const materialsList = Object.values(MATERIALS_DATABASE).sort((a, b) => b.triboOrder - a.triboOrder);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Atom className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Triboelectric Series & Atomic Work Functions</h2>
              <p className="text-xs text-slate-400">Chemical & physics classification of electron donor and acceptor materials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Visual Microscopic Diagram Image Banner */}
          <div className="relative rounded-xl overflow-hidden border border-slate-800 h-44 bg-slate-950">
            <img
              src="/src/assets/images/triboelectric_microscopic_diagram_1794501582738.jpg"
              alt="Triboelectric Microscopic Diagram"
              className="w-full h-full object-cover opacity-90"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent p-4 flex flex-col justify-end">
              <span className="text-cyan-400 font-bold uppercase tracking-wider text-[10px]">Microscopic Electron Interface</span>
              <p className="text-slate-200 font-medium text-xs max-w-xl">
                When two solid materials contact within 1 nanometer, valence electron orbitals overlap. Mechanical friction breaks surface bonds, transferring electrons from materials with low work function (donor +) to high electron affinity polymers (acceptor -).
              </p>
            </div>
          </div>

          {/* Triboelectric Ladder Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-200 text-sm">Triboelectric Affinity Series Ladder</h3>
              <span className="text-slate-400 text-[11px] font-mono">Ranked by Electron Shedding (+) to Capturing (-)</span>
            </div>

            <div className="space-y-2">
              {materialsList.map((mat) => (
                <div
                  key={mat.id}
                  className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: mat.color }} />
                    <div>
                      <span className="font-bold text-slate-100 text-xs">{mat.name}</span>
                      <span className="text-slate-500 text-[11px] font-mono ml-2">({mat.chemicalFormula})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-[11px] font-mono text-slate-300">
                    <div>
                      <span className="text-slate-500">Work Function W:</span>{' '}
                      <span className="text-cyan-400 font-bold">{mat.workFunctionEv} eV</span>
                    </div>

                    <div>
                      <span className="text-slate-500">Dielectric ε_r:</span>{' '}
                      <span className="text-pink-400 font-bold">{mat.dielectricConstant}</span>
                    </div>

                    <div className="w-24 text-right">
                      {mat.triboOrder > 0 ? (
                        <span className="text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                          +{mat.triboOrder} Donor
                        </span>
                      ) : mat.triboOrder < 0 ? (
                        <span className="text-pink-400 font-bold bg-pink-950/60 px-2 py-0.5 rounded border border-pink-500/30">
                          {mat.triboOrder} Acceptor
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          Neutral
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
