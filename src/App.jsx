import React, { useState, useEffect } from 'react';
import Estudiantes from './Estudiantes';
import Convenios from './Convenios';
import ECOE from './ECOE';
import Login from './Login';

// ============================================================
// URL DEL GOOGLE APPS SCRIPT
// ============================================================


const API_URL = 'https://script.google.com/macros/s/AKfycby-qfURF_V4SjrHJIbr7_O-FVIm-QxUJf5nSwg3s5Lyx5as0o2jsEVQVfCSU751OprO-A/exec';


// ============================================================
// SECCIONES PRINCIPALES
// ============================================================

const SECCIONES = [
  { id: 'estudiantes', label: '🎓 Estudiantes' },
  { id: 'Convenios', label: '📄 Convenios' },
  { id: 'ecoe', label: '🩺 ECOE' }
];


// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function App() {

  const [user, setUser] = useState(null);

  const [seccionPrincipal, setSeccionPrincipal] =
    useState('estudiantes');


  // ==========================================================
  // RECUPERAR SESIÓN AL CARGAR LA APLICACIÓN
  // ==========================================================

  useEffect(() => {

    try {

      // Primero buscamos la nueva clave "user".
      // Después buscamos "pfo_user" por compatibilidad
      // con sesiones anteriores.

      const savedUser =
        localStorage.getItem('user') ||
        localStorage.getItem('pfo_user');

      if (!savedUser) {
        return;
      }

      const parsedUser = JSON.parse(savedUser);

      if (!parsedUser) {
        return;
      }


      // --------------------------------------------------------
      // NORMALIZAR USUARIO
      // --------------------------------------------------------
      //
      // Esto permite que sesiones antiguas sigan funcionando
      // aunque hayan sido guardadas con nombres de campos
      // diferentes.
      // --------------------------------------------------------

      const usuario =
        parsedUser.usuario ||
        parsedUser.USUARIO ||
        '';

      const nombre =
        parsedUser.nombre ||
        parsedUser.NOMBRE ||
        usuario ||
        '';

      const estacion =
        parsedUser.estacion ||
        parsedUser.ESTACION ||
        '';

      const rol =
        parsedUser.rol ||
        parsedUser.ROL ||
        '';

      const isAdmin =
        parsedUser.isAdmin === true ||
        estacion
          .toString()
          .trim()
          .toUpperCase() === 'ACCESO TOTAL' ||
        usuario
          .toString()
          .trim()
          .toUpperCase() === 'ADMIN' ||
        rol
          .toString()
          .trim()
          .toLowerCase() === 'admin' ||
        rol
          .toString()
          .trim()
          .toLowerCase() === 'administrador';


      const usuarioNormalizado = {

        usuario,

        nombre,

        rol: isAdmin ? 'admin' : (rol || 'evaluador'),

        estacion,

        isAdmin

      };


      // Guardamos nuevamente la sesión normalizada

      localStorage.setItem(
        'user',
        JSON.stringify(usuarioNormalizado)
      );

      localStorage.setItem(
        'pfo_user',
        JSON.stringify(usuarioNormalizado)
      );


      setUser(usuarioNormalizado);


      // --------------------------------------------------------
      // SI ES EVALUADOR
      // --------------------------------------------------------
      //
      // Los evaluadores van directamente a ECOE.
      // --------------------------------------------------------

      if (!usuarioNormalizado.isAdmin) {

        setSeccionPrincipal('ecoe');

      }


    } catch (error) {

      console.error(
        'Error al recuperar la sesión:',
        error
      );

      localStorage.removeItem('user');
      localStorage.removeItem('pfo_user');

      sessionStorage.removeItem('user');
      sessionStorage.removeItem('pfo_user');

      setUser(null);

    }

  }, []);


  // ==========================================================
  // LOGIN
  // ==========================================================

  if (!user) {

    return (

      <Login

        apiUrl={API_URL}

        onLoginSuccess={(userData) => {

          // ----------------------------------------------------
          // Login.jsx ya recibe la respuesta de Apps Script
          // con el usuario normalizado.
          // ----------------------------------------------------

          if (!userData) {
            return;
          }


          const usuario =
            userData.usuario ||
            userData.USUARIO ||
            '';

          const nombre =
            userData.nombre ||
            userData.NOMBRE ||
            usuario ||
            '';

          const estacion =
            userData.estacion ||
            userData.ESTACION ||
            '';

          const rol =
            userData.rol ||
            userData.ROL ||
            '';

          const isAdmin =
            userData.isAdmin === true ||
            estacion
              .toString()
              .trim()
              .toUpperCase() === 'ACCESO TOTAL' ||
            usuario
              .toString()
              .trim()
              .toUpperCase() === 'ADMIN' ||
            rol
              .toString()
              .trim()
              .toLowerCase() === 'admin' ||
            rol
              .toString()
              .trim()
              .toLowerCase() === 'administrador';


          const usuarioNormalizado = {

            usuario,

            nombre,

            rol: isAdmin ? 'admin' : (rol || 'evaluador'),

            estacion,

            isAdmin

          };


          // ----------------------------------------------------
          // GUARDAR SESIÓN
          // ----------------------------------------------------

          localStorage.setItem(
            'user',
            JSON.stringify(usuarioNormalizado)
          );

          // Compatibilidad con versiones anteriores

          localStorage.setItem(
            'pfo_user',
            JSON.stringify(usuarioNormalizado)
          );


          // ----------------------------------------------------
          // ACTUALIZAR ESTADO
          // ----------------------------------------------------

          setUser(usuarioNormalizado);


          // ----------------------------------------------------
          // DESTINO SEGÚN TIPO DE USUARIO
          // ----------------------------------------------------

          if (usuarioNormalizado.isAdmin) {

            setSeccionPrincipal('estudiantes');

          } else {

            setSeccionPrincipal('ecoe');

          }

        }}

      />

    );

  }


  // ==========================================================
  // DETERMINAR SI ES ADMINISTRADOR
  // ==========================================================

  const isAdmin =
    user.isAdmin === true ||
    user.estacion
      ?.toString()
      .trim()
      .toUpperCase() === 'ACCESO TOTAL' ||
    user.usuario
      ?.toString()
      .trim()
      .toUpperCase() === 'ADMIN' ||
    user.rol
      ?.toString()
      .trim()
      .toLowerCase() === 'admin' ||
    user.rol
      ?.toString()
      .trim()
      .toLowerCase() === 'administrador';


  // ==========================================================
  // SECCIONES PERMITIDAS
  // ==========================================================
  //
  // ADMIN:
  //   - Estudiantes
  //   - Convenios
  //   - ECOE
  //
  // EVALUADOR:
  //   - solamente ECOE
  // ==========================================================

  const seccionesPermitidas = isAdmin

    ? SECCIONES

    : SECCIONES.filter(
        (sec) => sec.id === 'ecoe'
      );


  // ==========================================================
  // CERRAR SESIÓN
  // ==========================================================

  const cerrarSesion = () => {

    localStorage.removeItem('user');

    localStorage.removeItem('pfo_user');

    sessionStorage.removeItem('user');

    sessionStorage.removeItem('pfo_user');

    setUser(null);

    setSeccionPrincipal('estudiantes');

  };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">

      <div className="max-w-5xl mx-auto space-y-6">


        {/* ==================================================
            CABECERA
        ================================================== */}

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 border-t-4 border-t-blue-900">


          {/* ==================================================
              INFORMACIÓN DEL USUARIO
          ================================================== */}

          <div className="text-center md:text-left">

            <h1 className="text-2xl font-bold text-blue-950">
              Sistema PFO - Medicina
            </h1>

            <p className="text-slate-500 text-sm mt-0.5">
              UNVM Humanas
            </p>

            <p className="text-xs font-semibold text-blue-800 mt-1">

              Usuario: {user.usuario}

              {isAdmin
                ? ' (Acceso Total)'
                : ` | Estación Asignada: ${user.estacion}`
              }

            </p>

          </div>


          {/* ==================================================
              LOGO
          ================================================== */}

          <div className="flex justify-center my-2 md:my-0">

            <img
              src="/Membrete-UNVMHumanas.png"
              alt="Membrete UNVM Humanas"
              className="h-16 md:h-20 w-auto object-contain"
            />

          </div>


          {/* ==================================================
              NAVEGACIÓN + SALIR
          ================================================== */}

          <div className="flex items-center gap-4">


            {/* ==================================================
                SECCIONES
            ================================================== */}

            <div className="flex justify-center my-1 md:my-0 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">

              {seccionesPermitidas.map((sec) => (

                <button
                  key={sec.id}
                  onClick={() =>
                    setSeccionPrincipal(sec.id)
                  }
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


            {/* ==================================================
                CERRAR SESIÓN
            ================================================== */}

            <button
              onClick={cerrarSesion}
              className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-all border border-red-200 cursor-pointer"
              title="Cerrar sesión"
            >
              Salir
            </button>

          </div>

        </div>


        {/* ==================================================
            VISTAS
        ================================================== */}


        {/* ==================================================
            ESTUDIANTES
        ================================================== */}

        {isAdmin &&
          seccionPrincipal === 'estudiantes' && (

            <Estudiantes />

          )
        }


        {/* ==================================================
            CONVENIOS
        ================================================== */}

        {isAdmin &&
          seccionPrincipal === 'Convenios' && (

            <Convenios />

          )
        }


        {/* ==================================================
            ECOE
        ================================================== */}

        {seccionPrincipal === 'ecoe' && (

          <ECOE
            user={user}
          />

        )}


      </div>

    </div>

  );
}