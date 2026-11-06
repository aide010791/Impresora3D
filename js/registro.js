// ── Registro de uso de Impresora 3D → Supabase (tabla "impresiones") ─────────
// Los alumnos solo pueden registrar; ver, descargar y eliminar se hace desde el
// panel de administrador del Lab (pestaña "Impresión 3D").
//
// Un registro puede tener varias tandas (cada vez que se usó la impresora).
// Cada tanda se guarda como una fila; las del mismo envío comparten "grupo".

const SUPABASE_URL = 'https://yzhdtwdwakzcnlergcpk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7-8BuHvJF63KH6T2xavAEA_euEHKqC-';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const MAX_TANDAS = 10;
const FILAMENTOS = ['PLA', 'ABS', 'PETG'];

const $ = id => document.getElementById(id);
const val = id => $(id).value.trim();

function fechaHoy() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
}
$('fecha').value = fechaHoy();

function formatearTiempo(min) {
    return `${Math.floor(min / 60)} h ${min % 60} min`;
}
function formatearGramos(g) {
    return (Math.round(g * 10) / 10).toLocaleString('es-MX');
}

function nuevoGrupo() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// ── Navegación entre pasos ──────────────────────────────────────────────────

let pasoActual = 1;
let grupoActual = null;   // se genera al llegar a "Confirmar"; evita duplicados si se reintenta

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
    const el = typeof campo === 'string' ? $(campo) : campo;
    if (el) { el.classList.add('invalido'); el.focus(); }
    return false;
}

// Al corregir un campo se quita el aviso de error
function quitarAviso(e) {
    // Horas y minutos cuentan como un solo dato: llenar cualquiera corrige ambos
    const grupo = e.target.closest('.fila-doble');
    const campos = grupo ? [...grupo.querySelectorAll('input')] : [e.target];
    if (campos.some(c => c.classList.contains('invalido'))) {
        campos.forEach(c => c.classList.remove('invalido'));
        document.querySelectorAll('.mensaje-error').forEach(m => m.classList.remove('visible'));
    }
}
$('formulario').addEventListener('input', quitarAviso);
$('formulario').addEventListener('change', quitarAviso);

function limpiarErrores() {
    document.querySelectorAll('.mensaje-error').forEach(e => e.classList.remove('visible'));
    document.querySelectorAll('.invalido').forEach(e => e.classList.remove('invalido'));
}

function validarPaso1() {
    for (const [id, nombre] of [['fecha', 'la fecha'], ['nombre', 'tu nombre'], ['boleta', 'tu número de boleta'], ['carrera', 'tu carrera'], ['materia', 'la materia'], ['profesor', 'el profesor']]) {
        if (!val(id)) return mostrarError(1, `Falta ${nombre}.`, id);
    }
    return true;
}

// ── Tandas ──────────────────────────────────────────────────────────────────

let contadorTandas = 0;

function tarjetas() { return [...document.querySelectorAll('#tandas .tanda')]; }

function crearTanda() {
    const u = ++contadorTandas;
    const div = document.createElement('div');
    div.className = 'tanda';
    div.innerHTML = `
        <div class="tanda-cabecera">
            <span class="tanda-titulo">Tanda</span>
            <button type="button" class="btn-quitar" onclick="quitarTanda(this)">Quitar</button>
        </div>
        <div class="field">
            <span class="label">Cantidad de piezas</span>
            <div class="stepper">
                <button type="button" class="stepper-btn" onclick="cambiarPiezas(this, -1)" aria-label="Menos piezas">−</button>
                <input type="number" class="t-piezas" value="1" min="1" max="50" inputmode="numeric" aria-label="Cantidad de piezas">
                <button type="button" class="stepper-btn" onclick="cambiarPiezas(this, 1)" aria-label="Más piezas">+</button>
            </div>
        </div>
        <div class="field">
            <span class="label">Tiempo de impresión</span>
            <div class="fila-doble">
                <div class="con-sufijo">
                    <input type="number" class="t-horas" min="0" max="168" inputmode="numeric" placeholder="0" aria-label="Horas">
                    <span>h</span>
                </div>
                <div class="con-sufijo">
                    <input type="number" class="t-minutos" min="0" max="59" inputmode="numeric" placeholder="0" aria-label="Minutos">
                    <span>min</span>
                </div>
            </div>
        </div>
        <div class="field">
            <span class="label">Tipo de filamento</span>
            <div class="chips" role="radiogroup" aria-label="Tipo de filamento">
                ${FILAMENTOS.map((f, i) => `<label class="chip"><input type="radio" name="filamento-${u}" value="${f}"${i === 0 ? ' checked' : ''}><span>${f}</span></label>`).join('')}
            </div>
        </div>
        <div class="field">
            <label for="gramos-${u}">Filamento utilizado</label>
            <div class="con-sufijo">
                <input type="number" class="t-gramos" id="gramos-${u}" min="0.1" max="5000" step="0.1" inputmode="decimal" placeholder="Ej. 35">
                <span>gramos</span>
            </div>
        </div>`;
    return div;
}

