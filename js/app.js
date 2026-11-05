// ── Registro de uso de Impresora 3D → Supabase (tabla "impresiones") ─────────
// Los alumnos solo pueden registrar; ver, descargar y eliminar se hace desde el
// panel de administrador del Lab (pestaña "Impresión 3D").

const SUPABASE_URL = 'https://yzhdtwdwakzcnlergcpk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7-8BuHvJF63KH6T2xavAEA_euEHKqC-';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);
const val = id => $(id).value.trim();

function fechaHoy() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
}
$('fecha').value = fechaHoy();

// ── Navegación entre pasos ──────────────────────────────────────────────────

let pasoActual = 1;

function mostrarPaso(n) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    $(n === 'exito' ? 'exito' : 'paso-' + n).classList.add('active');
    $('progreso').style.display = n === 'exito' ? 'none' : '';
    if (n !== 'exito') {
        $('progress-fill').style.width = (n / 3 * 100) + '%';
        document.querySelectorAll('.step-label').forEach(l => {
            const p = Number(l.dataset.paso);
            l.classList.toggle('active', p === n);
            l.classList.toggle('done', p < n);
        });
        pasoActual = n;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function mostrarError(paso, texto, campo) {
    const e = $('error-' + paso);
    e.textContent = texto;
    e.classList.add('visible');
    if (campo) { $(campo).classList.add('invalido'); $(campo).focus(); }
    return false;
}

// Al corregir un campo se quita el aviso de error
$('formulario').addEventListener('input', e => {
    if (e.target.classList.contains('invalido')) {
        e.target.classList.remove('invalido');
        document.querySelectorAll('.mensaje-error').forEach(m => m.classList.remove('visible'));
    }
});

function limpiarErrores() {
    document.querySelectorAll('.mensaje-error').forEach(e => e.classList.remove('visible'));
    document.querySelectorAll('.invalido').forEach(e => e.classList.remove('invalido'));
}

function validarPaso1() {
    for (const [id, nombre] of [['fecha', 'la fecha'], ['nombre', 'tu nombre'], ['boleta', 'tu número de boleta'], ['materia', 'la materia'], ['profesor', 'el profesor']]) {
        if (!val(id)) return mostrarError(1, `Falta ${nombre}.`, id);
    }
    return true;
}

function leerImpresion() {
    const horas = parseInt(val('horas')) || 0;
    const minutos = parseInt(val('minutos')) || 0;
    return {
        piezas: parseInt(val('piezas')) || 0,
        horas, minutos,
        tiempo_min: horas * 60 + minutos,
        filamento: document.querySelector('input[name="filamento"]:checked').value,
        gramos: parseFloat(val('gramos').replace(',', '.'))
    };
}

function validarPaso2() {
    const d = leerImpresion();
    if (d.piezas < 1 || d.piezas > 50) return mostrarError(2, 'La cantidad de piezas debe ser entre 1 y 50.', 'piezas');
    if (d.minutos > 59) return mostrarError(2, 'Los minutos deben ser entre 0 y 59.', 'minutos');
    if (d.horas > 168) return mostrarError(2, 'Revisa las horas de impresión.', 'horas');
    if (d.tiempo_min < 1) return mostrarError(2, 'Escribe cuánto tiempo duró la impresión.', 'horas');
    if (!(d.gramos > 0) || d.gramos > 5000) return mostrarError(2, 'Escribe los gramos de filamento que se usaron (por ejemplo 35).', 'gramos');
    return true;
}

function irPaso(n) {
    limpiarErrores();
    if (n > pasoActual) {
        if (pasoActual === 1 && !validarPaso1()) return;
        if (n >= 3 && !validarPaso2()) return;
    }
    if (n === 3) pintarResumen();
    mostrarPaso(n);
}

function cambiarPiezas(delta) {
    const p = Math.min(50, Math.max(1, (parseInt(val('piezas')) || 1) + delta));
    $('piezas').value = p;
}

function pintarResumen() {
    const d = leerImpresion();
    const filas = [
        ['Fecha', val('fecha')],
        ['Nombre', val('nombre')],
        ['Boleta', val('boleta')],
        ['Materia', val('materia')],
        ['Profesor', val('profesor')],
        ['Piezas', d.piezas],
        ['Tiempo', `${d.horas} h ${d.minutos} min`],
        ['Filamento', `${d.filamento} · ${Math.round(d.gramos * 10) / 10} g`]
    ];
    const cont = $('resumen');
    cont.innerHTML = '';
    filas.forEach(([k, v]) => {
        const fila = document.createElement('div'); fila.className = 'resumen-fila';
        const a = document.createElement('span'); a.className = 'resumen-key'; a.textContent = k;
        const b = document.createElement('span'); b.className = 'resumen-val'; b.textContent = v;
        fila.append(a, b); cont.appendChild(fila);
    });
}

// ── Envío ───────────────────────────────────────────────────────────────────

$('formulario').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (pasoActual !== 3) return;          // Enter en un campo no envía antes de confirmar
    limpiarErrores();

    const d = leerImpresion();
    const datos = {
        fecha:     val('fecha'),
        nombre:    val('nombre'),
        boleta:    val('boleta'),
        materia:   val('materia'),
        profesor:  val('profesor'),
        piezas:    d.piezas,
        tiempo_min: d.tiempo_min,
        filamento: d.filamento,
        gramos:    Math.round(d.gramos * 10) / 10
    };

    const btn = $('btn-registro');
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    const { error } = await db.from('impresiones').insert([datos]);
    btn.disabled = false;
    btn.textContent = 'Enviar registro';

    if (error) {
        const sinRed = /fetch|network/i.test(error.message || '');
        return mostrarError(3, sinRed
            ? 'No hay conexión a internet. Revisa tu conexión e intenta de nuevo.'
            : 'No se pudo registrar. Revisa los datos e intenta de nuevo.');
    }

    $('exito-texto').textContent =
        `${datos.piezas} pieza(s) · ${d.horas} h ${d.minutos} min · ${datos.gramos} g de ${datos.filamento}`;
    mostrarPaso('exito');
});

// Enter en los campos avanza al siguiente paso en lugar de enviar
$('formulario').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && pasoActual < 3) {
        if (document.querySelector('.ac-lista.visible .ac-opcion.activa')) return; // elegir sugerencia
        e.preventDefault();
        irPaso(pasoActual + 1);
    }
});

function nuevoRegistro() {
    // Conserva fecha, nombre y boleta para registrar otra impresión rápido
    ['materia', 'profesor', 'horas', 'minutos', 'gramos'].forEach(id => $(id).value = '');
    $('piezas').value = 1;
    document.querySelector('input[name="filamento"][value="PLA"]').checked = true;
    mostrarPaso(1);
}
