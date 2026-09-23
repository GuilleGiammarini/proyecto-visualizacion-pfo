import React, { useState } from 'react';
import Estudiantes from './Estudiantes';
import Convenios from './Convenios';
import ECOE from './ECOE';

const SECCIONES = [
  { id: 'estudiantes', label: '🎓 Estudiantes' },
  { id: 'Convenios', label: '📄 Convenios' },
  { id: 'ecoe', label: '🩺 ECOE' }
];

export default function App() {
  const [seccionPrincipal, setSeccionPrincipal] = useState('estudiantes');

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 border-t-4 border-t-blue-900">
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-bold text-blue-950">Sistema PFO - Medicina</h1>
            <p className="text-slate-500 text-sm mt-0.5">UNVM Humanas</p>
          </div>

          <div className="flex justify-center my-2 md:my-0">
            <img
              src="/Membrete-UNVMHumanas.png"
              alt="Membrete UNVM Humanas"
              className="h-16 md:h-20 w-auto object-contain"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 justify-center">
            {SECCIONES.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setSeccionPrincipal(sec.id)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  seccionPrincipal === sec.id
                    ? 'bg-blue-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sec.label}
              </button>
            ))}
          </div>
        </div>

        {seccionPrincipal === 'estudiantes' && <Estudiantes />}
        {seccionPrincipal === 'convenios' && <Convenios />}
        {seccionPrincipal === 'ecoe' && <ECOE />}

      </div>
    </div>
  );
}