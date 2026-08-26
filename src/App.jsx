import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Corregir icono por defecto de Leaflet en React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vista, setVista] = useState('lista'); // 'lista' o 'mapa'
  const [modoMapa, setModoMapa] = useState('localidad'); // 'localidad' o 'institucion'
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [coordenadasInst, setCoordenadasInst] = useState({});

  // Estados para Filtros
  const [filtroCohorte, setFiltroCohorte] = useState('todas');
  const [filtroLocalidad, setFiltroLocalidad] = useState('todas');

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => {
        setRotaciones(data);
        setLoading(false);
      })
      .catch((err) => console.error("Error cargando datos:", err));
  }, []);

  const hoy = new Date();
  const msPorSemana = 1000 * 60 * 60 * 24 * 7;

  // Agrupar registros por estudiante
  const estudiantesAgrupados = useMemo(() => {
    return Object.values(
      rotaciones.reduce((acc, item) => {
        const dni = item.DNI;
        if (!dni) return acc;

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
          institucion: item.Institución || item.Institucion || '-',
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
      let institucionActual = '-'; // <--- Variable para la institución

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

      // Detectar dinámicamente la etapa/módulo y la institución actual basado en la fecha de hoy
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
        institucionActual // <--- Se retorna junto con el estudiante
      };
    });
  }, [rotaciones, hoy]);

  // Opciones dinámicas de Cohortes y Localidades
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

  useEffect(() => {
    if (filtroCohorte !== 'todas' && !opcionesCohortes.includes(filtroCohorte)) {
      setFiltroCohorte('todas');
    }
    if (filtroLocalidad !== 'todas' && !opcionesLocalidades.includes(filtroLocalidad)) {
      setFiltroLocalidad('todas');
    }
  }, [opcionesCohortes, opcionesLocalidades, filtroCohorte, filtroLocalidad]);

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

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Cabecera Principal con Logo Centrado */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 border-t-4 border-t-blue-900">
          
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-bold text-blue-950">Seguimiento de Estudiantes PFO</h1>
            <p className="text-slate-500 text-sm mt-0.5">Gestión de nómina y distribución geográfica</p>
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
              onClick={() => setVista('lista')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                vista === 'lista' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 Lista
            </button>
            <button
              onClick={() => setVista('mapa')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                vista === 'mapa' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🗺️ Mapa Córdoba
            </button>
          </div>

        </div>

        {/* Panel de Filtros y Totales */}
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

        {/* Vista Mapa */}
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

            <div className="h-[500px] w-full rounded-xl overflow-hidden border border-slate-200 z-0">
              <MapContainer 
                center={[-32.1, -63.5]} 
                zoom={8} 
                scrollWheelZoom={true} 
                className="h-full w-full"
              >
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {modoMapa === 'localidad' ? (
                Object.entries(conteoLocalidades).map(([loc, cantidad]) => (
                  <div key={loc} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-700 truncate">{loc}</span>
                    <span className="text-xs font-bold bg-blue-900 text-white px-2 py-0.5 rounded-full">
                      {cantidad}
                    </span>
                  </div>
                ))
              ) : (
                Object.entries(conteoInstituciones).map(([inst, datos]) => (
                  <div key={inst} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-center gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{inst}</p>
                      <p className="text-[10px] text-slate-400 truncate">{datos.localidad}</p>
                    </div>
                    <span className="text-xs font-bold bg-blue-900 text-white px-2 py-0.5 rounded-full shrink-0">
                      {datos.cantidad}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Vista Lista */}
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

                  {/* Etapa Actual e Institución Dinámica en la Tarjeta */}
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

      </div>

      {/* Modal Diagrama Gantt */}
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

    </div>
  );
}