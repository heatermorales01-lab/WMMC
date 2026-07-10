import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError } from '@/lib/errors';
import { PrismaClient, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";


export const PATCH = withAdmin(async (req, { params }) => {
  try {
    const { stockActual, stockMinimo} = await req.json();
      const item = await prisma.inventoryItem.update({
          where: { id: params.id },
          data: {
              stockActual: new Decimal(stockActual),
              stockMinimo: new Decimal(stockMinimo),
          },
      });
    return NextResponse.json({ ok: true, data: item });
  } catch (e) { return handleError(e); }
});
