import React, { useState, useEffect, useMemo } from 'react';
import './ECOE.css'; // Todos los estilos, colores e impresión viven acá
import {
  ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  LineChart, Line
} from 'recharts';
 
const API_URL = "https://script.google.com/macros/s/AKfycby-qfURF_V4SjrHJIbr7_O-FVIm-QxUJf5nSwg3s5Lyx5as0o2jsEVQVfCSU751OprO-A/exec";
 
const UMBRAL_APROBACION_ESTACION = 60;
const PORCENTAJE_MIN_ESTACIONES_APROBADAS = 0.70;
const PROMEDIO_MIN_EXAMEN = 60;
const NOTA_MAXIMA_ITEM = 5;
 
const MARCA = {
  navy: '#1c3f66',
  teal: '#5fa8ac'
};
 
const BANDAS = [
  { min: 90, bg: 'bg-emerald-700', text: 'text-white', nombre: 'Excelente' },
  { min: 80, bg: 'bg-emerald-500', text: 'text-white', nombre: 'Muy bueno' },
  { min: 70, bg: 'bg-teal-500', text: 'text-white', nombre: 'Bueno' },
  { min: 60, bg: 'bg-amber-400', text: 'text-slate-900', nombre: 'Aprobado justo' },
  { min: 0, bg: 'bg-rose-500', text: 'text-white', nombre: 'Desaprobado' }
];
 
const obtenerBanda = (porcentaje) => BANDAS.find((b) => porcentaje >= b.min) || BANDAS[BANDAS.length - 1];
const colorBarra = (porcentaje) => (porcentaje >= UMBRAL_APROBACION_ESTACION ? '#10b981' : '#f43f5e');
 
const obtenerNotaEscala = (porcentaje) => {
  const p = Math.round(porcentaje);
  if (p >= 96) return 10;
  if (p >= 90) return 9;
  if (p >= 83) return 8;
  if (p >= 77) return 7;
  if (p >= 70) return 6;
  if (p >= 65) return 5;
  if (p >= 60) return 4;
  return 2;
};
 
const normalizarTexto = (texto) => {
  if (!texto) return "";
  return texto
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};
 
const normalizarNota = (valor) => {
  if (typeof valor === 'boolean') return valor ? NOTA_MAXIMA_ITEM : 0;
  const num = parseFloat(valor);
  if (isNaN(num)) return 0;
  return Math.min(NOTA_MAXIMA_ITEM, Math.max(0, num));
};
 
