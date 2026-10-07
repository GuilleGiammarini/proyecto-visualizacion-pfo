import React, { useState } from 'react';

export default function Login({ onLoginSuccess, apiUrl }) {

  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError('');
    setCargando(true);

    try {

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          accion: 'login',
          usuario: usuario.trim(),
          clave: clave.trim()
        })
      });

      if (!response.ok) {
        throw new Error('No se pudo conectar con el servidor.');
      }

      const data = await response.json();

      if (data.ok) {

        const userData = {
          usuario: data.usuario || '',
          nombre: data.nombre || data.usuario || '',
          estacion: data.estacion || '',
          rol: data.rol || 'evaluador',
          isAdmin: data.isAdmin === true
        };

        // Guardamos la sesión normalizada
        localStorage.setItem(
          'user',
          JSON.stringify(userData)
        );

        // Compatibilidad con el sistema anterior
        localStorage.setItem(
          'pfo_user',
          JSON.stringify(userData)
        );

        onLoginSuccess(userData);

      } else {

        setError(
          data.message || 'Usuario o contraseña incorrectos.'
        );
      }

    } catch (err) {

      console.error('Error de login:', err);

      setError(
        'No se pudo conectar con el servidor. Verificá la conexión e intentá nuevamente.'
      );

    } finally {

      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">

      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden border-t-4 border-t-blue-900">

        <div className="p-8 pb-6 text-center border-b border-slate-100">

          <img
            src="/Membrete-UNVMHumanas.png"
            alt="Membrete UNVM Humanas"
            className="h-14 mx-auto mb-4 object-contain"
          />

          <h2 className="text-2xl font-bold text-blue-950">
            🩺 MEDICINA 🩺
          </h2>

          <p className="text-slate-500 text-sm mt-1">
            UNVM Humanas • Acceso al Sistema
          </p>

        </div>

        <form
          onSubmit={handleLogin}
          className="p-8 pt-6 space-y-5"
        >

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-3 rounded-xl text-center">
              {error}
            </div>
          )}

          <div className="space-y-1.5">

            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Usuario
            </label>

            <input
              type="text"
              value={usuario}
              onChange={(e) => {
                setUsuario(e.target.value);
                setError('');
              }}
              placeholder="Ej: Apendicitis"
              autoComplete="username"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all"
              required
              disabled={cargando}
            />

          </div>

          <div className="space-y-1.5">

            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Contraseña
            </label>

            <input
              type="password"
              value={clave}
              onChange={(e) => {
                setClave(e.target.value);
                setError('');
              }}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all"
              required
              disabled={cargando}
            />

          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full mt-2 py-3.5 px-4 bg-blue-900 hover:bg-blue-950 disabled:bg-slate-400 text-white font-bold rounded-xl shadow-sm transition-all text-sm tracking-wide"
          >
            {cargando
              ? 'Verificando...'
              : 'Ingresar al Sistema'}
          </button>

        </form>

      </div>

    </div>
  );
}