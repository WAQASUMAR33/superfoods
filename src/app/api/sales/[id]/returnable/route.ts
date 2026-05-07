export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fromKg, Unit } from "@/lib/units";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const saleId = Number((await params).id);
  if (Number.isNaN(saleId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: { include: { product: { select: { name: true, code: true } } }, orderBy: { id: "asc" } } },
  });
  if (!sale) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prior = await prisma.saleReturnItem.groupBy({
    by: ["saleItemId"],
    where: { saleReturn: { saleId } },
    _sum: { quantityKg: true },
  });
  const priorMap = new Map(prior.map((p) => [p.saleItemId, Number(p._sum.quantityKg ?? 0)]));

  const items = sale.items.map((it) => {
    const maxKg = Math.max(0, Number(it.quantityKg) - (priorMap.get(it.id) ?? 0));
    const unit = it.displayUnit as Unit;
    const maxDisplayQty = fromKg(maxKg, unit);
    return {
      saleItemId: it.id,
      productId: it.productId,
      productName: it.product.name,
      productCode: it.product.code,
      displayUnit: it.displayUnit,
      maxDisplayQty,
      quantityKgSold: Number(it.quantityKg),
    };
  });

  return NextResponse.json({
    saleId: sale.id,
    invoiceNo: sale.invoiceNo,
    customerId: sale.customerId,
    paymentMethod: sale.paymentMethod,
    creditAmount: Number(sale.creditAmount),
    status: sale.status,
    items,
  });
}
