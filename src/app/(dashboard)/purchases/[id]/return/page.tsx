import { notFound } from "next/navigation";
import { PurchaseReturnForm } from "@/components/returns/PurchaseReturnForm";

export default async function PurchaseReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const purchaseId = Number((await params).id);
  if (Number.isNaN(purchaseId)) notFound();

  return <PurchaseReturnForm purchaseId={purchaseId} />;
}
