// ── Registro de uso de Impresora 3D → Supabase (tabla "impresiones") ─────────
// Los alumnos solo pueden registrar; ver, descargar y eliminar se hace desde el
// panel de administrador del Lab (pestaña "Impresión 3D").

const SUPABASE_URL = 'https://yzhdtwdwakzcnlergcpk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7-8BuHvJF63KH6T2xavAEA_euEHKqC-';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const formulario = document.getElementById('formulario');
const registro   = document.getElementById('registro');
const exito      = document.getElementById('exito');
const btn        = document.getElementById('btn-registro');
const error      = document.getElementById('mensaje-error');

// Piezas 1–15
const selPiezas = document.getElementById('piezas');
for (let i = 1; i <= 15; i++) selPiezas.add(new Option(i, i));

function fechaHoy() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
}
document.getElementById('fecha').value = fechaHoy();

function mostrarError(texto) {
    error.textContent = texto;
    error.classList.add('visible');
}

formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.classList.remove('visible');

    const v = id => document.getElementById(id).value.trim();
    const horas   = parseInt(v('horas'))   || 0;
    const minutos = parseInt(v('minutos')) || 0;
    const gramos  = parseFloat(v('gramos').replace(',', '.'));
    const tiempo_min = horas * 60 + minutos;

    if (!v('fecha') || !v('nombre') || !v('boleta') || !v('materia') || !v('profesor')) {
        return mostrarError('Completa todos los campos.');
    }
    if (minutos > 59 || horas > 168 || tiempo_min < 1) {
        return mostrarError('Escribe el tiempo de impresión (horas y minutos).');
    }
    if (!(gramos > 0) || gramos > 5000) {
        return mostrarError('Escribe los gramos de filamento usados (por ejemplo 35).');
    }

    btn.disabled = true;
    btn.textContent = 'ENVIANDO…';

    const datos = {
        fecha:     v('fecha'),
        nombre:    v('nombre'),
        boleta:    v('boleta'),
        materia:   v('materia'),
        profesor:  v('profesor'),
        piezas:    parseInt(v('piezas')),
        tiempo_min,
        filamento: v('filamento'),
        gramos:    Math.round(gramos * 10) / 10
    };

    const { error: err } = await db.from('impresiones').insert([datos]);

    btn.disabled = false;
    btn.textContent = 'REGISTRO';

    if (err) {
        const sinRed = /fetch|network/i.test(err.message || '');
        return mostrarError(sinRed
            ? 'No hay conexión a internet. Revisa tu conexión e intenta de nuevo.'
            : 'No se pudo registrar. Revisa los datos e intenta de nuevo.');
    }

    document.getElementById('resumen').textContent =
        `${datos.piezas} pieza(s) · ${horas} h ${minutos} min · ${datos.gramos} g de ${datos.filamento}`;
    registro.classList.remove('activo');
    exito.classList.add('activo');
});

document.getElementById('btn-otra').addEventListener('click', () => {
    formulario.reset();
    document.getElementById('fecha').value = fechaHoy();
    exito.classList.remove('activo');
    registro.classList.add('activo');
});
