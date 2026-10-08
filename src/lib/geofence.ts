// Geocerca del taller — usada solo en las rutas de marcar entrada/salida/
// descansos del control de horario. El resto de la app (calendario,
// cotizaciones, etc.) no se ve afectado.
//
// El taller es un rectángulo inclinado (no alineado norte-sur/este-oeste).
// Lo que se mide en Google Maps son los 4 PUNTOS MEDIOS de los lados (una
// "cruz" que atraviesa el taller: abajo, arriba, izquierda, derecha), no
// las esquinas. A partir de esos 4 puntos se reconstruyen las 4 esquinas
// reales:
//   - el segmento izquierda → derecha es un eje del rectángulo
//   - el segmento abajo → arriba es el otro eje (perpendicular al primero)
//   - cada esquina = centro ± mitad de un eje ± mitad del otro eje
// y con esas 4 esquinas ya reconstruidas se arma el polígono y se revisa
// si el punto GPS cae adentro. Esto funciona exacto sin importar la
// inclinación del taller.
//
// Por defecto se usan los 4 puntos medios medidos. Si alguna vez hay que
// volver a medir, solo se cambian estos 4 valores — las esquinas se
// recalculan solas. También se puede sobreescribir sin redeploy con la
// variable de entorno TALLER_PUNTOS_MEDIOS (JSON):
// TALLER_PUNTOS_MEDIOS={"abajo":{"lat":...,"lng":...},"arriba":{...},"izquierda":{...},"derecha":{...}}
const TALLER_PUNTOS_MEDIOS_DEFAULT = {
    abajo: { lat: 10.082859603803476, lng: -84.28008902889417 },
    arriba: { lat: 10.083156748202125, lng: -84.28030753625717 },
    izquierda: { lat: 10.082947558574034, lng: -84.28028701346618 },
    derecha: { lat: 10.083112770848404, lng: -84.28004798331217 },
};

type Punto = { lat: number; lng: number };
type PuntosMedios = { abajo: Punto; arriba: Punto; izquierda: Punto; derecha: Punto };

function cargarPuntosMedios(): PuntosMedios {
    const raw = process.env.TALLER_PUNTOS_MEDIOS;
    if (!raw) return TALLER_PUNTOS_MEDIOS_DEFAULT;
    try {
        const p = JSON.parse(raw);
        if (p?.abajo?.lat != null && p?.arriba?.lat != null && p?.izquierda?.lat != null && p?.derecha?.lat != null) {
            return p;
        }
    } catch {
        // JSON inválido en la variable de entorno — se ignora y se usa el default.
    }
    return TALLER_PUNTOS_MEDIOS_DEFAULT;
}

const PUNTOS_MEDIOS = cargarPuntosMedios();

function toRad(deg: number) {
    return (deg * Math.PI) / 180;
}

// Centro de referencia para proyectar lat/lng a metros — el centroide de
// los 4 puntos medios (en un rectángulo bien medido coincide con el
// centro real del taller).
const LAT_REF = (PUNTOS_MEDIOS.abajo.lat + PUNTOS_MEDIOS.arriba.lat + PUNTOS_MEDIOS.izquierda.lat + PUNTOS_MEDIOS.derecha.lat) / 4;
const LNG_REF = (PUNTOS_MEDIOS.abajo.lng + PUNTOS_MEDIOS.arriba.lng + PUNTOS_MEDIOS.izquierda.lng + PUNTOS_MEDIOS.derecha.lng) / 4;

const METROS_POR_GRADO_LAT = 111320;
const METROS_POR_GRADO_LNG = 111320 * Math.cos(toRad(LAT_REF));

// Convierte una coordenada a metros locales (x = este-oeste, y = norte-sur)
// relativos al centro del taller — un plano plano es más que suficiente
// para distancias de unos pocos metros/decenas de metros como estas.
function aMetros(lat: number, lng: number): { x: number; y: number } {
    return {
        x: (lng - LNG_REF) * METROS_POR_GRADO_LNG,
        y: (lat - LAT_REF) * METROS_POR_GRADO_LAT,
    };
}

