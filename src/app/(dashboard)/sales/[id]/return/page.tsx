import { notFound } from "next/navigation";
import { SaleReturnForm } from "@/components/returns/SaleReturnForm";

export default async function SaleReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const saleId = Number((await params).id);
  if (Number.isNaN(saleId)) notFound();

  return <SaleReturnForm saleId={saleId} />;
}
