import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import MapResizeHelper from './components/MapResizeHelper';
import {
  API_URL,
  normalizarTexto,
  extraerLocalidadDeNombre,
  resolverCoordenadasInstitucion,
  geocodificarInstituciones
} from './utils/geo';

// ============================================================
// COLORES Y CONFIGURACIÓN DE ESTADOS DE CONVENIOS
// ============================================================
const COLORES_ESTADO_CONVENIO = {
  "vencido": { bg: "#DC2626", text: "VENCIDO" },
  "vigente - requiere renovacion": { bg: "#EA580C", text: "VIGENTE - REQUIERE RENOVACIÓN" },
  "vigente - ratificacion": { bg: "#CA8A04", text: "VIGENTE - RATIFICACIÓN" },
  "ratificacion": { bg: "#EAB308", text: "RATIFICACIÓN" },
  "incompleto": { bg: "#2563EB", text: "INCOMPLETO" },
  "borrador": { bg: "#7C3AED", text: "BORRADOR" },
  "vigente - renovacion automatica": { bg: "#0D9488", text: "VIGENTE - RENOVACIÓN AUTOMÁTICA" },
  "vigente": { bg: "#16A34A", text: "VIGENTE" },
  "sin especificar": { bg: "#6B7280", text: "SIN ESPECIFICAR" },
  "vacio": { bg: "#9CA3AF", text: "VACÍO" }
};

const obtenerColorEstadoConvenio = (estadoStr) => {
  const norm = normalizarTexto(estadoStr || "vacio");
  if (!norm || norm === "-" || norm === "") return COLORES_ESTADO_CONVENIO["vacio"];

  for (const [clave, obj] of Object.entries(COLORES_ESTADO_CONVENIO)) {
    if (norm.includes(clave)) return obj;
  }
  return COLORES_ESTADO_CONVENIO["sin especificar"];
};