// Reconstruye las 4 esquinas reales a partir de los 4 puntos medios de los
// lados, todo ya en metros locales:
//   ejeU = punto medio derecha → punto medio izquierda (eje "ancho")
//   ejeV = punto medio arriba  → punto medio abajo     (eje "alto")
//   esquina = centro ± ejeU/2 ± ejeV/2 (las 4 combinaciones de signos,
//   en orden para que consecutivas compartan un lado del rectángulo)
function calcularEsquinas(): { x: number; y: number }[] {
    const abajo = aMetros(PUNTOS_MEDIOS.abajo.lat, PUNTOS_MEDIOS.abajo.lng);
    const arriba = aMetros(PUNTOS_MEDIOS.arriba.lat, PUNTOS_MEDIOS.arriba.lng);
    const izquierda = aMetros(PUNTOS_MEDIOS.izquierda.lat, PUNTOS_MEDIOS.izquierda.lng);
    const derecha = aMetros(PUNTOS_MEDIOS.derecha.lat, PUNTOS_MEDIOS.derecha.lng);

    const centro = {
        x: (abajo.x + arriba.x + izquierda.x + derecha.x) / 4,
        y: (abajo.y + arriba.y + izquierda.y + derecha.y) / 4,
    };

    const ejeU = { x: (derecha.x - izquierda.x) / 2, y: (derecha.y - izquierda.y) / 2 }; // mitad del eje izquierda-derecha
    const ejeV = { x: (arriba.x - abajo.x) / 2, y: (arriba.y - abajo.y) / 2 }; // mitad del eje abajo-arriba

    return [
        { x: centro.x + ejeU.x + ejeV.x, y: centro.y + ejeU.y + ejeV.y },
        { x: centro.x + ejeU.x - ejeV.x, y: centro.y + ejeU.y - ejeV.y },
        { x: centro.x - ejeU.x - ejeV.x, y: centro.y - ejeU.y - ejeV.y },
        { x: centro.x - ejeU.x + ejeV.x, y: centro.y - ejeU.y + ejeV.y },
    ];
}

const POLIGONO_METROS = calcularEsquinas();

// Fórmula de Haversine — distancia en metros entre dos coordenadas. Ya no
// decide si alguien está dentro del taller (eso lo hace el polígono), pero
// se deja para mostrar una distancia aproximada informativa.
export function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Punto-dentro-de-polígono por producto cruzado: el punto está adentro si
// queda del mismo lado (mismo signo) de TODAS las aristas del polígono,
// recorridas en orden. Funciona para cualquier polígono convexo (un
// rectángulo inclinado lo es), sin necesitar ángulo ni ancho/alto.
function dentroDelPoligono(x: number, y: number, poligono: { x: number; y: number }[]): boolean {
    let signo = 0;
    for (let i = 0; i < poligono.length; i++) {
        const a = poligono[i];
        const b = poligono[(i + 1) % poligono.length];
        const cruz = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
        if (cruz !== 0) {
            const s = cruz > 0 ? 1 : -1;
            if (signo === 0) signo = s;
            else if (s !== signo) return false;
        }
    }
    return true;
}

export function validarUbicacionTaller(lat?: number, lng?: number): { ok: boolean; distancia?: number; mensaje?: string } {
    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
        return {
            ok: false,
            mensaje: 'No se pudo obtener tu ubicación. Activa el GPS y da permiso de ubicación a la app para poder marcar.',
        };
    }

    const { x, y } = aMetros(lat, lng);
    const distancia = distanciaMetros(LAT_REF, LNG_REF, lat, lng);

    if (!dentroDelPoligono(x, y, POLIGONO_METROS)) {
        return {
            ok: false,
            distancia,
            mensaje: `Debes estar en la oficina para marcar, coloca el celular en su lugar.`,
        };
    }

    return { ok: true, distancia };
}

export interface MuestraUbicacion { lat: number; lng: number }

// Evalúa varias lecturas GPS en vez de una sola — el GPS de celular suele
// "oscilar" unos segundos después del primer fix. Basta con que UNA de las
// muestras caiga dentro del polígono para aceptar la marca; alguien que
// realmente está en el taller casi siempre va a tener al menos una lectura
// precisa entre 3 intentos, mientras que alguien fuera del taller no va a
// "saltar" por casualidad hasta caer adentro.
export function validarUbicacionTallerMultiple(muestras?: MuestraUbicacion[]): { ok: boolean; distancia?: number; mensaje?: string } {
    if (!muestras || muestras.length === 0) {
        return {
            ok: false,
            mensaje: 'No se pudo obtener tu ubicación. Activa el GPS y da permiso de ubicación a la app para poder marcar.',
        };
    }

    let mejorDistancia = Infinity;
    for (const m of muestras) {
        if (m.lat === undefined || m.lng === undefined || isNaN(m.lat) || isNaN(m.lng)) continue;

        const { x, y } = aMetros(m.lat, m.lng);
        const d = distanciaMetros(LAT_REF, LNG_REF, m.lat, m.lng);
        if (d < mejorDistancia) mejorDistancia = d;

        if (dentroDelPoligono(x, y, POLIGONO_METROS)) {
            return { ok: true, distancia: d };
        }
    }

    return {
        ok: false,
        distancia: mejorDistancia,
        mensaje: `Debes estar en la oficina para marcar, coloca el celular en su lugar.`,
    };
}