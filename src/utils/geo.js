// ============================================================
// Utilidades compartidas entre Estudiantes.jsx y Convenios.jsx
// ============================================================

export const API_URL =
  "https://script.google.com/macros/s/AKfycby-qfURF_V4SjrHJIbr7_O-FVIm-QxUJf5nSwg3s5Lyx5as0o2jsEVQVfCSU751OprO-A/exec";

export const COORDENADAS_LOCALIDADES = {
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
  "la palestina": [-32.5186, -63.3235],
  "las higueras": [-33.0905, -64.3541],
  "arroyo algodon": [-32.2333, -63.1500],
  "etruria": [-32.7833, -63.5500],
  "la laguna": [-32.5667, -63.3167],
  "silvio pellico": [-32.2833, -63.0500],
  "tio pujio": [-32.2667, -63.3667],
  "noetinger": [-32.4167, -62.3333],
  "monte maiz": [-33.2167, -62.6000],
  "portena": [-31.0333, -61.9333],
  "la francia": [-31.4333, -62.6333],
  "morrison": [-32.6167, -62.8167],
  "carrilobo": [-31.9333, -63.0167],
  "alto alegre": [-32.4167, -63.0333]
};

export const normalizarTexto = (texto) => {
  if (!texto) return "";
  return texto
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

// ============================================================
// CATÁLOGO DE INSTITUCIONES CON COORDENADAS EXACTAS
// ============================================================
const INSTITUCIONES_RAW = [
  ["AMBAR S.R.L.", -32.4076, -63.2304],
  ['Administración Nacional de Laboratorios e Institutos de Salud "Dr. Carlos G. Malbrán" (ANLIS)', -34.6127, -58.4173],
  ["Área de Salud Municipal Juan Pablo II", -32.4076, -63.2304],
  ["Asistencia Pública", -32.4076, -63.2304],
  ["Asociación Argentina de Salud Mental (AASM)", -34.6037, -58.3816],
  ["Axion S.A.", -34.6037, -58.3816],
  ['CAP "Eugenio Raviolo"', -32.4076, -63.2304],
  ["Centro de Ciencias de la Salud Bernardo A. Houssay (UNVM)", -32.4089, -63.2273],
  ["Centro de Salud de Carrilobo", -32.4667, -62.9833],
  ["Centro de Salud Municipal de Alto Alegre", -32.4833, -63.1667],
  ["Centro De Salud Municipalidad De Morrison", -32.5833, -62.9333],
  ['Centro Integral de Otorrinolaringología "Capilatis"', -32.4076, -63.2304],
  ["Centro Médico de San Francisco", -31.4241, -62.0836],
  ['Centro Privado de Microcirugía Ocular "Dr. Martínez Rojas"', -32.4076, -63.2304],
  ["Centro Privado de Oftalmología S.R.L.", -32.4076, -63.2304],
  ["Centros de Atención Primaria de la Salud (CAPS)", -32.4076, -63.2304],
  ['Centros de Salud / Hospital / Dispensario / CAP "Nodo de Cuidados en Red"', -32.4076, -63.2304],
  ["Centros de Salud Municipales de Villa del Rosario", -31.5833, -63.5333],
  ["Círculo Médico Villa María", -32.4076, -63.2304],
  ["Cleanergy Renovables S.A.", -32.8123, -63.8741],
  ['Clínica de la Familia III "Pedro Sciretta"', -32.4076, -63.2304],
  ['Clínica de Ojos Privada "Nueva Visión" Río Cuarto S.R.L.', -33.1232, -64.3492],
  ["Clínica Dr. Gregorio Marañón S.A.", -32.4076, -63.2304],
  ["Clínica Fusavim Privada S.R.L.", -32.4076, -63.2304],
  ["Clínica Mediterránea Salud S.A.", -32.4076, -63.2304],
  ["Clínica Privada de Especialidades Villa María S.R.L.", -32.4076, -63.2304],
  ['Colegio de Psicologos delegacion "A" Regional Villa María', -32.4076, -63.2304],
  ["Colegio de Psicopedagogos Regional III Villa María", -32.4076, -63.2304],
  ["Comisión Intersectorial en Políticas Integradas en Salud (CIPIS)", -32.4076, -63.2304],
  ["Consultorio pediátrico ALUNA - Dra. Eliana Godoy", -32.4076, -63.2304],
  ["Consultorios Privados Lisandro De La Torre S.r.l.", -32.4076, -63.2304],
  ["Corpus S.R.L.", -32.4042, -63.2514],
  ["Daniel J. Aimaretti S.A.", -31.8667, -62.7167],
  ["Dispensario Dr. Hilcio Weihmuller", -32.6565, -63.2458],
  ["Dispensario Municipal de Arroyo Algodón", -32.4667, -62.6167],
  ["Dispensario Municipal de Etruria", -32.2667, -62.5],
  ["Dispensario Municipal de La Laguna", -32.65, -63.05],
  ["Dispensario Municipal de La Palestina", -32.5833, -62.9833],
  ["Dispensario Municipal de Silvio Péllico", -32.65, -63],
  ["Dispensario Municipal de Tío Pujio", -32.5833, -63.4667],
  ["Dr. Carlos Alberto Roncaglia", -32.4076, -63.2304],
  ["Ente Regional de Desarrollo ENRED", -32.4076, -63.2304],
  ["Facultad de Ciencias Médicas de la Universidad Nacional de Córdoba (UNC)", -31.4396, -64.1888],
  ["Federación Argentina de Cardiología", -34.6025, -58.4208],
  ["Fundación Roetgen y Grupo Formador Universitario Roetgen", -31.4201, -64.1888],
  ["Gobierno de la Provincia de Córdoba", -31.4173, -64.1833],
  ["Grupo Formador Roentgen - Fundación Roentgen", -31.4201, -64.1888],
  ["Hospital Dr. Abel Ayerza de Marcos Juárez", -32.6997, -62.104],
  ["Hospital Dr. Emilio Vidal Abal", -32.4076, -63.2304],
  ["Hospital Dr. José A. Ceballos de Bell Ville", -32.6259, -62.689],
  ['Hospital Municipal "Dr. Alfredo García"', -32.4928, -63.4001],
  ['Hospital Municipal "Dr. Amancio Rodríguez Álvarez"', -31.4036, -62.6405],
  ['Hospital Municipal "José M. Minella"', -32.4126, -63.2378],
  ['Hospital Municipal "Dr. Roberto I. García Montaño"', -32.1009, -63.0315],
  ["Hospital Municipal de La Laguna", -32.65, -63.05],
  ["Hospital Municipal de Laborde", -32.7167, -62.6667],
  ["Hospital Municipal De Urgencias De Córdoba", -31.4167, -64.1833],
  ["Hospital Municipal Doctor Raúl Dobric", -32.1165, -62.9192],
  ["Hospital Municipal Dr. Diego Montoya", -31.8672, -62.723],
  ["Hospital Municipal Ucacha", -33.0333, -63.5],
  ["Hospital Privado Universitario de Córdoba", -31.4055, -64.1892],
  ["Hospital Provincial Profesor José Miguel Uturria", -31.2295, -64.3168],
  ['Hospital Regional "Dr. Louis Pasteur"', -32.4076, -63.2304],
  ["Hospital San Vicente de Paul de Villa del Rosario", -31.5833, -63.5333],
  ["Hospital/Dispensario/CAP de Noetinger", -32.4833, -62.4],
  ["Instituto de Neurología, Neurocirugía y Columna Vertebral, Oftalmología (INNC)", -31.4201, -64.1888],
  ["Instituto Modelo De Cardiología Privado S.R.L.", -31.4114, -64.181],
  ["Instituto Privado de Radiología Gómez Benítez", -32.4076, -63.2304],
  ["Jockey Club Córdoba", -31.3667, -64.2333],
  ["Juan Pablo II", -32.4076, -63.2304],
  ["Mater Dei del Infanto Juvenil S.R.L.", -32.4076, -63.2304],
  ["Ministerio de Salud de la Nación", -34.6083, -58.3819],
  ["Ministerio de Salud de la Provincia de Córdoba", -31.4173, -64.1833],
  ["Municipalidad de Córdoba", -31.4201, -64.1888],
  ["Municipalidad de La Francia", -31.9333, -62.7833],
  ["Municipalidad de Marco Juárez", -32.6997, -62.104],
  ["Municipalidad de Monte Maíz", -32.9333, -62.6167],
  ["Municipalidad de Oncativo", -31.9, -63.6889],
  ["Municipalidad de Porteña", -31.6864, -62.0742],
  ["Municipalidad de Río Cuarto", -33.1232, -64.3492],
  ["Municipalidad de San Francisco", -31.4241, -62.0836],
  ["Municipalidad de Ticino", -32.9667, -62.5],
  ["Municipalidad de Villa María", -32.4076, -63.2304],
  ["Municipalidad de Villa Nueva", -32.4126, -63.2378],
  ['Nuevo Hospital Río Cuarto "San Antonio de Padua"', -33.1232, -64.3492],
  ["Passamonte Comercial S.A.", -31.4172, -62.0989],
  ["Poder Judicial de la Provincia de Córdoba", -31.4173, -64.1833],
  ['Residencia de Adultos Mayores "Santa Sofía"', -32.4076, -63.2304],
  ["Sanatorio Allende S.A.", -31.4187, -64.1875],
  ["Sanatorio Cruz Azul S.R.L.", -32.4076, -63.2304],
  ["Sanatorio de La Cañada - AOS S.R.L.", -31.4167, -64.19],
  ["Sanatorio Prof. León S. Morra", -32.4076, -63.2304],
  ["Secretaría de Educación de la Municipalidad de Villa María", -32.4076, -63.2304],
  ["Secretaría de Políticas Universitarias del Ministerio de Educación de la Nación", -34.6083, -58.3819],
  ["Secretaría de Salud de la Municipalidad de Villa María", -32.4076, -63.2304],
  ["Sociedad de Beneficencia Hospital Italiano", -31.4278, -64.1972],
  ["Subsecretaría de Salud de la Municipalidad de Las Higueras", -33.1667, -64.3667],
  ["Subsecretaría de Salud de la Municipalidad de Río Cuarto", -33.1232, -64.3492],
  ["Universidade Vale do Rio Verde (Brasil)", -21.6997, -45.2564],
  ["UNVM", -32.4089, -63.2273],
];

const CATALOGO_INSTITUCIONES = INSTITUCIONES_RAW.reduce((acc, [nombre, lat, lon]) => {
  acc[normalizarTexto(nombre)] = [lat, lon];
  return acc;
}, {});

export const buscarEnCatalogoInstituciones = (nombreInst) => {
  if (!nombreInst) return null;
  const norm = normalizarTexto(nombreInst);
  if (!norm) return null;

  if (CATALOGO_INSTITUCIONES[norm]) {
    return CATALOGO_INSTITUCIONES[norm];
  }

  let mejorClave = null;
  let mejorLongitud = 0;
  for (const clave of Object.keys(CATALOGO_INSTITUCIONES)) {
    if (clave.length < 4) continue;
    if ((norm.includes(clave) || clave.includes(norm)) && clave.length > mejorLongitud) {
      mejorClave = clave;
      mejorLongitud = clave.length;
    }
  }
  return mejorClave ? CATALOGO_INSTITUCIONES[mejorClave] : null;
};

export const obtenerCoordenadas = (nombreLocalidad) => {
  if (!nombreLocalidad) return [-32.4075, -63.2402];
  const clave = normalizarTexto(nombreLocalidad);
  return COORDENADAS_LOCALIDADES[clave] || [-32.4075, -63.2402];
};

export const extraerLocalidadDeNombre = (nombreInst, localidadOriginal) => {
  const norm = normalizarTexto(nombreInst);
  for (const loc of Object.keys(COORDENADAS_LOCALIDADES)) {
    if (norm.includes(loc)) {
      return loc;
    }
  }
  return localidadOriginal;
};

export const resolverCoordenadasInstitucion = (nombreInst, localidad, coordsGuardadas) => {
  const catalogo = buscarEnCatalogoInstituciones(nombreInst);
  if (catalogo) return catalogo;

  if (coordsGuardadas && coordsGuardadas[nombreInst]) {
    return coordsGuardadas[nombreInst];
  }

  const localidadReal = extraerLocalidadDeNombre(nombreInst, localidad);
  return obtenerCoordenadas(localidadReal);
};

// ============================================================
// Geocodificación con Nominatim (fallback cuando no está en el catálogo)
// Recorre un mapa { nombreInstitucion: { localidad } } y va guardando
// las coordenadas con setCoords. Devuelve una función de cancelación.
// ============================================================
export const geocodificarInstituciones = (targetMap, currentCoords, setCoords) => {
  let activo = true;

  const buscar = async () => {
    for (const [inst, datos] of Object.entries(targetMap)) {
      if (!activo) break;
      if (currentCoords[inst]) continue;

      const catalogoMatch = buscarEnCatalogoInstituciones(inst);
      if (catalogoMatch) {
        setCoords((prev) => ({ ...prev, [inst]: catalogoMatch }));
        continue;
      }

      const localidadReal = extraerLocalidadDeNombre(inst, datos.localidad);
      const query = encodeURIComponent(`${inst}, ${localidadReal}, Córdoba, Argentina`);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;

      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'ProyectoMedicinaApp/1.0' } });
        const data = await res.json();

        if (activo && data && data.length > 0) {
          setCoords((prev) => ({
            ...prev,
            [inst]: [parseFloat(data[0].lat), parseFloat(data[0].lon)]
          }));
        } else if (activo) {
          setCoords((prev) => ({ ...prev, [inst]: obtenerCoordenadas(localidadReal) }));
        }
      } catch (error) {
        if (activo) {
          setCoords((prev) => ({ ...prev, [inst]: obtenerCoordenadas(localidadReal) }));
        }
      }
      await new Promise((r) => setTimeout(r, 600));
    }
  };

  buscar();
  return () => {
    activo = false;
  };
};