function renumerarTandas() {
    const t = tarjetas();
    t.forEach((c, i) => c.querySelector('.tanda-titulo').textContent = `Tanda ${i + 1}`);
    $('tandas').classList.toggle('unica', t.length === 1);
    $('btn-agregar').hidden = t.length >= MAX_TANDAS;
    actualizarTotal();
}

function agregarTanda() {
    if (tarjetas().length >= MAX_TANDAS) return;
    limpiarErrores();
    const c = crearTanda();
    $('tandas').appendChild(c);
    renumerarTandas();
    c.scrollIntoView({ behavior: 'smooth', block: 'start' });
    c.querySelector('.t-horas').focus({ preventScroll: true });
}

function quitarTanda(btn) {
    if (tarjetas().length <= 1) return;
    limpiarErrores();
    btn.closest('.tanda').remove();
    renumerarTandas();
}

function reiniciarTandas() {
    $('tandas').innerHTML = '';
    $('tandas').appendChild(crearTanda());
    renumerarTandas();
}

function cambiarPiezas(btn, delta) {
    const inp = btn.closest('.stepper').querySelector('input');
    inp.value = Math.min(50, Math.max(1, (parseInt(inp.value) || 1) + delta));
    actualizarTotal();
}

function leerTanda(c) {
    const horas = parseInt(c.querySelector('.t-horas').value) || 0;
    const minutos = parseInt(c.querySelector('.t-minutos').value) || 0;
    return {
        piezas: parseInt(c.querySelector('.t-piezas').value) || 0,
        horas, minutos,
        tiempo_min: horas * 60 + minutos,
        filamento: c.querySelector('input[type=radio]:checked').value,
        gramos: parseFloat(c.querySelector('.t-gramos').value.replace(',', '.'))
    };
}

function leerTandas() { return tarjetas().map(leerTanda); }

function sumarTandas(ts) {
    const porTipo = {};
    const tot = { piezas: 0, tiempo_min: 0, gramos: 0, porTipo };
    ts.forEach(t => {
        tot.piezas += t.piezas;
        tot.tiempo_min += t.tiempo_min;
        const g = t.gramos > 0 ? t.gramos : 0;
        tot.gramos += g;
        porTipo[t.filamento] = (porTipo[t.filamento] || 0) + g;
    });
    return tot;
}

function textoPorTipo(porTipo) {
    return FILAMENTOS.filter(f => porTipo[f] > 0).map(f => `${f} ${formatearGramos(porTipo[f])} g`).join(' · ');
}

function actualizarTotal() {
    const ts = leerTandas();
    const caja = $('total-tandas');
    caja.hidden = ts.length < 2;
    if (ts.length < 2) return;
    const tot = sumarTandas(ts);
    const tipos = Object.keys(tot.porTipo).filter(f => tot.porTipo[f] > 0);
    caja.innerHTML = '';
    const a = document.createElement('div'); a.className = 'total-titulo'; a.textContent = `Total de ${ts.length} tandas`;
    const b = document.createElement('div'); b.className = 'total-valor';
    b.textContent = `${tot.piezas} pieza${tot.piezas === 1 ? '' : 's'} · ${formatearTiempo(tot.tiempo_min)} · ${formatearGramos(tot.gramos)} g`;
    caja.append(a, b);
    if (tipos.length > 1) {
        const c = document.createElement('div'); c.className = 'total-detalle'; c.textContent = textoPorTipo(tot.porTipo);
        caja.appendChild(c);
    }
}

$('tandas').addEventListener('input', actualizarTotal);
$('tandas').addEventListener('change', actualizarTotal);

