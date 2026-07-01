/**
 * Motor de Cotización — WM Muebles Contemporáneos
 * Los precios se resuelven por combinación furnitureType + material
 * desde la tabla material_furniture_prices.
 */



// ────────────────────────────────────────────────────────
// FÓRMULAS BASE (sin cambios)
// ────────────────────────────────────────────────────────

export function calcularBase(largo: number, precioMaterial: number, precioSobre = 0): number {
  return (largo / 100) * precioMaterial + (largo / 100) * precioSobre;
}

export function calcularAereo(
  largo: number, alto: number, precioAereo: number,
  estiloDoble: 'FUNCIONAL' | 'FALSO' = 'FUNCIONAL'
): number {
  if (alto <= 60) return ((largo * alto) / 6000) * precioAereo;
  const restante = alto - 60;
  const largoExtra = (largo * restante) / 60;
  if (estiloDoble === 'FUNCIONAL') return ((largo + largoExtra) / 100) * precioAereo;
  return (largo / 100) * precioAereo + ((largoExtra / 100) * precioAereo) / 2;
}

export function calcularTorre(largo: number, alto: number, precioTorre: number): number {
  let largoReal = largo;
  if (alto > 210) {
    largoReal = largo + (largo * (alto - 210)) / 210;
  }
  return (largoReal / 100) * precioTorre;
}

export function calcularAlacenaRefri(largo: number, alto: number, precio: number): number {
  return calcularTorre(largo, alto, precio);
}

export function calcularAereoRefri(
  largo: number, alto: number, precioAereoRefri: number,
  tipoCajonEspecial = false, precioBase210 = 0, costoExtraCm = 0
): number {
  if (tipoCajonEspecial) {
    return alto <= 210 ? precioBase210 : precioBase210 + (alto - 210) * costoExtraCm;
  }
  if (alto <= 30) return ((largo * alto) / 3000) * precioAereoRefri;
  return (largo / 100) * precioAereoRefri;
}

export function calcularIsla(
  largo: number, ancho: number, alto: number,
  precioIsla: number, precioMetroSobre: number,
  cascada: 'NINGUNA' | 'UN_LADO' | 'AMBOS_LADOS' = 'NINGUNA'
): number {
  const precioBase = (largo / 100) * precioIsla;
  let metrosSobre = (ancho * largo) / 78 / 100;
  if (cascada === 'UN_LADO')    metrosSobre += (ancho * alto) / 78 / 100;
  if (cascada === 'AMBOS_LADOS') metrosSobre += 2 * (ancho * alto) / 78 / 100;
  return precioBase + metrosSobre * precioMetroSobre;
}

// ────────────────────────────────────────────────────────
// TIPOS NUEVOS
// ────────────────────────────────────────────────────────

/**
 * Closet y Walking Closet — calculable por largo.
 * El precio cargado en catálogo corresponde a 100 cm (1 metro) de mueble
 * para ese rango de altura específico (cada rango de altura es un
 * furniture_type distinto: 210-220, 240-260, etc.)
 * Total = (Largo ÷ 100) × Precio
 */
export function calcularCloset(largo: number, precioPorMetro: number): number {
  return (largo / 100) * precioPorMetro;
}

/** Mueble de baño — igual que Base pero con precio específico por material */
export function calcularBanio(
  largo: number, precioMaterial: number, precioSobre = 0
): number {
  return calcularBase(largo, precioMaterial, precioSobre);
}

/**
 * Puerta interna — precio base + ₡1000 por cm adicional de altura sobre 210cm.
 * Guarnición, barniz y vidrio se cotizan como Extras independientes.
 */
export function calcularPuertaInterna(alto: number, precioBase: number): number {
  const extraAlto = Math.max(0, alto - 210) * 1000;
  return precioBase + extraAlto;
}

/** Puerta principal — precio base fijo */
export function calcularPuertaPrincipal(precioBase: number): number {
  return precioBase;
}

// ────────────────────────────────────────────────────────
// EXTRAS Y SERVICIOS
// ────────────────────────────────────────────────────────

export function calcularExtra(cantidad: number, precio: number): number {
  return cantidad * precio;
}

export function calcularServicio(cantidad: number, precio: number): number {
  return cantidad * precio;
}

// ────────────────────────────────────────────────────────
// DISPATCHER PRINCIPAL
// Recibe el precio ya resuelto desde la BD (por material)
// ────────────────────────────────────────────────────────

export interface FurnitureCalculationParams {
  tipo: string;                  // FurnitureTipe.nombre
  largo: number;
  alto?: number;
  ancho?: number;
  precioBase: number;            // Resuelto desde material_furniture_prices o furniture_types.precio_base
  precioSobre?: number;          // precio_m2 del sobre elegido
  estiloDoble?: 'FUNCIONAL' | 'FALSO';
  tipoCajonEspecial?: boolean;
  precioBase210?: number;        // Para AEREO_REFRI cajón especial
  costoExtraCm?: number;
  cascada?: 'NINGUNA' | 'UN_LADO' | 'AMBOS_LADOS';
}

export function calcularPrecioMueble(p: FurnitureCalculationParams): number {
  const tipo = p.tipo.toUpperCase();
  const largo = p.largo;
  const alto  = p.alto  ?? 0;
  const ancho = p.ancho ?? 0;

  switch (tipo) {
    case 'BASE':
      return calcularBase(largo, p.precioBase, p.precioSobre ?? 0);

    case 'AEREO':
      return calcularAereo(largo, alto, p.precioBase, p.estiloDoble ?? 'FUNCIONAL');

    // Mueble TV: misma fórmula que un mueble Base/Baño (largo ÷ 100 × precio), sin sobre
    case 'MUEBLE_TV':
      return calcularBase(largo, p.precioBase, 0);

    case 'TORRE':
      return calcularTorre(largo, alto, p.precioBase);

    case 'ALACENA_REFRI':
      return calcularAlacenaRefri(largo, alto, p.precioBase);

    case 'AEREO_REFRI':
      return calcularAereoRefri(largo, alto, p.precioBase,
        p.tipoCajonEspecial ?? false,
        p.precioBase210 ?? 0,
        p.costoExtraCm ?? 0);

    case 'ISLA':
      return calcularIsla(largo, ancho, alto, p.precioBase, p.precioSobre ?? 0, p.cascada ?? 'NINGUNA');

    // Closets — calculables por largo (cada rango de altura es un tipo distinto)
    case 'CLOSET_PUERTAS_210_220':
    case 'WALKING_CLOSET_ABIERTO_210_220':
    case 'CLOSET_PUERTAS_240_260':
    case 'WALKING_CLOSET_ABIERTO_240_260':
      return calcularCloset(largo, p.precioBase);

    // Muebles de baño — misma fórmula que BASE
    case 'BANIO_SUSPENDIDO':
    case 'BANIO_PISO':
      return calcularBanio(largo, p.precioBase, p.precioSobre ?? 0);

    // Puertas
    case 'PUERTA_INTERNA_MDF':
    case 'PUERTA_INTERNA_MEL':
      return calcularPuertaInterna(alto, p.precioBase);

    case 'PUERTA_PRINCIPAL_MDF':
      return calcularPuertaPrincipal(p.precioBase);

    default:
      // Genérico: largo ÷ 100 × precio
      return (largo / 100) * p.precioBase;
  }
}
