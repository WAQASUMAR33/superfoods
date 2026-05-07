export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fromKg, Unit } from "@/lib/units";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const purchaseId = Number((await params).id);
  if (Number.isNaN(purchaseId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { items: { include: { product: { select: { name: true, code: true } } }, orderBy: { id: "asc" } } },
  });
  if (!purchase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prior = await prisma.purchaseReturnItem.groupBy({
    by: ["purchaseItemId"],
    where: { purchaseReturn: { purchaseId } },
    _sum: { quantityKg: true },
  });
  const priorMap = new Map(prior.map((p) => [p.purchaseItemId, Number(p._sum.quantityKg ?? 0)]));

  const items = purchase.items.map((it) => {
    const maxKg = Math.max(0, Number(it.quantityKg) - (priorMap.get(it.id) ?? 0));
    const unit = it.displayUnit as Unit;
    const maxDisplayQty = fromKg(maxKg, unit);
    return {
      purchaseItemId: it.id,
      productId: it.productId,
      productName: it.product.name,
      productCode: it.product.code,
      displayUnit: it.displayUnit,
      maxDisplayQty,
      quantityKgPurchased: Number(it.quantityKg),
    };
  });

  return NextResponse.json({
    purchaseId: purchase.id,
    invoiceNo: purchase.invoiceNo,
    internalRef: purchase.internalRef,
    supplierId: purchase.supplierId,
    items,
  });
}
