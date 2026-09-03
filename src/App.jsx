import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Corregir icono por defecto de Leaflet en React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Componente auxiliar para forzar la actualización del tamaño de Leaflet cuando cambia de pestaña o se abre
function MapResizeHelper() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

const API_URL = "https://script.google.com/macros/s/AKfycby-qfURF_V4SjrHJIbr7_O-FVIm-QxUJf5nSwg3s5Lyx5as0o2jsEVQVfCSU751OprO-A/exec";
const TOTAL_SEMANAS_PFO = 40;

const COORDENADAS_LOCALIDADES = {
  "villa maria": [-32.4075, -63.2402],
  "las varillas": [-31.8719, -62.7194],
  "cordoba": [-31.4201, -64.1888],
  "cordoba capital": [-31.4201, -64.1888],
  "san francisco": [-31.4278, -62.0827],
  "bell ville": [-32.6259, -62.6887],
  "rio cuarto": [-33.1307, -64.3499],
  "marcos juarez": [-32.6974, -62.1065],
  "marco juarez": [-32.6974, -62.1065],
  "oliva": [-32.0416, -63.5698],
  "hernando": [-32.4264, -63.7333],
  "villa del rosario": [-31.5568, -63.5350],
  "oncativo": [-31.9142, -63.6811],
  "james craik": [-32.1611, -63.3283],
  "ticino": [-32.6933, -63.4358],
  "ucacha": [-33.0312, -63.5049],
  "pozo del molle": [-31.9972, -62.9194],
  "laborde": [-33.1539, -62.8564],
  "villa nueva": [-32.4332, -63.2476],
  "arroyito": [-31.4204, -63.0503],
  "la palestina": [-32.5186, -63.3235]
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

const obtenerCoordenadas = (nombreLocalidad) => {
  if (!nombreLocalidad) return [-32.4075, -63.2402];
  const clave = normalizarTexto(nombreLocalidad);
  return COORDENADAS_LOCALIDADES[clave] || [-32.4075, -63.2402];
};

const extraerLocalidadDeNombre = (nombreInst, localidadOriginal) => {
  const norm = normalizarTexto(nombreInst);
  for (const loc of Object.keys(COORDENADAS_LOCALIDADES)) {
    if (norm.includes(loc)) {
      return loc;
    }
  }
  return localidadOriginal;
};

const formatearFecha = (fecha) => {
  if (!fecha || isNaN(fecha)) return '';
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = fecha.getFullYear();
  return `${dia}/${mes}/${anio}`;
};

export default function App() {
  const [rotaciones, setRotaciones] = useState([]);
  const [convenios, setConvenios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingConvenios, setLoadingConvenios] = useState(false);
  
  const [search, setSearch] = useState('');
  const [searchConvenios, setSearchConvenios] = useState('');
  
  // Nuevos estados para los filtros de convenios
  const [filtroTipoDocConvenio, setFiltroTipoDocConvenio] = useState('todos');
  const [filtroEstadoConvenio, setFiltroEstadoConvenio] = useState('todos');
  const [filtroLocalidadConvenio, setFiltroLocalidadConvenio] = useState('todos');
  const [filtroDepartamentoConvenio, setFiltroDepartamentoConvenio] = useState('todos');

  const [seccionPrincipal, setSeccionPrincipal] = useState('estudiantes'); 
  const [vista, setVista] = useState('lista'); 
  const [modoMapa, setModoMapa] = useState('localidad'); 
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [convenioSeleccionado, setConvenioSeleccionado] = useState(null);
  const [coordenadasInst, setCoordenadasInst] = useState({});

  const [filtroCohorte, setFiltroCohorte] = useState('todas');
  const [filtroLocalidad, setFiltroLocalidad] = useState('todas');

  useEffect(() => {
    fetch(`${API_URL}?vista=estudiantes`)
      .then((res) => res.json())
      .then((data) => {
        setRotaciones(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error cargando estudiantes:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (seccionPrincipal === 'convenios' && convenios.length === 0) {
      setLoadingConvenios(true);
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
    }
  }, [seccionPrincipal, convenios.length]);

  const hoy = new Date();
  const msPorSemana = 1000 * 60 * 60 * 24 * 7;

  const estudiantesAgrupados = useMemo(() => {
    return Object.values(
      rotaciones.reduce((acc, item) => {
        const dni = item.DNI;
        if (!dni) return acc;

        const institucionItem = item.Institución || item.Institucion || '';
        const institucionLimpia = institucionItem.toString().trim();
        if (!institucionLimpia || institucionLimpia === '-' || institucionLimpia === '') {
          return acc;
        }

        if (!acc[dni]) {
          acc[dni] = {
            dni: dni,
            nombre: item.Nombre || item.Estudiante || 'Sin Nombre',
            localidad: item.Localidad || 'Sin Localidad',
            fechaInicioMin: item.Fecha_Inicio ? new Date(item.Fecha_Inicio) : null,
            rotaciones: []
          };
        }

        if (item.Fecha_Inicio) {
          const fechaRot = new Date(item.Fecha_Inicio);
          if (!acc[dni].fechaInicioMin || fechaRot < acc[dni].fechaInicioMin) {
            acc[dni].fechaInicioMin = fechaRot;
          }
        }

        if (item.Localidad && acc[dni].localidad === 'Sin Localidad') {
          acc[dni].localidad = item.Localidad;
        }

        acc[dni].rotaciones.push({
          modulo: item.Modulo_Rotacion || item.Modulo || 'Módulo',
          rangoSemana: item['Rango/Semana'] || '',
          institucion: institucionLimpia,
          localidad: item.Localidad || acc[dni].localidad,
          fechaInicio: item.Fecha_Inicio ? new Date(item.Fecha_Inicio) : null,
          fechaFin: item.Fecha_Fin ? new Date(item.Fecha_Fin) : null
        });

        return acc;
      }, {})
    ).map((est) => {
      let semanaActual = 0;
      let porcentajeAvance = 0;
      let inicioStr = 'No definida';
      let etapaActual = 'Sin etapa asignada';
      let institucionActual = '-';

      if (est.fechaInicioMin && !isNaN(est.fechaInicioMin)) {
        const semTranscurridas = Math.max(0, Math.floor((hoy - est.fechaInicioMin) / msPorSemana) + 1);
        semanaActual = Math.min(semTranscurridas, TOTAL_SEMANAS_PFO);
        porcentajeAvance = Math.min(100, Math.round((semanaActual / TOTAL_SEMANAS_PFO) * 100));
        inicioStr = est.fechaInicioMin.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
      }

      est.rotaciones.sort((a, b) => {
        const numA = parseInt(a.rangoSemana.match(/\d+/)?.[0] || 0);
        const numB = parseInt(b.rangoSemana.match(/\d+/)?.[0] || 0);
        return numA - numB;
      });

      const rotacionEnCurso = est.rotaciones.find(rot => {
        return rot.fechaInicio && rot.fechaFin && hoy >= rot.fechaInicio && hoy <= rot.fechaFin;
      });

      if (rotacionEnCurso) {
        etapaActual = rotacionEnCurso.modulo;
        institucionActual = rotacionEnCurso.institucion;
      } else {
        const rotacionCercana = est.rotaciones.find(rot => rot.fechaInicio && hoy < rot.fechaInicio);
        if (rotacionCercana) {
          etapaActual = `Próximamente: ${rotacionCercana.modulo}`;
          institucionActual = rotacionCercana.institucion;
        } else if (est.rotaciones.length > 0) {
          etapaActual = est.rotaciones[est.rotaciones.length - 1].modulo;
          institucionActual = est.rotaciones[est.rotaciones.length - 1].institucion;
        }
      }

      return {
        ...est,
        semanaActual,
        porcentajeAvance,
        inicioStr,
        etapaActual,
        institucionActual
      };
    }).filter(est => est.rotaciones.length > 0);
  }, [rotaciones, hoy]);

  // Listas desplegables dinámicas para los filtros de convenios
  const opcionesTipoDocConvenios = useMemo(() => {
    return Array.from(new Set(convenios.map(conv => conv['TIPO DE DOCUMENTO'] || conv.Tipo_Documento || conv.TipoDocumento).filter(Boolean)));
  }, [convenios]);

  const opcionesEstadoConvenios = useMemo(() => {
    return Array.from(new Set(convenios.map(conv => conv.Estado || conv.ESTADO).filter(Boolean)));
  }, [convenios]);

  const opcionesLocalidadConvenios = useMemo(() => {
    return Array.from(new Set(convenios.map(conv => conv.Localidad).filter(Boolean)));
  }, [convenios]);

  const opcionesDepartamentoConvenios = useMemo(() => {
    return Array.from(new Set(convenios.map(conv => conv.Departamento).filter(Boolean)));
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

      const coincideTipoDoc = filtroTipoDocConvenio === 'todos' || valTipoDoc === filtroTipoDocConvenio;
      const coincideEstado = filtroEstadoConvenio === 'todos' || valEstado === filtroEstadoConvenio;
      const coincideLocalidad = filtroLocalidadConvenio === 'todos' || valLocalidad === filtroLocalidad;
      const coincideDepartamento = filtroDepartamentoConvenio === 'todos' || valDepto === filtroDepartamentoConvenio;

      return coincideBusqueda && coincideTipoDoc && coincideEstado && coincideLocalidad && coincideDepartamento;
    });
  }, [convenios, searchConvenios, filtroTipoDocConvenio, filtroEstadoConvenio, filtroLocalidadConvenio, filtroDepartamentoConvenio]);

  const opcionesCohortes = useMemo(() => {
    return Array.from(
      new Set(
        estudiantesAgrupados
          .filter(est => {
            const coincideTexto = est.nombre.toLowerCase().includes(search.toLowerCase()) || 
                                 est.dni.toString().includes(search);
            const coincideLocalidad = filtroLocalidad === 'todas' || est.localidad === filtroLocalidad;
            return coincideTexto && coincideLocalidad;
          })
          .map(e => e.inicioStr)
      )
    ).filter(Boolean);
  }, [estudiantesAgrupados, search, filtroLocalidad]);

  const opcionesLocalidades = useMemo(() => {
    return Array.from(
      new Set(
        estudiantesAgrupados
          .filter(est => {
            const coincideTexto = est.nombre.toLowerCase().includes(search.toLowerCase()) || 
                                 est.dni.toString().includes(search);
            const coincideCohorte = filtroCohorte === 'todas' || est.inicioStr === filtroCohorte;
            return coincideTexto && coincideCohorte;
          })
          .map(e => e.localidad)
      )
    ).filter(Boolean);
  }, [estudiantesAgrupados, search, filtroCohorte]);

  const estudiantesFiltrados = useMemo(() => {
    return estudiantesAgrupados.filter(est => {
      const coincideTexto = 
        est.nombre.toLowerCase().includes(search.toLowerCase()) || 
        est.dni.toString().includes(search);

      const coincideCohorte = filtroCohorte === 'todas' || est.inicioStr === filtroCohorte;
      const coincideLocalidad = filtroLocalidad === 'todas' || est.localidad === filtroLocalidad;

      return coincideTexto && coincideCohorte && coincideLocalidad;
    });
  }, [estudiantesAgrupados, search, filtroCohorte, filtroLocalidad]);

  const totalAlumnos = estudiantesAgrupados.length;
  const alumnosFiltrados = estudiantesFiltrados.length;
  const totalCohorteSeleccionada = filtroCohorte !== 'todas'
    ? estudiantesAgrupados.filter(e => e.inicioStr === filtroCohorte).length
    : null;
  const totalLocalidadSeleccionada = filtroLocalidad !== 'todas'
    ? estudiantesAgrupados.filter(e => e.localidad === filtroLocalidad).length
    : null;

  const conteoLocalidades = estudiantesFiltrados.reduce((acc, est) => {
    const loc = est.localidad?.trim() || 'Desconocida';
    acc[loc] = (acc[loc] || 0) + 1;
    return acc;
  }, {});

  const conteoInstituciones = estudiantesFiltrados.reduce((acc, est) => {
    est.rotaciones.forEach(rot => {
      const inst = rot.institucion.trim();
      if (!inst || inst === '-') return;

      if (!acc[inst]) {
        acc[inst] = { cantidad: 0, localidad: rot.localidad };
      }
      acc[inst].cantidad += 1;
    });
    return acc;
  }, {});

  useEffect(() => {
    if (vista !== 'mapa' || modoMapa !== 'institucion') return;
    let isMounted = true;

    const buscarCoordenadas = async () => {
      for (const [inst, datos] of Object.entries(conteoInstituciones)) {
        if (coordenadasInst[inst]) continue;

        const localidadReal = extraerLocalidadDeNombre(inst, datos.localidad);
        const query = encodeURIComponent(`${inst}, ${localidadReal}, Córdoba, Argentina`);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;

        try {
          const res = await fetch(url, { headers: { 'User-Agent': 'ProyectoMedicinaApp/1.0' } });
          const data = await res.json();

          if (isMounted && data && data.length > 0) {
            setCoordenadasInst(prev => ({
              ...prev,
              [inst]: [parseFloat(data[0].lat), parseFloat(data[0].lon)]
            }));
          } else if (isMounted) {
            setCoordenadasInst(prev => ({
              ...prev,
              [inst]: obtenerCoordenadas(localidadReal)
            }));
          }
        } catch (error) {
          if (isMounted) {
            setCoordenadasInst(prev => ({
              ...prev,
              [inst]: obtenerCoordenadas(localidadReal)
            }));
          }
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    };

    buscarCoordenadas();
    return () => { isMounted = false; };
  }, [vista, modoMapa, conteoInstituciones]);

  const limpiarFiltros = () => {
    setSearch('');
    setFiltroCohorte('todas');
    setFiltroLocalidad('todas');
  };

  const limpiarFiltrosConvenios = () => {
    setSearchConvenios('');
    setFiltroTipoDocConvenio('todos');
    setFiltroEstadoConvenio('todos');
    setFiltroLocalidadConvenio('todos');
    setFiltroDepartamentoConvenio('todos');
  };

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
            <button
              onClick={() => setSeccionPrincipal('estudiantes')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                seccionPrincipal === 'estudiantes' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🎓 Estudiantes
            </button>
            <button
              onClick={() => setSeccionPrincipal('convenios')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                seccionPrincipal === 'convenios' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📄 Convenios
            </button>
          </div>
        </div>

        {seccionPrincipal === 'estudiantes' && (
          <>
            <div className="flex justify-between items-center bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Gestión de Alumnos y Rotaciones</span>
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setVista('lista')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    vista === 'lista' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📋 Lista
                </button>
                <button
                  onClick={() => setVista('mapa')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    vista === 'mapa' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🗺️ Mapa Córdoba
                </button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider">Filtros de Búsqueda</h3>
                {(filtroCohorte !== 'todas' || filtroLocalidad !== 'todas' || search !== '') && (
                  <button
                    onClick={limpiarFiltros}
                    className="text-xs font-semibold text-blue-800 hover:text-blue-950 hover:underline"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[11px] font-medium text-slate-500 uppercase">Total General</p>
                  <p className="text-xl font-bold text-slate-800">{totalAlumnos}</p>
                </div>
                
                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200">
                  <p className="text-[11px] font-medium text-blue-900 uppercase">Resultado Filtros</p>
                  <p className="text-xl font-bold text-blue-950">{alumnosFiltrados}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[11px] font-medium text-slate-500 uppercase truncate">
                    {filtroCohorte !== 'todas' ? `Cohorte: ${filtroCohorte}` : 'Cohortes Activas'}
                  </p>
                  <p className="text-xl font-bold text-slate-800">
                    {totalCohorteSeleccionada !== null ? totalCohorteSeleccionada : opcionesCohortes.length}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[11px] font-medium text-slate-500 uppercase truncate">
                    {filtroLocalidad !== 'todas' ? `Localidad: ${filtroLocalidad}` : 'Localidades Activas'}
                  </p>
                  <p className="text-xl font-bold text-slate-800">
                    {totalLocalidadSeleccionada !== null ? totalLocalidadSeleccionada : opcionesLocalidades.length}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Buscar Alumno</label>
                  <input
                    type="text"
                    placeholder="Nombre o DNI..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Cohorte (Inicio)</label>
                  <select
                    value={filtroCohorte}
                    onChange={(e) => setFiltroCohorte(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="todas">Todas las cohortes</option>
                    {opcionesCohortes.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Localidad</label>
                  <select
                    value={filtroLocalidad}
                    onChange={(e) => setFiltroLocalidad(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="todas">Todas las localidades</option>
                    {opcionesLocalidades.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {vista === 'mapa' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-blue-950">
                      {modoMapa === 'localidad' ? 'Distribución por Localidades' : 'Distribución por Instituciones de Salud'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {modoMapa === 'localidad' 
                        ? `${Object.keys(conteoLocalidades).length} ciudades registradas`
                        : `${Object.keys(conteoInstituciones).length} instituciones registradas`}
                    </p>
                  </div>

                  <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
                    <button
                      onClick={() => setModoMapa('localidad')}
                      className={`px-3 py-1.5 rounded-md transition-all ${
                        modoMapa === 'localidad' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Por Localidad
                    </button>
                    <button
                      onClick={() => setModoMapa('institucion')}
                      className={`px-3 py-1.5 rounded-md transition-all ${
                        modoMapa === 'institucion' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Por Institución
                    </button>
                  </div>
                </div>

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
                    
                    {modoMapa === 'localidad' && Object.entries(conteoLocalidades).map(([loc, cantidad]) => {
                      const coords = obtenerCoordenadas(loc);
                      return (
                        <Marker key={loc} position={coords}>
                          <Popup>
                            <div className="p-1 text-center font-sans">
                              <h4 className="font-bold text-blue-950 text-sm">{loc}</h4>
                              <p className="text-xs text-slate-600 mt-1">
                                <span className="font-bold text-blue-900">{cantidad}</span> estudiante(s) asignado(s)
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}

                    {modoMapa === 'institucion' && Object.entries(conteoInstituciones).map(([inst, datos]) => {
                      const locDeducida = extraerLocalidadDeNombre(inst, datos.localidad);
                      const coords = coordenadasInst[inst] || obtenerCoordenadas(locDeducida);
                      
                      return (
                        <Marker key={inst} position={coords}>
                          <Popup>
                            <div className="p-1 text-center font-sans max-w-[200px]">
                              <h4 className="font-bold text-blue-950 text-xs leading-tight">{inst}</h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">{datos.localidad}</p>
                              <p className="text-xs text-slate-600 mt-1">
                                <span className="font-bold text-blue-900">{datos.cantidad}</span> rotaciones / alumnos
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>
                </div>
              </div>
            )}

            {vista === 'lista' && (
              loading ? (
                <div className="bg-white p-12 text-center rounded-2xl text-slate-400 font-medium">
                  Cargando nómina de estudiantes...
                </div>
              ) : estudiantesFiltrados.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl text-slate-400 font-medium border border-slate-200">
                  No se encontraron estudiantes con los filtros seleccionados.
                </div>
              ) : (
                <div className="space-y-4">
                  {estudiantesFiltrados.map((est) => (
                    <div 
                      key={est.dni} 
                      onClick={() => setEstudianteSeleccionado(est)}
                      className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-900 hover:shadow-md cursor-pointer transition-all space-y-4 group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-900 transition-colors">
                            {est.nombre}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mt-0.5">
                            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-600">DNI: {est.dni}</span>
                            <span>•</span>
                            <span className="font-medium text-slate-600">Localidad: {est.localidad}</span>
                            <span>•</span>
                            <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              Inicio: {est.inicioStr}
                            </span>
                          </div>
                        </div>
                        <span className="self-start sm:self-center text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full">
                          {est.porcentajeAvance}% Completado
                        </span>
                      </div>

                      <div className="bg-gradient-to-r from-blue-900/5 to-blue-900/10 border-l-4 border-l-blue-900 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block mb-0.5">Módulo en curso</span>
                          <span className="text-sm font-extrabold text-blue-950">{est.etapaActual}</span>
                        </div>
                        <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-blue-900/10 pt-2 sm:pt-0 sm:pl-4">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Institución</span>
                          <span className="text-xs font-bold text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-200/80 shadow-sm inline-block">
                            🏥 {est.institucionActual}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-slate-500 font-medium">
                          <span>Semana 1</span>
                          <span>Semana {est.semanaActual} / 40 (Actual)</span>
                          <span>Semana 40</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
                          <div 
                            className="bg-blue-900 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${est.porcentajeAvance}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}

        {seccionPrincipal === 'convenios' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-blue-950">Convenios e Instituciones</h2>
                <p className="text-xs text-slate-500 mt-0.5">Listado de acuerdos, protocolos y documentos asociados por institución</p>
              </div>
              <div className="w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Buscar institución, municipio o tipo..."
                  value={searchConvenios}
                  onChange={(e) => setSearchConvenios(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>
            </div>

            {/* SECCIÓN DE FILTROS PARA CONVENIOS */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filtrar Convenios</span>
                {(filtroTipoDocConvenio !== 'todos' || filtroEstadoConvenio !== 'todos' || filtroLocalidadConvenio !== 'todos' || filtroDepartamentoConvenio !== 'todos' || searchConvenios !== '') && (
                  <button
                    onClick={limpiarFiltrosConvenios}
                    className="text-xs font-semibold text-blue-800 hover:text-blue-950 hover:underline"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Tipo de Documento */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Tipo de Documento</label>
                  <select
                    value={filtroTipoDocConvenio}
                    onChange={(e) => setFiltroTipoDocConvenio(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="todos">Todos los tipos</option>
                    {opcionesTipoDocConvenios.map((tipo, idx) => (
                      <option key={idx} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Estado</label>
                  <select
                    value={filtroEstadoConvenio}
                    onChange={(e) => setFiltroEstadoConvenio(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="todos">Todos los estados</option>
                    {opcionesEstadoConvenios.map((est, idx) => (
                      <option key={idx} value={est}>{est}</option>
                    ))}
                  </select>
                </div>

                {/* Localidad */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Localidad</label>
                  <select
                    value={filtroLocalidadConvenio}
                    onChange={(e) => setFiltroLocalidadConvenio(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="todos">Todas las localidades</option>
                    {opcionesLocalidadConvenios.map((loc, idx) => (
                      <option key={idx} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                {/* Departamento */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Departamento</label>
                  <select
                    value={filtroDepartamentoConvenio}
                    onChange={(e) => setFiltroDepartamentoConvenio(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="todos">Todos los departamentos</option>
                    {opcionesDepartamentoConvenios.map((dept, idx) => (
                      <option key={idx} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {loadingConvenios ? (
              <div className="p-12 text-center text-slate-400 font-medium">
                Cargando convenios desde Google Sheets...
              </div>
            ) : conveniosFiltrados.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-medium border border-slate-200 rounded-xl">
                No se encontraron convenios con los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-bold text-blue-950 uppercase">
                      <th className="p-3">ID</th>
                      <th className="p-3">Institución</th>
                      <th className="p-3">Localidad</th>
                      <th className="p-3">Departamento</th>
                      <th className="p-3">Tipo de Documento</th>
                      <th className="p-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {conveniosFiltrados.map((conv, idx) => (
                      <tr 
                        key={idx} 
                        onClick={() => setConvenioSeleccionado(conv)}
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                      >
                        <td className="p-3 font-mono font-semibold text-blue-950">{conv.ID_Institucion || conv.ID || '-'}</td>
                        <td className="p-3 font-semibold text-slate-800">{conv['INSTITUCIÓN/ES'] || conv.Institucion || conv.INSTITUCIÓN || '-'}</td>
                        <td className="p-3 text-slate-600">{conv.Localidad || '-'}</td>
                        <td className="p-3 text-slate-500">{conv.Departamento || '-'}</td>
                        <td className="p-3 text-slate-700 font-medium">{conv['TIPO DE DOCUMENTO'] || conv.Tipo_Documento || conv.TipoDocumento || '-'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            (conv.Estado || conv.ESTADO || '').toLowerCase().includes('vigente')
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {conv.Estado || conv.ESTADO || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {estudianteSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
            
            <div className="p-6 border-b border-slate-200 flex justify-between items-start bg-slate-50 border-t-4 border-t-blue-900">
              <div>
                <h2 className="text-xl font-bold text-blue-950">{estudianteSeleccionado.nombre}</h2>
                <p className="text-slate-500 text-sm mt-0.5">
                  DNI: {estudianteSeleccionado.dni} | Localidad: {estudianteSeleccionado.localidad}
                </p>
              </div>
              <button 
                onClick={() => setEstudianteSeleccionado(null)}
                className="text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-lg p-2 text-sm font-semibold transition-colors"
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-blue-50/70 border border-blue-200 p-4 rounded-xl gap-2">
                <div>
                  <span className="text-xs font-bold text-blue-900 uppercase">Trayecto PFO</span>
                  <p className="text-sm text-slate-700 font-medium mt-0.5">
                    Avance actual: Semana {estudianteSeleccionado.semanaActual} de 40 ({estudianteSeleccionado.porcentajeAvance}%)
                  </p>
                  <p className="text-xs text-blue-950 font-semibold mt-1">
                    Etapa: {estudianteSeleccionado.etapaActual} | Institución: {estudianteSeleccionado.institucionActual}
                  </p>
                </div>
                <span className="text-xs font-semibold bg-blue-900 text-white px-3 py-1 rounded-full">
                  Cohorte {estudianteSeleccionado.inicioStr}
                </span>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wider">Cronograma de Módulos</h4>
                
                <div className="space-y-3">
                  {estudianteSeleccionado.rotaciones.map((rot, idx) => {
                    const esPasado = rot.fechaFin && rot.fechaFin < hoy;
                    const esActual = rot.fechaInicio && rot.fechaFin && hoy >= rot.fechaInicio && hoy <= rot.fechaFin;

                    const fInicio = formatearFecha(rot.fechaInicio);
                    const fFin = formatearFecha(rot.fechaFin);
                    const textoFechas = (fInicio && fFin) ? ` (${fInicio} al ${fFin})` : '';

                    return (
                      <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-slate-800">{rot.modulo}</span>
                          <span className={`text-xs px-2 py-0.5 rounded font-semibold border ${
                            esActual 
                              ? 'bg-blue-100 text-blue-900 border-blue-300' 
                              : esPasado 
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                : 'bg-slate-200 text-slate-600 border-slate-300'
                          }`}>
                            {esActual ? 'En Curso' : esPasado ? 'Completado' : 'Pendiente'}
                          </span>
                        </div>

                        <div className="flex flex-wrap justify-between text-xs text-slate-500 font-mono">
                          <span className="font-medium text-slate-700">
                            {rot.rangoSemana}{textoFechas}
                          </span>
                          <span>{rot.institucion}</span>
                        </div>

                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              esActual ? 'bg-blue-950 animate-pulse' : esPasado ? 'bg-emerald-600' : 'bg-slate-300'
                            }`}
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    {convenioSeleccionado.Estado || convenioSeleuchtado?.ESTADO || convenioSeleccionado.ESTADO || '-'}
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
                    {
                      (() => {
                        const fecha = convenioSeleccionado.Fecha_Ini || convenioSeleccionado.FECHA_INI || convenioSeleccionado.Fecha_Inicio;
                        return fecha ? fecha.split('T')[0] : '-';
                      })()
                    }
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Fecha Fin</span>
                  <span className="font-mono text-slate-800">
                    {
                      (() => {
                        const fecha = convenioSeleccionado.Fecha_Fin || convenioSeleccionado.FECHA_FIN;
                        return fecha ? fecha.split('T')[0] : '-';
                      })()
                    }
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
    </div>
  );
}