function validarPaso2() {
    const t = tarjetas();
    const varias = t.length > 1;
    for (let i = 0; i < t.length; i++) {
        const c = t[i], d = leerTanda(c);
        const pre = varias ? `Tanda ${i + 1}: ` : '';
        if (d.piezas < 1 || d.piezas > 50) return mostrarError(2, pre + 'la cantidad de piezas debe ser entre 1 y 50.', c.querySelector('.t-piezas'));
        if (d.minutos > 59) return mostrarError(2, pre + 'los minutos deben ser entre 0 y 59.', c.querySelector('.t-minutos'));
        if (d.horas > 168) return mostrarError(2, pre + 'revisa las horas de impresión.', c.querySelector('.t-horas'));
        if (d.tiempo_min < 1) return mostrarError(2, pre + 'escribe cuánto tiempo duró la impresión.', c.querySelector('.t-horas'));
        if (!(d.gramos > 0) || d.gramos > 5000) return mostrarError(2, pre + 'escribe los gramos de filamento que se usaron (por ejemplo 35).', c.querySelector('.t-gramos'));
    }
    return true;
}

function irPaso(n) {
    limpiarErrores();
    if (n > pasoActual) {
        if (pasoActual === 1 && !validarPaso1()) return;
        if (n >= 3 && !validarPaso2()) return;
    }
    if (n === 3) { grupoActual = nuevoGrupo(); pintarResumen(); }
    mostrarPaso(n);
}

// ── Resumen ─────────────────────────────────────────────────────────────────

function pintarResumen() {
    const ts = leerTandas();
    const filas = [
        ['Fecha', val('fecha')],
        ['Nombre', val('nombre')],
        ['Boleta', val('boleta')],
        ['Carrera', val('carrera')],
        ['Materia', val('materia')],
        ['Profesor', val('profesor')]
    ];
    if (ts.length === 1) {
        const d = ts[0];
        filas.push(['Piezas', d.piezas], ['Tiempo', formatearTiempo(d.tiempo_min)], ['Filamento', `${d.filamento} · ${formatearGramos(d.gramos)} g`]);
    } else {
        ts.forEach((d, i) => filas.push([`Tanda ${i + 1}`,
            `${d.piezas} pz · ${formatearTiempo(d.tiempo_min)} · ${d.filamento} ${formatearGramos(d.gramos)} g`]));
        const tot = sumarTandas(ts);
        filas.push(['Total', `${tot.piezas} pz · ${formatearTiempo(tot.tiempo_min)} · ${formatearGramos(tot.gramos)} g`, 'total']);
    }
    const cont = $('resumen');
    cont.innerHTML = '';
    filas.forEach(([k, v, clase]) => {
        const fila = document.createElement('div'); fila.className = 'resumen-fila' + (clase ? ' resumen-' + clase : '');
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

    const ts = leerTandas();
    const base = {
        fecha:    val('fecha'),
        nombre:   val('nombre'),
        boleta:   val('boleta'),
        carrera:  val('carrera'),
        materia:  val('materia'),
        profesor: val('profesor'),
        grupo:    grupoActual || (grupoActual = nuevoGrupo())
    };
    // Todas las tandas van en una sola petición: se guardan todas o ninguna
    const filas = ts.map((d, i) => ({
        ...base,
        tanda:      i + 1,
        piezas:     d.piezas,
        tiempo_min: d.tiempo_min,
        filamento:  d.filamento,
        gramos:     Math.round(d.gramos * 10) / 10
    }));

    const btn = $('btn-registro');
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    const { error } = await db.from('impresiones').insert(filas);
    btn.disabled = false;
    btn.textContent = 'Enviar registro';

    // 23505 = ya estaba guardado (reintento tras perder la respuesta): se toma como éxito
    if (error && error.code !== '23505') {
        const sinRed = /fetch|network/i.test(error.message || '');
        return mostrarError(3, sinRed
            ? 'No hay conexión a internet. Revisa tu conexión e intenta de nuevo.'
            : 'No se pudo registrar. Revisa los datos e intenta de nuevo.');
    }

    const tot = sumarTandas(ts);
    const tipos = Object.keys(tot.porTipo).filter(f => tot.porTipo[f] > 0);
    $('exito-texto').textContent = ts.length === 1
        ? `${tot.piezas} pieza(s) · ${formatearTiempo(tot.tiempo_min)} · ${formatearGramos(tot.gramos)} g de ${ts[0].filamento}`
        : `${ts.length} tandas · ${tot.piezas} pieza(s) · ${formatearTiempo(tot.tiempo_min)} · ${formatearGramos(tot.gramos)} g` +
          (tipos.length > 1 ? ` (${textoPorTipo(tot.porTipo)})` : ` de ${tipos[0]}`);
    grupoActual = null;
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
    // Conserva fecha, nombre, boleta y carrera para registrar otra impresión rápido
    ['materia', 'profesor'].forEach(id => $(id).value = '');
    reiniciarTandas();
    mostrarPaso(1);
}

reiniciarTandas();
