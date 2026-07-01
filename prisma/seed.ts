import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // ── ROLES ─────────────────────────────────────────────
  const adminRole = await prisma.role.upsert({
    where: { nombre: 'ADMINISTRADOR' },
    update: {},
    create: { nombre: 'ADMINISTRADOR' },
  });
  const trabajadorRole = await prisma.role.upsert({
    where: { nombre: 'TRABAJADOR' },
    update: {},
    create: { nombre: 'TRABAJADOR' },
  });
  await prisma.role.upsert({
    where: { nombre: 'EMPLEADO' },
    update: {},
    create: { nombre: 'EMPLEADO' },
  });
  console.log('✅ Roles creados (ADMINISTRADOR, TRABAJADOR, EMPLEADO)');

  // ── USUARIO ADMIN ─────────────────────────────────────
  const hashedPassword = await bcrypt.hash('Admin123!', 10);
  await prisma.user.upsert({
    where: { correo: 'admin@wmmuebles.com' },
    update: {},
    create: {
      nombre: 'Administrador',
      correo: 'admin@wmmuebles.com',
      password: hashedPassword,
      roleId: adminRole.id,
    },
  });
  console.log('✅ Usuario admin (admin@wmmuebles.com / Admin123!)');

  // ── MATERIALES ────────────────────────────────────────
  const melaminaRH = await upsertByNombre(prisma.material, 'MELAMINA_RH', {
    nombre: 'MELAMINA_RH',
    descripcion: 'Melamina Resistente a la Humedad',
  });
  const mdfRH = await upsertByNombre(prisma.material, 'MDF_RH', {
    nombre: 'MDF_RH',
    descripcion: 'MDF Resistente a la Humedad',
  });
  console.log('✅ Materiales creados (MELAMINA_RH, MDF_RH)');

  // Limpiar CUALQUIER material que no sea MELAMINA_RH o MDF_RH (de pruebas o versiones
  // anteriores del seed), siempre que no esté en uso. El catálogo de materiales debe
  // quedar fijo en solo estos dos.
  const allowedMaterialIds = [melaminaRH.id, mdfRH.id];
  const otherMaterials = await prisma.material.findMany({
    where: { id: { notIn: allowedMaterialIds } },
  });
  for (const mat of otherMaterials) {
    const usedCount = await prisma.quotationItem.count({ where: { materialId: mat.id } });
    if (usedCount === 0) {
      await (prisma as any).materialFurniturePrice.deleteMany({ where: { materialId: mat.id } });
      await prisma.material.delete({ where: { id: mat.id } });
      console.log(`🧹 Material "${mat.nombre}" eliminado (no estaba en uso)`);
    } else {
      console.log(`⚠️  Material "${mat.nombre}" tiene cotizaciones asociadas, no se eliminó`);
    }
  }

  // ── TIPOS DE MUEBLE ───────────────────────────────────
  // precio_base es el precio genérico de fallback (Melamina)
  const furnitureTypes = [
    { nombre: 'BASE',         precioBase: 185000 },
    { nombre: 'AEREO',        precioBase: 130700 },
    { nombre: 'TORRE',        precioBase: 340626 },
    { nombre: 'ISLA',         precioBase: 203500 },
    { nombre: 'AEREO_REFRI',  precioBase: 55350  },
    { nombre: 'ALACENA_REFRI',precioBase: 320626 },
    { nombre: 'MUEBLE_TV',    precioBase: 130700 },
    // Nuevos tipos
    { nombre: 'CLOSET_PUERTAS_210_220',  precioBase: 275000 },
    { nombre: 'WALKING_CLOSET_ABIERTO_210_220', precioBase: 200000 },
    { nombre: 'CLOSET_PUERTAS_240_260',  precioBase: 316250 },
    { nombre: 'WALKING_CLOSET_ABIERTO_240_260', precioBase: 230000 },
    { nombre: 'BANIO_SUSPENDIDO',        precioBase: 135000 },
    { nombre: 'BANIO_PISO',             precioBase: 205000 },
    { nombre: 'PUERTA_INTERNA_MDF',      precioBase: 210000 },
    { nombre: 'PUERTA_INTERNA_MEL',      precioBase: 185000 },
    { nombre: 'PUERTA_PRINCIPAL_MDF',    precioBase: 360000 },
  ];

  const ftMap: Record<string, string> = {};
  for (const ft of furnitureTypes) {
    const existing = await prisma.furnitureType.findFirst({ where: { nombre: ft.nombre } });
    if (existing) {
      ftMap[ft.nombre] = existing.id;
    } else {
      const created = await prisma.furnitureType.create({ data: ft });
      ftMap[ft.nombre] = created.id;
    }
  }
  console.log('✅ Tipos de mueble creados');

  // ── PRECIOS POR MATERIAL ──────────────────────────────
  // Basado en los precios del código JS original de WM Muebles
  const materialPrices: Array<{
    furnitureName: string;
    materialId: string;
    precio: number;
    precioBase210?: number;
    costoExtraCm?: number;
  }> = [
    // ── MELAMINA RH ──
    { furnitureName: 'BASE',          materialId: melaminaRH.id, precio: 185000 },
    { furnitureName: 'AEREO',         materialId: melaminaRH.id, precio: 130700 },
    { furnitureName: 'TORRE',         materialId: melaminaRH.id, precio: 340626 },
    { furnitureName: 'ISLA',          materialId: melaminaRH.id, precio: 203500 },
    { furnitureName: 'AEREO_REFRI',   materialId: melaminaRH.id, precio: 55350, precioBase210: 97000, costoExtraCm: 1500 },
    { furnitureName: 'ALACENA_REFRI', materialId: melaminaRH.id, precio: 320626 },
    { furnitureName: 'MUEBLE_TV',     materialId: melaminaRH.id, precio: 130700 },
    { furnitureName: 'BANIO_SUSPENDIDO', materialId: melaminaRH.id, precio: 135000 },
    { furnitureName: 'BANIO_PISO',    materialId: melaminaRH.id, precio: 205000 },
    // ── MDF RH ──
    { furnitureName: 'BASE',          materialId: mdfRH.id, precio: 235000 },
    { furnitureName: 'AEREO',         materialId: mdfRH.id, precio: 194684 },
    { furnitureName: 'TORRE',         materialId: mdfRH.id, precio: 459412 },
    { furnitureName: 'ISLA',          materialId: mdfRH.id, precio: 312023 },
    { furnitureName: 'AEREO_REFRI',   materialId: mdfRH.id, precio: 97345, precioBase210: 164000, costoExtraCm: 2600 },
    { furnitureName: 'ALACENA_REFRI', materialId: mdfRH.id, precio: 459412 },
    { furnitureName: 'MUEBLE_TV',     materialId: mdfRH.id, precio: 194684 },
    { furnitureName: 'BANIO_SUSPENDIDO', materialId: mdfRH.id, precio: 175000 },
    { furnitureName: 'BANIO_PISO',    materialId: mdfRH.id, precio: 255000 },

    // ── CLOSETS (precio por 100cm de largo, mismo valor para ambos materiales
    //    a menos que el admin lo ajuste luego desde el catálogo) ──
    { furnitureName: 'CLOSET_PUERTAS_210_220',          materialId: melaminaRH.id, precio: 275000 },
    { furnitureName: 'CLOSET_PUERTAS_210_220',          materialId: mdfRH.id,      precio: 275000 },
    { furnitureName: 'WALKING_CLOSET_ABIERTO_210_220',  materialId: melaminaRH.id, precio: 200000 },
    { furnitureName: 'WALKING_CLOSET_ABIERTO_210_220',  materialId: mdfRH.id,      precio: 200000 },
    { furnitureName: 'CLOSET_PUERTAS_240_260',          materialId: melaminaRH.id, precio: 316250 },
    { furnitureName: 'CLOSET_PUERTAS_240_260',          materialId: mdfRH.id,      precio: 316250 },
    { furnitureName: 'WALKING_CLOSET_ABIERTO_240_260',  materialId: melaminaRH.id, precio: 230000 },
    { furnitureName: 'WALKING_CLOSET_ABIERTO_240_260',  materialId: mdfRH.id,      precio: 230000 },
  ];

  for (const mp of materialPrices) {
    const ftId = ftMap[mp.furnitureName];
    if (!ftId) continue;
    await prisma.materialFurniturePrice.upsert({
      where: { furnitureTypeId_materialId: { furnitureTypeId: ftId, materialId: mp.materialId } },
      update: { precio: mp.precio, precioBase210: mp.precioBase210, costoExtraCm: mp.costoExtraCm },
      create: {
        furnitureTypeId: ftId,
        materialId: mp.materialId,
        precio: mp.precio,
        precioBase210: mp.precioBase210,
        costoExtraCm: mp.costoExtraCm,
      },
    });
  }
  console.log('✅ Precios por material cargados (Melamina RH y MDF RH)');

  // ── TIPOS DE SOBRE ────────────────────────────────────
  const countertops = [
    { nombre: 'GRANITO',      precioM2: 119880  }, // 222 × 540
    { nombre: 'CUARZO',       precioM2: 109080  }, // 202 × 540
    { nombre: 'PORCELANATO',  precioM2: 168480  }, // 312 × 540
  ];
  for (const ct of countertops) {
    const exists = await prisma.countertopType.findFirst({ where: { nombre: ct.nombre } });
    if (!exists) await prisma.countertopType.create({ data: ct });
  }
  console.log('✅ Tipos de sobre creados');

  // ── EXTRAS ────────────────────────────────────────────
  const extras = [
    { nombre: 'Luces LED',        precio: 15000,  unidad: 'METRO'  },
    { nombre: 'PVC Decorativo',   precio: 8000,   unidad: 'METRO'  },
    { nombre: 'Sistema Push',     precio: 12000,  unidad: 'UNIDAD' },
    { nombre: 'Herrajes Premium', precio: 25000,  unidad: 'JUEGO'  },
    { nombre: 'Brazo TV',         precio: 35000,  unidad: 'UNIDAD' },
    { nombre: 'Gavetas Especiales', precio: 45000, unidad: 'UNIDAD'},
    // Extras para puertas
    { nombre: 'Guarnición', precio: 25000, unidad: 'UNIDAD' },
    { nombre: 'Barniz',     precio: 50000, unidad: 'UNIDAD' },
    { nombre: 'Vidrio',     precio: 0,     unidad: 'UNIDAD' }, // precio se ajusta según proveedor al cotizar
  ];
  for (const extra of extras) {
    const exists = await prisma.extra.findFirst({ where: { nombre: extra.nombre } });
    if (!exists) await prisma.extra.create({ data: extra });
  }
  console.log('✅ Extras creados');

  // ── SERVICIOS ─────────────────────────────────────────
  const services = [
    { nombre: 'Transporte',   precioBase: 1700 }, // ₡1700 por km
    { nombre: 'Instalación',  precioBase: 50000 },
  ];
  for (const svc of services) {
    const exists = await prisma.service.findFirst({ where: { nombre: svc.nombre } });
    if (!exists) await prisma.service.create({ data: svc });
  }
  console.log('✅ Servicios creados');

  console.log('\n🎉 Seed completado exitosamente');
}

async function upsertByNombre(model: any, nombre: string, data: any) {
  const existing = await model.findFirst({ where: { nombre } });
  if (existing) return existing;
  return model.create({ data });
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