const crearIconoPersonalizadoConvenio = (estado) => {
  const config = obtenerColorEstadoConvenio(estado);
  return L.divIcon({
    className: 'custom-convenio-marker',
    html: `<div style="background-color: ${config.bg}; width: 18px; height: 18px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9]
  });
};

const CONFIG_ESTADISTICAS_CONVENIOS = [
  { tipo: 'Borrador', color: '#78909C', icono: '📋', match: ['borrador'] },
  { tipo: 'Protocolo', color: '#7E57C2', icono: '📑', match: ['protocolo de trabajo'] },
  { tipo: 'Nota de intención', color: '#29B6F6', icono: '✉️', match: ['nota intención', 'nota intencion'] },
  { tipo: 'Nota de adhesión', color: '#26A69A', icono: '🤝', match: ['nota adhesión', 'nota adhesion', 'enred'] },
  { tipo: 'Convenio Marco', color: '#43A047', icono: '📄', match: ['convenio marco'] },
  { tipo: 'Resolución CD', color: '#3949AB', icono: '🏛️', match: ['resolución del consejo directivo', 'resolucion del consejo directivo'] },
  { tipo: 'Resolución CS', color: '#00838F', icono: '🏛️', match: ['resolución del consejo superior', 'resolucion del consejo superior'] },
  { tipo: 'Convenio específico', color: '#FB8C00', icono: '🎓', match: ['convenio específico', 'convenio especifico'] },
  { tipo: 'Comisión de Estudios', color: '#D81B60', icono: '🎓', match: ['comisión de estudios', 'comision de estudios'] },
  { tipo: 'Acta Acuerdo', color: '#F9A825', icono: '📝', match: ['acta acuerdo'] },
  { tipo: 'Adenda', color: '#EC407A', icono: '➕', match: ['adenda'] },
  { tipo: 'Convenio-Programa', color: '#5C6BC0', icono: '📚', match: ['convenio-programa', 'convenio programa'] }
];

// ============================================================
// LEYENDA DEL MAPA DE CONVENIOS
// ============================================================
function LeyendaEstadosConvenios() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 h-fit">
      <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider mb-3">
        Leyenda
      </h4>

      <div className="space-y-2">
        {Object.entries(COLORES_ESTADO_CONVENIO).map(([clave, config]) => (
          <div key={clave} className="flex items-center gap-2.5">
            <span
              className="w-4 h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0"
              style={{ backgroundColor: config.bg }}
            />
            <span className="text-[11px] font-medium text-slate-600 leading-tight">
              {config.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Convenios() {
  const [convenios, setConvenios] = useState([]);
  const [loadingConvenios, setLoadingConvenios] = useState(true);

  const [searchConvenios, setSearchConvenios] = useState('');
  const [filtroTipoDocConvenio, setFiltroTipoDocConvenio] = useState('todos');
  const [filtroEstadoConvenio, setFiltroEstadoConvenio] = useState('todos');
  const [filtroLocalidadConvenio, setFiltroLocalidadConvenio] = useState('todos');
  const [filtroDepartamentoConvenio, setFiltroDepartamentoConvenio] = useState('todos');

  const [vistaConvenios, setVistaConvenios] = useState('tabla');
  const [convenioSeleccionado, setConvenioSeleccionado] = useState(null);
  const [coordenadasConveniosInst, setCoordenadasConveniosInst] = useState({});

  useEffect(() => {
    fetch(`${API_URL}?vista=convenios`)
      .then((res) => res.json())
      .then((data) => {
        setConvenios(data);
        setLoadingConvenios(false);
      })
      .catch((err) => {
        console.error("Error cargando convenios:", err);
        setLoadingConvenios(false);
      });
  }, []);

  const estadisticasTipoDoc = useMemo(() => {
    const conteo = {};
    CONFIG_ESTADISTICAS_CONVENIOS.forEach(item => {
      conteo[item.tipo] = 0;
    });

    convenios.forEach(conv => {
      const tipoDocTexto = normalizarTexto(conv['TIPO DE DOCUMENTO'] || conv.Tipo_Documento || conv.TipoDocumento || '');

      for (const configItem of CONFIG_ESTADISTICAS_CONVENIOS) {
        const coincide = configItem.match.some(m => tipoDocTexto.includes(normalizarTexto(m)));
        if (coincide) {
          conteo[configItem.tipo] = (conteo[configItem.tipo] || 0) + 1;
          break;
        }
      }
    });

    return conteo;
  }, [convenios]);

  const opcionesTipoDocConvenios = useMemo(() => {
    return Array.from(new Set(convenios.map(conv => {
      const val = conv['TIPO DE DOCUMENTO'] || conv.Tipo_Documento || conv.TipoDocumento;
      return val ? val.toString().trim() : null;
    }).filter(Boolean))).sort();
  }, [convenios]);

  const opcionesEstadoConvenios = useMemo(() => {
    return Array.from(new Set(convenios.map(conv => {
      const val = conv.Estado || conv.ESTADO;
      return val ? val.toString().trim() : null;
    }).filter(Boolean))).sort();
  }, [convenios]);

  const opcionesLocalidadConvenios = useMemo(() => {
    return Array.from(new Set(convenios.map(conv => {
      const val = conv.Localidad || conv.LOCALIDAD || conv.localidad;
      return val ? val.toString().trim() : null;
    }).filter(Boolean))).sort();
  }, [convenios]);

  const opcionesDepartamentoConvenios = useMemo(() => {
    return Array.from(new Set(convenios.map(conv => {
      const val = conv.Departamento;
      return val ? val.toString().trim() : null;
    }).filter(Boolean))).sort();
  }, [convenios]);

  const conveniosFiltrados = useMemo(() => {
    return convenios.filter(conv => {
      const texto = searchConvenios.toLowerCase();
      const nombreInst = (conv['INSTITUCIÓN/ES'] || conv.Institucion || conv.INSTITUCIÓN || conv.nombre || "").toLowerCase();
      const municipio = (conv['MUNICIPIO/ORGANO DE G'] || conv.Municipio || "").toLowerCase();
      const localidad = (conv.Localidad || "").toLowerCase();
      const tipoDoc = (conv['TIPO DE DOCUMENTO'] || conv.Tipo_Documento || conv.TipoDocumento || "").toLowerCase();

      const coincideBusqueda = nombreInst.includes(texto) || municipio.includes(texto) || localidad.includes(texto) || tipoDoc.includes(texto);

      const valTipoDoc = conv['TIPO DE DOCUMENTO'] || conv.Tipo_Documento || conv.TipoDocumento || '';
      const valEstado = conv.Estado || conv.ESTADO || '';
      const valLocalidad = conv.Localidad || '';
      const valDepto = conv.Departamento || '';

      const coincideTipoDoc = filtroTipoDocConvenio === 'todos' || normalizarTexto(valTipoDoc) === normalizarTexto(filtroTipoDocConvenio);
      const coincideEstado = filtroEstadoConvenio === 'todos' || normalizarTexto(valEstado) === normalizarTexto(filtroEstadoConvenio);
      const coincideLocalidad = filtroLocalidadConvenio === 'todos' || normalizarTexto(valLocalidad) === normalizarTexto(filtroLocalidadConvenio);
      const coincideDepartamento = filtroDepartamentoConvenio === 'todos' || normalizarTexto(valDepto) === normalizarTexto(filtroDepartamentoConvenio);

      return coincideBusqueda && coincideTipoDoc && coincideEstado && coincideLocalidad && coincideDepartamento;
    });
  }, [convenios, searchConvenios, filtroTipoDocConvenio, filtroEstadoConvenio, filtroLocalidadConvenio, filtroDepartamentoConvenio]);

  const conveniosGeoreferenciados = useMemo(() => {
    const listaConveniosMapa = [];
    conveniosFiltrados.forEach(conv => {
      const textoInst = conv['INSTITUCIÓN/ES'] || conv.Institucion || conv.INSTITUCIÓN || conv.nombre || "";
      const localidadOriginal = conv.Localidad || "Villa María";

      const institucionesSeparadas = textoInst.split(/\r?\n|;|\u2022/).map(i => i.trim()).filter(Boolean);

      if (institucionesSeparadas.length === 0) {
        listaConveniosMapa.push({
          ...conv,
          institucionUnica: textoInst || "Institución sin nombre",
          localidadAsignada: localidadOriginal
        });
      } else {
        institucionesSeparadas.forEach(instUnica => {
          listaConveniosMapa.push({
            ...conv,
            institucionUnica: instUnica,
            localidadAsignada: extraerLocalidadDeNombre(instUnica, localidadOriginal)
          });
        });
      }
    });
    return listaConveniosMapa;
  }, [conveniosFiltrados]);

  const conteoConveniosInst = useMemo(() => {
    const acc = {};
    conveniosGeoreferenciados.forEach(item => {
      const inst = item.institucionUnica;
      if (!acc[inst]) {
        acc[inst] = {
          cantidadConvenios: 0,
          localidad: item.localidadAsignada,
          conveniosAsociados: []
        };
      }
      acc[inst].cantidadConvenios += 1;
      acc[inst].conveniosAsociados.push(item);
    });
    return acc;
  }, [conveniosGeoreferenciados]);

  // Geocoding de instituciones (solo cuando se ve el mapa)
  useEffect(() => {
    if (vistaConvenios !== 'mapa') return;
    return geocodificarInstituciones(conteoConveniosInst, coordenadasConveniosInst, setCoordenadasConveniosInst);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vistaConvenios, conteoConveniosInst]);

  const limpiarFiltrosConvenios = () => {
    setSearchConvenios('');
    setFiltroTipoDocConvenio('todos');
    setFiltroEstadoConvenio('todos');
    setFiltroLocalidadConvenio('todos');
    setFiltroDepartamentoConvenio('todos');
  };

  return (
    <>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-blue-950">Convenios e Instituciones</h2>
            <p className="text-xs text-slate-500 mt-0.5">Listado de acuerdos, protocolos y documentos asociados por institución</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setVistaConvenios('tabla')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  vistaConvenios === 'tabla' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                📋 Tabla
              </button>
              <button
                onClick={() => setVistaConvenios('mapa')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  vistaConvenios === 'mapa' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                🗺️ Mapa Convenios
              </button>
            </div>
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Buscar institución, municipio o tipo..."
                value={searchConvenios}
                onChange={(e) => setSearchConvenios(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
          </div>
        </div>

        {/* Tarjetas de estadísticas dinámicas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
          {CONFIG_ESTADISTICAS_CONVENIOS.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-50/60 border border-slate-200/80 border-l-4 p-3.5 rounded-xl shadow-sm flex items-center justify-between transition-all hover:bg-white"
              style={{ borderLeftColor: item.color }}
            >
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">{item.tipo}</p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">
                  {loadingConvenios ? '...' : (estadisticasTipoDoc[item.tipo] || 0)}
                </p>
              </div>
              <span className="text-xl">{item.icono}</span>
            </div>
          ))}
        </div>

        {/* FILTROS DE CONVENIOS */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-blue-900 uppercase">Filtros Avanzados de Convenios</span>
            {(filtroTipoDocConvenio !== 'todos' || filtroEstadoConvenio !== 'todos' || filtroLocalidadConvenio !== 'todos' || filtroDepartamentoConvenio !== 'todos' || searchConvenios !== '') && (
              <button
                onClick={limpiarFiltrosConvenios}
                className="text-xs font-semibold text-blue-800 hover:underline"
              >
                Limpiar filtros de convenios
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Tipo de Documento</label>
              <select
                value={filtroTipoDocConvenio}
                onChange={(e) => setFiltroTipoDocConvenio(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
              >
                <option value="todos">Todos los tipos</option>
                {opcionesTipoDocConvenios.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Estado</label>
              <select
                value={filtroEstadoConvenio}
                onChange={(e) => setFiltroEstadoConvenio(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
              >
                <option value="todos">Todos los estados</option>
                {opcionesEstadoConvenios.map((est) => (
                  <option key={est} value={est}>{est}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Localidad</label>
              <select
                value={filtroLocalidadConvenio}
                onChange={(e) => setFiltroLocalidadConvenio(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
              >
                <option value="todos">Todas las localidades</option>
                {opcionesLocalidadConvenios.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Departamento</label>
              <select
                value={filtroDepartamentoConvenio}
                onChange={(e) => setFiltroDepartamentoConvenio(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
              >
                <option value="todos">Todos los departamentos</option>
                {opcionesDepartamentoConvenios.map((dep) => (
                  <option key={dep} value={dep}>{dep}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* VISTA DE TABLA O MAPA PARA CONVENIOS */}
        {loadingConvenios ? (
          <div className="p-12 text-center text-slate-400 font-medium">
            Cargando convenios desde Google Sheets...
          </div>
        ) : vistaConvenios === 'tabla' ? (
          conveniosFiltrados.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium border border-dashed border-slate-200 rounded-xl">
              No se encontraron convenios con los filtros actuales.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3">Institución</th>
                    <th className="p-3">Tipo de Documento</th>
                    <th className="p-3">Localidad</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {conveniosFiltrados.map((conv, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-semibold text-slate-800">
                        {conv['INSTITUCIÓN/ES'] || conv.Institucion || conv.INSTITUCIÓN || 'Sin nombre'}
                      </td>
                      <td className="p-3 text-slate-600">
                        {conv['TIPO DE DOCUMENTO'] || conv.Tipo_Documento || conv.TipoDocumento || '-'}
                      </td>
                      <td className="p-3 text-slate-600">
                        {conv.Localidad || '-'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          (conv.Estado || conv.ESTADO || '').toLowerCase().includes('vigente')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {conv.Estado || conv.ESTADO || '-'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setConvenioSeleccionado(conv)}
                          className="px-2.5 py-1 bg-blue-50 text-blue-900 font-bold rounded hover:bg-blue-900 hover:text-white transition-colors"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4 items-start">
            <div className="relative h-[500px] w-full rounded-xl overflow-hidden border border-slate-200 z-0">
              <MapContainer
                center={[-32.1, -63.5]}
                zoom={8}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                <MapResizeHelper />

                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {Object.entries(conteoConveniosInst).map(([inst, datos]) => {
                  const coords = resolverCoordenadasInstitucion(
                    inst,
                    datos.localidad,
                    coordenadasConveniosInst
                  );

                  const estadoPrincipal =
                    datos.conveniosAsociados?.[0]?.Estado ||
                    datos.conveniosAsociados?.[0]?.ESTADO ||
                    '';

                  const iconoPersonalizado = crearIconoPersonalizadoConvenio(estadoPrincipal);

                  return (
                    <Marker key={inst} position={coords} icon={iconoPersonalizado}>
                      <Popup>
                        <div className="p-1 text-center font-sans max-w-[240px]">
                          <h4 className="font-bold text-blue-950 text-xs leading-tight">
                            {inst}
                          </h4>

                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {datos.localidad}
                          </p>

                          <p className="text-xs text-slate-600 mt-1">
                            <span className="font-bold text-blue-900">
                              {datos.cantidadConvenios}
                            </span>{" "}
                            convenio(s) asociado(s)
                          </p>

                          <div className="mt-2 text-left max-h-36 overflow-y-auto space-y-1.5 border-t border-slate-100 pt-1.5">
                            {datos.conveniosAsociados.map((c, i) => (
                              <div
                                key={i}
                                className="text-[10px] bg-slate-50 p-1.5 rounded border border-slate-200 flex flex-col gap-1"
                              >
                                <div className="flex justify-between items-start gap-1">
                                  <span className="font-bold text-blue-900 leading-tight">
                                    {c['TIPO DE DOCUMENTO'] || c.Tipo_Documento || 'Convenio'}
                                  </span>
                                  <span className="text-[9px] px-1 rounded bg-slate-200 text-slate-700 font-semibold">
                                    {c.Estado || c.ESTADO || 'Sin estado'}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                                  <button
                                    onClick={() => setConvenioSeleccionado(c)}
                                    className="text-[10px] text-blue-800 hover:underline font-semibold"
                                  >
                                    Ver detalle 📄
                                  </button>

                                  {(c.LINK || c.Link || c.url) && (
                                    <a
                                      href={c.LINK || c.Link || c.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-blue-900 hover:bg-blue-950 text-white px-2 py-0.5 rounded font-bold text-[9px] shadow-sm"
                                    >
                                      Ver 🔍
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
            <LeyendaEstadosConvenios />
          </div>
        )}
      </div>

      {/* MODAL DETALLE DE CONVENIO */}
      {convenioSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">

            <div className="p-6 border-b border-slate-200 flex justify-between items-start bg-slate-50 border-t-4 border-t-blue-900">
              <div>
                <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">Detalle del Convenio</span>
                <h2 className="text-lg font-bold text-blue-950 mt-0.5">
                  {convenioSeleccionado['INSTITUCIÓN/ES'] || convenioSeleccionado.Institucion || convenioSeleccionado.INSTITUCIÓN || 'Institución'}
                </h2>
              </div>
              <button
                onClick={() => setConvenioSeleccionado(null)}
                className="text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-lg p-2 text-sm font-semibold transition-colors"
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-blue-900 uppercase text-[10px]">Objeto</span>
                <p className="text-slate-800 leading-relaxed text-xs">
                  {convenioSeleccionado.Objeto || convenioSeleccionado.OBJETO || 'No especificado'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Estado</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold inline-block ${
                    (convenioSeleccionado.Estado || convenioSeleccionado.ESTADO || '').toLowerCase().includes('vigente')
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {convenioSeleccionado.Estado || convenioSeleccionado.ESTADO || '-'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Resolución</span>
                  <span className="font-semibold text-slate-800">
                    {convenioSeleccionado.Resolucion || convenioSeleccionado.Resolución || '-'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Fecha de Inicio</span>
                  <span className="font-mono text-slate-800">
                    {(() => {
                      const fecha = convenioSeleccionado.Fecha_Ini || convenioSeleccionado.FECHA_INI || convenioSeleccionado.Fecha_Inicio;
                      return fecha ? String(fecha).split('T')[0] : '-';
                    })()}
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Fecha Fin</span>
                  <span className="font-mono text-slate-800">
                    {(() => {
                      const fecha = convenioSeleccionado.Fecha_Fin || convenioSeleccionado.FECHA_FIN;
                      return fecha ? String(fecha).split('T')[0] : '-';
                    })()}
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 sm:col-span-2">
                  <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Requiere Renovación</span>
                  <span className="font-semibold text-slate-800">
                    {convenioSeleccionado.Requiere_Renovacion || convenioSeleccionado.REQUIERE_RENOVACION || '-'}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-blue-900 uppercase text-[10px] block mb-0.5">Documento asociado</span>
                  <p className="text-slate-600 font-medium">
                    {convenioSeleccionado.NOMBRE_ARCHIVO || convenioSeleccionado.Nombre_Archivo || 'Ver archivo o imagen del documento'}
                  </p>
                </div>
                {(convenioSeleccionado.LINK || convenioSeleccionado.Link || convenioSeleccionado.url) && (
                  <a
                    href={convenioSeleccionado.LINK || convenioSeleccionado.Link || convenioSeleccionado.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition-colors shadow-sm whitespace-nowrap"
                  >
                    🔍 Ver Documento / Imagen
                  </a>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}