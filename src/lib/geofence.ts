// Geocerca del taller — usada solo en las rutas de marcar entrada/salida/
// descansos del control de horario. El resto de la app (calendario,
// cotizaciones, etc.) no se ve afectado.
//
// Se configura por variables de entorno en vez de una tabla nueva en la
// base de datos, porque es una sola ubicación fija; si en el futuro
// necesitas cambiarla seguido sin hacer un redeploy, se puede convertir
// a una tabla editable desde el panel de admin (mismo patrón que
// BreakPolicy / WageThreshold).
const TALLER_LAT = Number(process.env.TALLER_LAT);
const TALLER_LNG = Number(process.env.TALLER_LNG);
const TALLER_RADIO_METROS = Number(process.env.TALLER_RADIO_METROS) || 150;

function toRad(deg: number) {
    return (deg * Math.PI) / 180;
}

// Fórmula de Haversine — distancia en metros entre dos coordenadas.
export function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // radio de la Tierra en metros
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function validarUbicacionTaller(lat?: number, lng?: number): { ok: boolean; distancia?: number; mensaje?: string } {
    // Si no se configuraron las variables de entorno, no se bloquea nada
    // (evita que un despliegue sin esta config rompa el fichaje por error).
    if (!TALLER_LAT || !TALLER_LNG) return { ok: true };

    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
        return {
            ok: false,
            mensaje: 'No se pudo obtener tu ubicación. Activa el GPS y da permiso de ubicación a la app para poder marcar.',
        };
    }

    const distancia = distanciaMetros(TALLER_LAT, TALLER_LNG, lat, lng);
    if (distancia > TALLER_RADIO_METROS) {
        return {
            ok: false,
            distancia,
            mensaje: `Estás a ${Math.round(distancia)}m del taller (máximo permitido: ${TALLER_RADIO_METROS}m). Debes estar en el taller para marcar.`,
        };
    }

    return { ok: true, distancia };
}