const formatearFecha = (iso) => {
  if (!iso) return 'Sin fecha';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Sin fecha';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};
 
const MembretePDF = () => (
  <div className="membrete-impresion">
    <div className="flex items-center gap-4">
      <img
        src="/Membrete-UNVMHumanas.png"
        alt="Membrete UNVM Humanas"
        className="ecoe-membrete-logo"
      />
    </div>
    <div className="text-right">
      <h1 className="text-sm font-bold tracking-widest text-slate-800 uppercase" style={{ fontFamily: 'Georgia, serif' }}>
        Medicina
      </h1>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">
        Universidad Nacional de Villa María
      </p>
    </div>
  </div>
);
 
function EncabezadoECOE({ vista, setVista, totalEstudiantes, totalEstaciones }) {
  const tabs = [
    { id: 'mapa', label: 'Mapa de calor' },
    { id: 'analisis', label: 'Análisis de resultados' },
    { id: 'portafolio', label: 'Portafolio de estudiante' }
  ];
 
  return (
    <div className="ecoe-header-gradient rounded-2xl overflow-hidden shadow-sm border border-slate-200 no-imprimir">
      <div className="px-6 pt-6 pb-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
              ECOE
            </span>
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
              Evaluación Clínica Objetiva Estructurada
            </span>
          </div>
          <p className="text-[11px] text-slate-300 mt-1">
            {totalEstudiantes} estudiantes · {totalEstaciones} estaciones activas
          </p>
        </div>
      </div>
 
      <div className="bg-black/15 px-4">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setVista(t.id)}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wide transition-colors border-b-2 ${
                vista === t.id
                  ? 'text-white border-white'
                  : 'text-slate-300 border-transparent hover:text-white hover:border-white/40'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
 
function TarjetaMetrica({ etiqueta, valor, detalle, acento }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{etiqueta}</p>
      <p className={`text-2xl font-black mt-1 ${acento || 'text-slate-800'}`}>{valor}</p>
      {detalle && <p className="text-[11px] text-slate-400 mt-0.5">{detalle}</p>}
    </div>
  );
}
 
function VistaAnalisisResultados({ datosPorEstacion, resultadosMap, dniFiltro, listaEstudiantes }) {
  // Si hay un DNI seleccionado, filtramos los resultados de ese estudiante
  const datosCalculados = useMemo(() => {
    if (!dniFiltro) return datosPorEstacion; // Modo global

    const estudianteObj = listaEstudiantes.find(e => e.dni === dniFiltro);
    if (!estudianteObj) return datosPorEstacion;

    return datosPorEstacion.map((d) => {
      const res = resultadosMap[`${dniFiltro}__${d.estacion}`];
      return {
        estacion: d.estacion,
        promedio: res ? res.porcentaje : 0,
        evaluados: res ? 1 : 0,
        estado: res ? res.estado : 'Sin datos'
      };
    });
  }, [datosPorEstacion, dniFiltro, resultadosMap, listaEstudiantes]);

  const hayDatos = datosCalculados.some((d) => d.evaluados > 0);
 
  const promedioGeneral = useMemo(() => {
    const conDatos = datosCalculados.filter((d) => d.evaluados > 0);
    if (conDatos.length === 0) return 0;
    return Math.round(conDatos.reduce((acc, d) => acc + d.promedio, 0) / conDatos.length);
  }, [datosCalculados]);
 
  const estacionMasDificil = useMemo(() => {
    const conDatos = datosCalculados.filter((d) => d.evaluados > 0);
    if (conDatos.length === 0) return null;
    return conDatos.reduce((min, d) => (d.promedio < min.promedio ? d : min), conDatos[0]);
  }, [datosCalculados]);
 
  const estacionMasFacil = useMemo(() => {
    const conDatos = datosCalculados.filter((d) => d.evaluados > 0);
    if (conDatos.length === 0) return null;
    return conDatos.reduce((max, d) => (d.promedio > max.promedio ? d : max), conDatos[0]);
  }, [datosCalculados]);
 
  const tasaAprobacion = useMemo(() => {
    const conDatos = datosCalculados.filter((d) => d.evaluados > 0);
    if (conDatos.length === 0) return 0;
    const promedioAprobado = conDatos.filter((d) => d.promedio >= UMBRAL_APROBACION_ESTACION).length;
    return Math.round((promedioAprobado / conDatos.length) * 100);
  }, [datosCalculados]);
 
  if (!hayDatos) {
    return (
      <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
        <p className="text-xs font-semibold text-slate-500">
          Todavía no hay evaluaciones cargadas para este estudiante / filtro.
        </p>
      </div>
    );
  }
 
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <TarjetaMetrica etiqueta="Rendimiento promedio" valor={`${promedioGeneral}%`} />
        <TarjetaMetrica
          etiqueta="Tasa de estaciones aprobadas"
          valor={`${tasaAprobacion}%`}
          acento={tasaAprobacion >= 70 ? 'text-emerald-600' : 'text-rose-600'}
        />
        <TarjetaMetrica
          etiqueta="Estación más difícil"
          valor={estacionMasDificil ? `${estacionMasDificil.promedio}%` : '—'}
          detalle={estacionMasDificil?.estacion}
          acento="text-rose-600"
        />
        <TarjetaMetrica
          etiqueta="Estación más fácil"
          valor={estacionMasFacil ? `${estacionMasFacil.promedio}%` : '—'}
          detalle={estacionMasFacil?.estacion}
          acento="text-emerald-600"
        />
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
            Rendimiento por estación (%)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={datosCalculados} outerRadius="75%">
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="estacion" tick={{ fontSize: 10, fill: '#475569' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <Radar
                name="Promedio"
                dataKey="promedio"
                stroke={MARCA.navy}
                fill={MARCA.teal}
                fillOpacity={0.5}
              />
              <Tooltip formatter={(v) => `${v}%`} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
 
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
            Comparativa de puntuaciones por estación
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datosCalculados} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="estacion" tick={{ fontSize: 9, fill: '#475569' }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="promedio" radius={[6, 6, 0, 0]}>
                {datosCalculados.map((d, i) => (
                  <Cell key={i} fill={colorBarra(d.promedio)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
 
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Resumen por estación</h3>
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-3">Estación</th>
              <th className="p-3 text-center">Evaluados</th>
              <th className="p-3 text-center">Promedio / Calificación</th>
              <th className="p-3 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {datosCalculados.map((d, i) => {
              const banda = obtenerBanda(d.promedio);
              return (
                <tr key={i}>
                  <td className="p-3 font-semibold text-slate-700">{d.estacion}</td>
                  <td className="p-3 text-center text-slate-500">{d.evaluados}</td>
                  <td className="p-3 text-center font-bold text-slate-700">{d.evaluados > 0 ? `${d.promedio}%` : '—'}</td>
                  <td className="p-3 text-center">
                    {d.evaluados > 0 ? (
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${banda.bg} ${banda.text}`}>
                        {banda.nombre}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-300">Sin datos</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
 
function VistaPortafolio({ listaEstudiantes, resultadosMap, pfoMap, calcularResumenEstudiante, dniSeleccionado, setDniSeleccionado }) {
  const estudiante = listaEstudiantes.find((e) => e.dni === dniSeleccionado) || null;
  const historialPfoEstudiante = estudiante ? (pfoMap[estudiante.dni] || []) : [];

  const lineaDeTiempo = useMemo(() => {
    if (!estudiante) return [];
    return estudiante.estaciones
      .map((estacion) => resultadosMap[`${estudiante.dni}__${estacion}`])
      .filter(Boolean)
      .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
  }, [estudiante, resultadosMap]);
 
  const datosEvolucion = useMemo(
    () => lineaDeTiempo.map((r, i) => ({ nombre: r.estacion, orden: i + 1, porcentaje: r.porcentaje })),
    [lineaDeTiempo]
  );
 
  const resumen = estudiante ? calcularResumenEstudiante(estudiante) : null;
 
  // Cálculo de avance de PFO basado en las rotaciones completadas vs un total estimado
  const avancePfo = useMemo(() => {
    if (!historialPfoEstudiante.length) return { porcentaje: 75, etapa: 'Gineco', institucion: 'Sin institución asignada (Gineco)' };
    const completadas = historialPfoEstudiante.length;
    const porcentaje = Math.min(100, Math.round((completadas / 7) * 100)); 
    const ultimaRotacion = historialPfoEstudiante[historialPfoEstudiante.length - 1];
    return {
      porcentaje,
      etapa: ultimaRotacion.rotacion || 'Gineco',
      institucion: ultimaRotacion.hospital || 'Sin institución asignada (Gineco)'
    };
  }, [historialPfoEstudiante]);
 
  const descargarPortafolioPDF = () => {
    const tituloOriginal = document.title;
    if (estudiante) {
      document.title = `Portafolio_${estudiante.alumno.replace(/\s+/g, '_')}_${estudiante.dni}`;
    }
    const el = document.getElementById('contenedor-portafolio-impresion');
    if (el) el.classList.add('modo-impresion');
 
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        setTimeout(() => {
          if (el) el.classList.remove('modo-impresion');
          document.title = tituloOriginal;
        }, 100);
      });
    });
  };
 
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 border border-slate-200 no-imprimir flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
            Seleccionar estudiante
          </label>
          <select
            value={dniSeleccionado || ''}
            onChange={(e) => setDniSeleccionado(e.target.value)}
            className="w-full sm:w-96 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">— Elegí un estudiante —</option>
            {listaEstudiantes.map((e) => (
              <option key={e.dni} value={e.dni}>
                {e.alumno} (DNI: {e.dni})
              </option>
            ))}
          </select>
        </div>
 
        {estudiante && (
          <button
            onClick={descargarPortafolioPDF}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm self-end sm:self-auto no-imprimir"
          >
            📊 Descargar Portafolio Completo en PDF
          </button>
        )}
      </div>
 
      {!estudiante ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <p className="text-xs font-semibold text-slate-500">Elegí un estudiante para ver su portafolio.</p>
        </div>
      ) : (
        <div id="contenedor-portafolio-impresion" className="space-y-6 p-1">
          <MembretePDF />
 
          {/* Tarjeta de Información General y Datos del Estudiante */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">{estudiante.alumno}</h2>
                <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                  Cohorte {estudiante.cohorte || 'Abril de 2026'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                DNI: <span className="font-semibold text-slate-700">{estudiante.dni}</span> · Localidad: <span className="font-semibold text-slate-700">{estudiante.localidad || 'Villa María'}</span>
              </p>
            </div>
            
            <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 text-right w-full md:w-auto">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trayecto PFO</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5">Etapa Actual: {avancePfo.etapa}</p>
              <p className="text-[10px] text-slate-500">Inst: {avancePfo.institucion}</p>
            </div>
          </div>
 
          <div className="hidden modo-impresion mb-4 pb-3 border-b border-slate-300">
            <h2 className="text-xl font-bold text-slate-900">Portafolio ECOE - {estudiante.alumno}</h2>
            <p className="text-xs text-slate-600">DNI: {estudiante.dni} · Localidad: {estudiante.localidad || 'Villa María'} · Cohorte: {estudiante.cohorte || 'Abril 2026'}</p>
          </div>
 
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <TarjetaMetrica etiqueta="Promedio histórico" valor={`${resumen.promedio}%`} />
            <TarjetaMetrica etiqueta="Estaciones evaluadas" valor={`${resumen.evaluadas}/${resumen.totalAsignadas}`} />
            <TarjetaMetrica etiqueta="Estaciones aprobadas" valor={resumen.aprobadas} detalle={`mínimo ${resumen.minAprobar}`} acento="text-emerald-600" />
            <TarjetaMetrica
              etiqueta="Resultado ECOE"
              valor={resumen.resultadoFinal}
              acento={
                resumen.resultadoFinal === 'Aprobado'
                  ? 'text-emerald-600'
                  : resumen.resultadoFinal === 'Desaprobado'
                  ? 'text-rose-600'
                  : 'text-slate-500'
              }
            />
          </div>

          {/* NUEVO: Trayecto PFO - Cronograma de Módulos */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">
              Trayecto PFO - Cronograma de Módulos
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* APS */}
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">APS</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Completado</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">sem1 a 8 (09/02/2026 al 05/04/2026)</p>
                </div>
                <p className="text-[11px] font-medium text-slate-700 mt-2 pt-2 border-t border-slate-200/60">Asistencia Pública/CAPS Villa Nueva</p>
              </div>

              {/* APS Comunidad */}
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">Com comunitario / APS</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Completado</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">sem9 a 12 (06/04/2026 al 03/05/2026)</p>
                </div>
                <p className="text-[11px] font-medium text-slate-700 mt-2 pt-2 border-t border-slate-200/60">Hospital Comunitario de Villa Nueva</p>
              </div>

              {/* Cirugia */}
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">Cirugia: Hospital</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Completado</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">sem13 a 16 (04/05/2026 al 31/05/2026)</p>
                </div>
                <p className="text-[11px] font-medium text-slate-700 mt-2 pt-2 border-t border-slate-200/60">Hospital Regional Pasteur</p>
              </div>

              {/* Libre */}
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">Libre</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Completado</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">sem17 a 19 (01/06/2026 al 21/06/2026)</p>
                </div>
                <p className="text-[11px] font-medium text-slate-700 mt-2 pt-2 border-t border-slate-200/60">Sin institución asignada (Libre)</p>
              </div>

              {/* Pediatría */}
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">Pediatría</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Completado</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">sem20 a 26 (22/06/2026 al 09/08/2026)</p>
                </div>
                <p className="text-[11px] font-medium text-slate-700 mt-2 pt-2 border-t border-slate-200/60">Hospital Regional Pasteur</p>
              </div>

              {/* Gineco (EN CURSO - Específico para Gisela Aquino) */}
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/30 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-extrabold text-blue-900">Gineco</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">En Curso</span>
                  </div>
                  <p className="text-[11px] text-blue-700 mt-1">sem27 a 33 (10/08/2026 al 27/09/2026)</p>
                </div>
                <p className="text-[11px] font-semibold text-blue-900 mt-2 pt-2 border-t border-blue-100">Sin institución asignada (Gineco)</p>
              </div>

              {/* Clínica: Hospital (Pendiente) */}
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col justify-between md:col-span-2">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                  <div>
                    <span className="text-xs font-bold text-slate-800">Clínica: Hospital</span>
                    <p className="text-[11px] text-slate-500 mt-1">sem34 a 40 (28/09/2026 al 15/11/2026)</p>
                  </div>
                  <div className="mt-2 sm:mt-0 flex items-center gap-3">
                    <span className="text-[11px] font-medium text-slate-700">Hospital Regional Pasteur</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">Pendiente</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
 
          {/* Gráficos y Líneas de tiempo subsiguientes */}
          <div className="bg-white rounded-xl p-5 border border-slate-200">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Evolución de rendimiento (%)</h3>
            {datosEvolucion.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Este estudiante todavía no tiene estaciones evaluadas.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={datosEvolucion} margin={{ top: 8, right: 16, left: -20, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="nombre" tick={{ fontSize: 9, fill: '#475569' }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Line type="monotone" dataKey="porcentaje" stroke={MARCA.navy} strokeWidth={2} dot={{ r: 4, fill: MARCA.teal }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
 
export default function ECOE() {
  const [vista, setVista] = useState('mapa');
  const [pfoDatos, setPfoDatos] = useState([]);
 
  const [ecoeDatos, setEcoeDatos] = useState([]);
  const [estacionesConfigRaw, setEstacionesConfigRaw] = useState([]);
  const [asignacionesRaw, setAsignacionesRaw] = useState([]);
  const [loadingEcoe, setLoadingEcoe] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
 
  const [searchEcoe, setSearchEcoe] = useState('');
  const [filtroEstacionEcoe, setFiltroEstacionEcoe] = useState('todas');
  const [filtroDiaEcoe, setFiltroDiaEcoe] = useState('todos');
 
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [estacionSeleccionada, setEstacionSeleccionada] = useState(null);
  const [evaluadorActual, setEvaluadorActual] = useState('');
  const [guardando, setGuardando] = useState(false);
 
  const [dniPortafolio, setDniPortafolio] = useState('');
  
  // <-- AQUÍ SE MOVIÓ CORRECTAMENTE EL HOOK DENTRO DEL COMPONENTE -->
  const [dniFiltroAnalisis, setDniFiltroAnalisis] = useState('');
 
  const [colaPendientes, setColaPendientes] = useState(() => {
    try {
      const guardado = localStorage.getItem('ecoe_cola_offline');
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  });
  const [sincronizando, setSincronizando] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
 
  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
 
  useEffect(() => {
    try {
      localStorage.setItem('ecoe_cola_offline', JSON.stringify(colaPendientes));
    } catch (e) {
      console.error("Error guardando en localStorage:", e);
    }
  }, [colaPendientes]);
 
  useEffect(() => {
    if (onlineStatus && colaPendientes.length > 0 && !sincronizando) {
      sincronizarCola();
    }
  }, [onlineStatus, colaPendientes]);
 
  const sincronizarCola = async () => {
    if (colaPendientes.length === 0 || sincronizando) return;
    setSincronizando(true);
 
    const pendientesActuales = [...colaPendientes];
    const noSincronizados = [];
 
    for (const item of pendientesActuales) {
      try {
        await fetch(API_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
      } catch (err) {
        console.error("Fallo al sincronizar ítem:", err);
        noSincronizados.push(item);
      }
    }
 
    setColaPendientes(noSincronizados);
    setSincronizando(false);
    cargarDatos();
  };
 
  const cargarDatos = async () => {
  setLoadingEcoe(true);
  try {
    const [resultados, config, asignaciones, pfo] = await Promise.all([
      fetch(`${API_URL}?vista=ecoe`).then((r) => r.json()),
      fetch(`${API_URL}?vista=estaciones`).then((r) => r.json()),
      fetch(`${API_URL}?vista=asignaciones`).then((r) => r.json()),
      // AGREGÁ ESTA LÍNEA PARA TRAER PFO:
      fetch(`${API_URL}?vista=pfo`).then((r) => r.json()).catch(() => [])
    ]);
    
    setEcoeDatos(Array.isArray(resultados) ? resultados : []);
    setEstacionesConfigRaw(Array.isArray(config) ? config : []);
    setAsignacionesRaw(Array.isArray(asignaciones) ? asignaciones : []);
    
    // AGREGÁ ESTA LÍNEA PARA GUARDAR EL ESTADO:
    setPfoDatos(Array.isArray(pfo) ? pfo : []);

  } catch (err) {
    console.error("Error cargando datos", err);
  } finally {
    setLoadingEcoe(false);
  }
};
 
  useEffect(() => {
    cargarDatos();
  }, []);
 
  const estacionesConfigMap = useMemo(() => {
    const map = {};
    estacionesConfigRaw.forEach((item) => {
      const estacion = item.Estacion || item.estacion;
      if (!estacion) return;
      const catNombre = item.Categoria || item.categoria || 'General';
      const puntajeMaxItem = parseFloat(item.Puntaje_Max || item.puntaje_max || 0) || 0;
 
      if (!map[estacion]) map[estacion] = { nombre: estacion, categorias: {}, puntajeMax: 0 };
      if (!map[estacion].categorias[catNombre]) {
        map[estacion].categorias[catNombre] = {
          nombre: catNombre,
          items: [],
          puntajeMaxCategoria: 0,
          orden: parseFloat(item.Orden_Categoria || item.orden_categoria || 0) || 0
        };
      }
 
      map[estacion].categorias[catNombre].items.push({
        codigo: item.Item_Codigo || item.item_codigo || '',
        descripcion: item.Item_Descripcion || item.item_descripcion || '',
        puntajeMax: puntajeMaxItem,
        orden: parseFloat(item.Orden_Item || item.orden_item || 0) || 0
      });
      map[estacion].categorias[catNombre].puntajeMaxCategoria += puntajeMaxItem;
      map[estacion].puntajeMax += puntajeMaxItem;
    });
 
    Object.values(map).forEach((est) => {
      est.categorias = Object.values(est.categorias).sort((a, b) => a.orden - b.orden);
      est.categorias.forEach((cat) => cat.items.sort((a, b) => a.orden - b.orden));
    });
 
    return map;
  }, [estacionesConfigRaw]);
 
const estudiantesMap = useMemo(() => {
  const map = {};
  asignacionesRaw.forEach((a) => {
    const dni = (a.DNI_Estudiante || a.dni || '').toString();
    const alumno = a.Nombre_Estudiante || a.alumno || 'Sin Nombre';
    const dia = a.Dia || a.dia || '';
    const estacion = a.Estacion || a.estacion;
    
    // Capturamos datos adicionales si vienen desde Google Sheets (Cohorte, Localidad, etc.)
    const cohorte = a.Cohorte || a.cohorte || 'Abril de 2026';
    const localidad = a.Localidad || a.localidad || 'Villa María';
    
    if (!dni || !estacion) return;

    if (!map[dni]) {
      map[dni] = { 
        dni, 
        alumno, 
        dia, 
        cohorte, 
        localidad, 
        estaciones: [] 
      };
    }
    if (!map[dni].estaciones.includes(estacion)) {
      map[dni].estaciones.push(estacion);
    }
  });
  return map;
}, [asignacionesRaw]);
 
  const listaEstudiantes = useMemo(
    () => Object.values(estudiantesMap).sort((a, b) => a.alumno.localeCompare(b.alumno)),
    [estudiantesMap]
  );
 
  const listaEstacionesTotales = useMemo(() => {
    const set = new Set();
    asignacionesRaw.forEach((a) => {
      const estacion = a.Estacion || a.estacion;
      if (estacion) set.add(estacion);
    });
    return Array.from(set).sort();
  }, [asignacionesRaw]);
 
  const resultadosMap = useMemo(() => {
    const map = {};
    ecoeDatos.forEach((item) => {
      const dni = (item.DNI_Estudiante || item.dni || '').toString();
      const estacion = item.Estacion || item.estacion;
      if (!dni || !estacion) return;
 
      const puntaje = parseFloat(item.Puntaje_Total || item.puntaje || 0) || 0;
      const puntajeMax = parseFloat(item.Puntaje_Max_Estacion || item.puntajeMax || 100) || 100;
      const porcentaje = puntajeMax > 0 ? Math.round((puntaje / puntajeMax) * 100) : 0;
      const notaEscala = obtenerNotaEscala(porcentaje);
 
      let detalle = {};
      try {
        const crudo = item.Detalle_Items || item.detalleItems;
        detalle = crudo ? JSON.parse(crudo) : {};
      } catch {
        detalle = {};
      }
 
      map[`${dni}__${estacion}`] = {
        dni,
        estacion,
        puntaje,
        puntajeMax,
        porcentaje,
        notaEscala,
        estado: porcentaje >= UMBRAL_APROBACION_ESTACION ? 'Aprobado' : 'Desaprobado',
        evaluador: item.Evaluador || item.evaluador || '',
        observaciones: item.Observaciones || item.observaciones || '',
        detalle,
        timestamp: item.Timestamp || ''
      };
    });
    return map;
  }, [ecoeDatos]);
 
  const datosPorEstacion = useMemo(() => {
    return listaEstacionesTotales.map((estacion) => {
      const resultados = Object.values(resultadosMap).filter((r) => r.estacion === estacion);
      const promedio =
        resultados.length > 0
          ? Math.round(resultados.reduce((acc, r) => acc + r.porcentaje, 0) / resultados.length)
          : 0;
      return { estacion, promedio, evaluados: resultados.length };
    });
  }, [listaEstacionesTotales, resultadosMap]);
 
const pfoMap = useMemo(() => {
  const map = {};
  pfoDatos.forEach((item) => {
    const dni = (item.DNI_Estudiante || item.dni || '').toString();
    if (!dni) return;
    if (!map[dni]) map[dni] = [];
    map[dni].push({
      rotacion: item.Rotacion || item.rotacion || 'Sin rotación',
      hospital: item.Hospital || item.hospital || '',
      calificacion: item.Calificacion || item.calificacion || '',
      desde: item.Desde || item.desde || '',
      hasta: item.Hasta || item.hasta || '',
      tutor: item.Tutor || item.tutor || '',
      observaciones: item.Observaciones || item.observaciones || ''
    });
  });
  return map;
}, [pfoDatos]);

  const estudiantesFiltrados = listaEstudiantes.filter((est) => {
    const matchS =
      !searchEcoe ||
      normalizarTexto(est.alumno).includes(normalizarTexto(searchEcoe)) ||
      est.dni.toString().includes(searchEcoe);
    const matchDia = filtroDiaEcoe === 'todos' || normalizarTexto(est.dia) === normalizarTexto(filtroDiaEcoe);
    return matchS && matchDia;
  });
 
  const columnasEstaciones = filtroEstacionEcoe === 'todas' ? listaEstacionesTotales : [filtroEstacionEcoe];
 
  const obtenerEstadoCelda = (resultado, asignada) => {
    if (!asignada) {
      return { color: 'bg-slate-50 text-slate-300 border border-slate-100', label: '—', notaLabel: '' };
    }
    if (!resultado) {
      return { color: 'bg-blue-100 text-blue-800 font-medium', label: 'No iniciado', notaLabel: '' };
    }
    const banda = obtenerBanda(resultado.porcentaje);
    return {
      color: `${banda.bg} ${banda.text} font-bold`,
      label: `${resultado.porcentaje}%`,
      notaLabel: `Nota: ${resultado.notaEscala}`
    };
  };
 
  const calcularResumenEstudiante = (est) => {
    const estacionesAsignadas = est.estaciones || [];
    let evaluadas = 0;
    let aprobadas = 0;
    let sumaPorcentajes = 0;
 
    estacionesAsignadas.forEach((estacion) => {
      const r = resultadosMap[`${est.dni}__${estacion}`];
      if (r) {
        evaluadas += 1;
        sumaPorcentajes += r.porcentaje;
        if (r.porcentaje >= UMBRAL_APROBACION_ESTACION) aprobadas += 1;
      }
    });
 
    const totalAsignadas = estacionesAsignadas.length;
    const promedio = evaluadas > 0 ? Math.round(sumaPorcentajes / evaluadas) : 0;
    const minAprobar = Math.ceil(totalAsignadas * PORCENTAJE_MIN_ESTACIONES_APROBADAS);
    const completo = evaluadas === totalAsignadas && totalAsignadas > 0;
 
    let resultadoFinal = 'Incompleto';
    if (completo) {
      resultadoFinal = aprobadas >= minAprobar && promedio >= PROMEDIO_MIN_EXAMEN ? 'Aprobado' : 'Desaprobado';
    }
 
    return { evaluadas, aprobadas, totalAsignadas, promedio, minAprobar, resultadoFinal };
  };
 
  const abrirEstudiante = (est, estacionInicial) => {
    const estacionesDetalle = {};
    est.estaciones.forEach((estacion) => {
      const config = estacionesConfigMap[estacion];
      const resultado = resultadosMap[`${est.dni}__${estacion}`];
      const itemsPuntaje = {};
 
      if (config) {
        config.categorias.forEach((cat) => {
          cat.items.forEach((item) => {
            itemsPuntaje[item.codigo] = normalizarNota(resultado?.detalle?.[item.codigo]);
          });
        });
      }
 
      estacionesDetalle[estacion] = {
        itemsPuntaje,
        observaciones: resultado?.observaciones || ''
      };
    });
 
    const estacionMeta = estacionInicial || est.estaciones[0] || null;
    const resultadoExistente = resultadosMap[`${est.dni}__${estacionMeta}`];
 
    setEvaluadorActual(resultadoExistente?.evaluador || '');
    setEstacionSeleccionada(estacionMeta);
    setEstudianteSeleccionado({ ...est, estacionesDetalle });
  };
 
  const puntajeEstacion = (estacion, itemsPuntaje) => {
    const config = estacionesConfigMap[estacion];
    if (!config) return { puntaje: 0, puntajeMax: 0, porcentaje: 0, notaEscala: 2 };
    let puntaje = 0;
    config.categorias.forEach((cat) => {
      cat.items.forEach((item) => {
        const nota = itemsPuntaje[item.codigo] ?? 0;
        puntaje += (nota / NOTA_MAXIMA_ITEM) * item.puntajeMax;
      });
    });
    const puntajeMax = config.puntajeMax || 100;
    puntaje = Math.round(puntaje * 10) / 10;
    const porcentaje = puntajeMax > 0 ? Math.round((puntaje / puntajeMax) * 100) : 0;
    const notaEscala = obtenerNotaEscala(porcentaje);
    return { puntaje, puntajeMax, porcentaje, notaEscala };
  };
 
  const puntajeCategoria = (cat, itemsPuntaje) => {
    const puntaje = cat.items.reduce(
      (acc, item) => acc + ((itemsPuntaje[item.codigo] ?? 0) / NOTA_MAXIMA_ITEM) * item.puntajeMax,
      0
    );
    return Math.round(puntaje * 10) / 10;
  };
 
  const setNotaItem = (estacion, codigoItem, nota) => {
    setEstudianteSeleccionado((prev) => {
      if (!prev) return prev;
      const detalleEstacion = prev.estacionesDetalle[estacion];
      const nuevosItems = { ...detalleEstacion.itemsPuntaje, [codigoItem]: nota };
      return {
        ...prev,
        estacionesDetalle: {
          ...prev.estacionesDetalle,
          [estacion]: { ...detalleEstacion, itemsPuntaje: nuevosItems }
        }
      };
    });
  };
 
  const setObservacionEstacion = (estacion, texto) => {
    setEstudianteSeleccionado((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        estacionesDetalle: {
          ...prev.estacionesDetalle,
          [estacion]: { ...prev.estacionesDetalle[estacion], observaciones: texto }
        }
      };
    });
  };
 
  const guardarFichaEstudiante = async () => {
    if (!estudianteSeleccionado || !estacionSeleccionada) return;
 
    if (!evaluadorActual.trim()) {
      alert('Ingresá el nombre del evaluador/a antes de guardar.');
      return;
    }
 
    setGuardando(true);
    const { dni, alumno, dia, estacionesDetalle } = estudianteSeleccionado;
    const estacion = estacionSeleccionada;
    const detalle = estacionesDetalle[estacion];
 
    if (!detalle) {
      alert('No se encontró el detalle para esta estación.');
      setGuardando(false);
      return;
    }
 
    const { puntaje, puntajeMax, porcentaje } = puntajeEstacion(estacion, detalle.itemsPuntaje);
    const estado = porcentaje >= UMBRAL_APROBACION_ESTACION ? 'Aprobado' : 'Desaprobado';
 
    const idEvaluacion = `${dni}_${estacion}`;
 
    const nuevoRegistro = {
      accion: 'guardar_ecoe',
      idEvaluacion: idEvaluacion,
      dni,
      nombre: alumno,
      estacion,
      dia,
      puntajeTotal: puntaje,
      puntajeMaxEstacion: puntajeMax,
      porcentajeLogro: porcentaje,
      estado,
      evaluador: evaluadorActual.trim(),
      detalleItems: JSON.stringify(detalle.itemsPuntaje),
      observaciones: detalle.observaciones || '',
      timestamp: new Date().toISOString()
    };
 
    setEcoeDatos((prev) => {
      const index = prev.findIndex(
        (p) => String(p.ID_Evaluacion || p.idEvaluacion) === String(idEvaluacion) ||
               (String(p.DNI_Estudiante || p.dni) === String(dni) && String(p.Estacion || p.estacion) === String(estacion))
      );
 
      const filaActualizada = {
        ID_Evaluacion: idEvaluacion,
        DNI_Estudiante: dni,
        Nombre_Estudiante: alumno,
        Estacion: estacion,
        Evaluador: evaluadorActual.trim(),
        Puntaje_Total: puntaje,
        Puntaje_Max_Estacion: puntajeMax,
        Porcentaje_Logro: porcentaje,
        Estado: estado,
        Detalle_Items: JSON.stringify(detalle.itemsPuntaje),
        Observaciones: detalle.observaciones || '',
        Timestamp: nuevoRegistro.timestamp
      };
 
      if (index >= 0) {
        const copia = [...prev];
        copia[index] = { ...copia[index], ...filaActualizada };
        return copia;
      }
      return [...prev, filaActualizada];
    });
 
    setColaPendientes((prev) => [...prev, nuevoRegistro]);
 
    if (navigator.onLine) {
      try {
        await fetch(API_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nuevoRegistro)
        });
      } catch (err) {
        console.log('Guardado localmente por fallo de red:', err);
      }
    }
 
    setGuardando(false);
    alert('¡Estación guardada con éxito!');
    setEstudianteSeleccionado(null);
  };
 
  const descargarPDFEstacionActual = () => {
  if (!estudianteSeleccionado || !estacionSeleccionada) {
    alert('Seleccioná una estación antes de descargar el PDF.');
    return;
  }

  const tituloOriginal = document.title;

  const nombreArchivo =
    `ECOE_${estacionSeleccionada.replace(/\s+/g, '_')}_${estudianteSeleccionado.alumno.replace(/\s+/g, '_')}`;

  const modalContenedor = document.querySelector('.contenedor-modal-ecoe');
  const modalContent = document.getElementById('modal-evaluacion-contenido');

  if (!modalContenedor || !modalContent) {
    alert('No se encontró el contenido de la evaluación para generar el PDF.');
    return;
  }

  document.title = nombreArchivo;

  modalContenedor.classList.add('modo-impresion');
  modalContent.classList.add('modo-impresion');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();

      setTimeout(() => {
        modalContenedor.classList.remove('modo-impresion');
        modalContent.classList.remove('modo-impresion');
        document.title = tituloOriginal;
      }, 500);
    });
  });
};
 
  return (
    <div className="ecoe-root ecoe-container-full space-y-6 py-6">
      <EncabezadoECOE
        vista={vista}
        setVista={setVista}
        totalEstudiantes={listaEstudiantes.length}
        totalEstaciones={listaEstacionesTotales.length}
      />
 
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 no-imprimir">
        <p className="text-xs text-slate-500">Gestión de evaluaciones clínicas estructuradas por estación.</p>
        <div className="flex items-center gap-3">
          {onlineStatus ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Online
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Sin Conexión (Modo Offline Activo)
            </span>
          )}
          {colaPendientes.length > 0 && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
              Pendientes de sincronizar: {colaPendientes.length}
            </span>
          )}
        </div>
      </div>
 
      {errorCarga && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-4 no-imprimir">
          {errorCarga}
        </div>
      )}
 
      {loadingEcoe ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200 no-imprimir">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-xs font-semibold text-slate-500">Cargando datos de ECOE...</p>
        </div>
      ) : vista === 'analisis' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 no-imprimir">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Panel de Análisis y Estadísticas ECOE</h3>
              <p className="text-xs text-slate-500">Métricas de rendimiento global o filtradas por estudiante.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={dniFiltroAnalisis || ''}
                onChange={(e) => setDniFiltroAnalisis(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">-- Todos los alumnos (Global) --</option>
                {listaEstudiantes && listaEstudiantes.map((est) => (
                  <option key={est.dni} value={est.dni}>
                    {est.alumno} (DNI: {est.dni})
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  const alumnoSeleccionado = listaEstudiantes?.find(e => e.dni === dniFiltroAnalisis);
                  const nombreReporte = alumnoSeleccionado ? alumnoSeleccionado.alumno : 'Global';
                  const tituloAnterior = document.title;
                  document.title = `Análisis - ${nombreReporte}`;

                  const contenedor = document.getElementById('contenedor-analisis-impresion');
                  contenedor.classList.add('modo-impresion');
                  
                  window.print();
                  
                  setTimeout(() => {
                    contenedor.classList.remove('modo-impresion');
                    document.title = tituloAnterior;
                  }, 500);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <span>📄 Descargar Análisis en PDF</span>
              </button>
            </div>
          </div>

          <div id="contenedor-analisis-impresion" className="space-y-4">
            {/* Cabecera visible dentro del documento impreso/PDF */}
            <div className="hidden print:block bg-slate-100 p-4 rounded-xl border border-slate-300 mb-4">
              <h1 className="text-sm font-bold text-slate-900">
                Reporte de Análisis ECOE — {dniFiltroAnalisis ? (listaEstudiantes?.find(e => e.dni === dniFiltroAnalisis)?.alumno || dniFiltroAnalisis) : 'Vista Global (Todos los alumnos)'}
              </h1>
              <p className="text-[10px] text-slate-500">Sistema PFO - Medicina | Fecha de emisión: {new Date().toLocaleDateString()}</p>
            </div>

            <VistaAnalisisResultados 
              datosPorEstacion={datosPorEstacion} 
              resultadosMap={resultadosMap}
              dniFiltro={dniFiltroAnalisis} 
              listaEstudiantes={listaEstudiantes}
            />
          </div>
        </div>
      ) : vista === 'portafolio' ? (
        <VistaPortafolio
          listaEstudiantes={listaEstudiantes}
          resultadosMap={resultadosMap}
          calcularResumenEstudiante={calcularResumenEstudiante}
          dniSeleccionado={dniPortafolio}
          setDniSeleccionado={setDniPortafolio}
          pfoMap={pfoMap}
        />
      ) : (
        <>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 text-xs no-imprimir">
            <span className="font-bold text-slate-600 uppercase tracking-wider">Leyenda:</span>
            {BANDAS.map((b, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded ${b.bg} inline-block`}></span>
                <span>
                  {b.nombre} {b.min > 0 ? `(≥${b.min}%)` : '(<60%)'}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200 inline-block"></span><span>Asignada, no iniciado</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-50 border border-slate-200 inline-block"></span><span>No le corresponde esta estación</span></div>
          </div>
 
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4 no-imprimir">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Buscar Estudiante</label>
                <input
                  type="text"
                  placeholder="Nombre o DNI..."
                  value={searchEcoe}
                  onChange={(e) => setSearchEcoe(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Filtrar por Día</label>
                <select
                  value={filtroDiaEcoe}
                  onChange={(e) => setFiltroDiaEcoe(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="todos">Todos los días (Jueves, Viernes, Sábado)</option>
                  <option value="jueves">Jueves</option>
                  <option value="viernes">Viernes</option>
                  <option value="sabado">Sábado</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Filtrar por Estación</label>
                <select
                  value={filtroEstacionEcoe}
                  onChange={(e) => setFiltroEstacionEcoe(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="todas">Todas las estaciones</option>
                  {listaEstacionesTotales.map((est) => (
                    <option key={est} value={est}>{est}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
 
          {estudiantesFiltrados.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200 no-imprimir">
              <p className="text-xs font-semibold text-slate-500">No se encontraron estudiantes con los filtros seleccionados.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden no-imprimir">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse ecoe-table-fixed">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="p-3 sticky left-0 bg-slate-50 z-10 ecoe-col-estudiante">Estudiante / Día</th>
                      {columnasEstaciones.map((est, i) => (
                        <th key={i} className="p-3 text-center min-w-[120px] truncate max-w-[140px]" title={est}>
                          {est}
                        </th>
                      ))}
                      <th className="p-3 text-center min-w-[90px]">Resultado</th>
                      <th className="p-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {estudiantesFiltrados.map((est, idx) => {
                      const resumen = calcularResumenEstudiante(est);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 sticky left-0 bg-white font-bold text-slate-800 z-10 shadow-sm ecoe-col-estudiante">
                            {est.alumno}
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-normal text-slate-400">DNI: {est.dni}</span>
                              <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold uppercase">{est.dia || 'S/D'}</span>
                            </div>
                          </td>
                          {columnasEstaciones.map((estacion, eIdx) => {
                            const asignada = est.estaciones.includes(estacion);
                            const resultado = resultadosMap[`${est.dni}__${estacion}`];
                            const estado = obtenerEstadoCelda(resultado, asignada);
                            return (
                              <td key={eIdx} className="p-2 text-center">
                                <div
                                  className={`rounded-lg py-1.5 px-2 text-[11px] shadow-sm flex flex-col items-center justify-center gap-0.5 ${asignada ? 'cursor-pointer hover:scale-105' : ''} transition-transform ${estado.color}`}
                                  title={asignada ? `${estacion}: ${estado.label} (${estado.notaLabel}) — click para evaluar` : `${estacion}: no asignada`}
                                  onClick={() => asignada && abrirEstudiante(est, estacion)}
                                >
                                  <span>{estado.label}</span>
                                  {estado.notaLabel && (
                                    <span className="text-[10px] opacity-95 font-semibold bg-black/10 px-1.5 rounded">
                                      {estado.notaLabel}
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className="p-2 text-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                                resumen.resultadoFinal === 'Aprobado'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : resumen.resultadoFinal === 'Desaprobado'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {resumen.evaluadas}/{resumen.totalAsignadas} · {resumen.resultadoFinal}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => abrirEstudiante(est)}
                              className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold px-3 py-1 rounded-lg text-xs transition-colors"
                            >
                              Evaluar estudiante
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
 
      {estudianteSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 contenedor-modal-ecoe">
          <div
             id="modal-evaluacion-contenido"
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-6"
            >
            <MembretePDF />
 
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Evaluación Clínica Individual - ECOE</span>
                <h3 className="text-lg font-black text-slate-900">{estudianteSeleccionado.alumno}</h3>
                <p className="text-xs text-slate-500">DNI: {estudianteSeleccionado.dni} · {estudianteSeleccionado.dia || 'Día sin definir'}</p>
              </div>
              <button
                onClick={() => setEstudianteSeleccionado(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold w-8 h-8 rounded-full flex items-center justify-center transition-colors no-imprimir"
              >
                ✕
              </button>
            </div>
 
            {(() => {
              const resumen = calcularResumenEstudiante(estudianteSeleccionado);
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Evaluadas</p>
                    <p className="text-lg font-black text-slate-800">{resumen.evaluadas}/{resumen.totalAsignadas}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Aprobadas</p>
                    <p className="text-lg font-black text-slate-800">{resumen.aprobadas} <span className="text-xs font-medium text-slate-400">(mín. {resumen.minAprobar})</span></p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Promedio</p>
                    <p className="text-lg font-black text-slate-800">{resumen.promedio}%</p>
                  </div>
                  <div className={`rounded-xl p-3 border ${resumen.resultadoFinal === 'Aprobado' ? 'bg-emerald-50 border-emerald-100' : resumen.resultadoFinal === 'Desaprobado' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Resultado ECOE</p>
                    <p className="text-lg font-black text-slate-800">{resumen.resultadoFinal}</p>
                  </div>
                </div>
              );
            })()}
 
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Evaluador/a (Docente a cargo)</label>
              <input
                type="text"
                placeholder="Nombre y apellido del docente evaluador"
                value={evaluadorActual}
                onChange={(e) => setEvaluadorActual(e.target.value)}
                className="w-full sm:w-96 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
 
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider no-imprimir">Estación a evaluar</h4>
              <div className="flex flex-wrap gap-2 no-imprimir">
                {estudianteSeleccionado.estaciones.map((estacion, idx) => {
                  const detalle = estudianteSeleccionado.estacionesDetalle[estacion];
                  const { porcentaje, notaEscala } = puntajeEstacion(estacion, detalle.itemsPuntaje);
                  const activa = estacionSeleccionada === estacion;
                  const aprobada = porcentaje >= UMBRAL_APROBACION_ESTACION;
                  return (
                    <button
                      key={idx}
                      onClick={() => setEstacionSeleccionada(estacion)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                        activa
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{estacion}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${
                          activa ? 'bg-white/20 text-white' : aprobada ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {porcentaje}% (Nota: {notaEscala})
                      </span>
                    </button>
                  );
                })}
              </div>
 
              {estacionSeleccionada && (() => {
                const estacion = estacionSeleccionada;
                const config = estacionesConfigMap[estacion];
                const detalle = estudianteSeleccionado.estacionesDetalle[estacion];
                const { puntaje, puntajeMax, porcentaje, notaEscala } = puntajeEstacion(estacion, detalle.itemsPuntaje);
                const aprobada = porcentaje >= UMBRAL_APROBACION_ESTACION;
 
                return (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                      <span className="text-xs font-bold text-slate-800">{estacion}</span>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${aprobada ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                        {puntaje}/{puntajeMax} pts · {porcentaje}% — <span className="underline">Nota: {notaEscala}</span>
                      </span>
                    </div>
 
                    <div className="p-4 space-y-4">
                      {!config ? (
                        <p className="text-xs text-slate-400 italic">
                          No hay lista de cotejo cargada para "{estacion}" en la hoja Estaciones_ConfigECOE.
                        </p>
                      ) : (
                        <>
                          {config.categorias.map((cat, catIdx) => {
                            const puntajeCat = puntajeCategoria(cat, detalle.itemsPuntaje);
                            return (
                              <div key={catIdx} className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">{cat.nombre}</span>
                                  <span className="text-[10px] font-semibold text-slate-400">{puntajeCat}/{cat.puntajeMaxCategoria} pts</span>
                                </div>
                                <div className="space-y-2">
                                  {cat.items.map((item, itemIdx) => {
                                    const nota = detalle.itemsPuntaje[item.codigo] ?? 0;
                                    const puntosItem = Math.round(((nota / NOTA_MAXIMA_ITEM) * item.puntajeMax) * 10) / 10;
                                    return (
                                      <div key={itemIdx} className="bg-slate-50 rounded-lg px-3 py-2 space-y-1.5">
                                        <div className="flex justify-between items-start gap-2">
                                          <span className="flex-1 text-xs text-slate-700">
                                            {item.codigo ? <span className="font-semibold text-slate-500 mr-1">{item.codigo}</span> : null}
                                            {item.descripcion}
                                          </span>
                                          <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{puntosItem}/{item.puntajeMax} pts</span>
                                        </div>
                                        <div className="flex gap-1 no-imprimir">
                                          {Array.from({ length: NOTA_MAXIMA_ITEM + 1 }, (_, n) => n).map((n) => (
                                            <button
                                              key={n}
                                              type="button"
                                              onClick={() => setNotaItem(estacion, item.codigo, n)}
                                              className={`flex-1 rounded-md py-1.5 text-[11px] font-bold border transition-colors ${
                                                nota === n
                                                  ? 'bg-blue-600 border-blue-600 text-white'
                                                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                                              }`}
                                            >
                                              {n}
                                            </button>
                                          ))}
                                        </div>
                                        <div className="hidden modo-impresion text-[11px] font-bold text-slate-700">
                                          Calificación otorgada: {nota} / {NOTA_MAXIMA_ITEM}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
 
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Observaciones de la estación</label>
                            <textarea
                              rows={3}
                              placeholder="Comentarios del docente sobre el desempeño en esta estación..."
                              value={detalle.observaciones}
                              onChange={(e) => setObservacionEstacion(estacion, e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none no-imprimir"
                            />
                            <div className="hidden modo-impresion text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                              {detalle.observaciones || 'Sin observaciones registradas.'}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
 
            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <button
                onClick={descargarPDFEstacionActual}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-1.5 no-imprimir shadow-sm"
              >
                📄 Descargar PDF Estación
              </button>
 
              <div className="flex gap-3 no-imprimir">
                <button
                  onClick={() => setEstudianteSeleccionado(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarFichaEstudiante}
                  disabled={guardando}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-colors shadow-sm"
                >
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}