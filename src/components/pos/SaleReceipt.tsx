import { BRAND_DISPLAY_NAME } from "@/config/branding";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface ReceiptItem {
  productName?: string;
  product?: { name: string };
  displayQty: number;
  displayUnit: string;
  quantityKg: number;
  unitPriceKg: number;
  discount: number;
  totalAmount: number;
}

export interface ReceiptSale {
  invoiceNo: string;
  saleDate: string;
  customer?: { name: string; phone?: string | null } | null;
  items: ReceiptItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  creditAmount: number;
  paymentMethod: string;
}

function paymentLabel(method: string): string {
  if (method === "BANK_TRANSFER") return "BANK";
  return method.replace(/_/g, " ");
}

/** 80 mm thermal ticket — screen preview matches print width. */
export function SaleReceipt({ sale }: { sale: ReceiptSale }) {
  return (
    <div
      className="thermal-receipt box-border w-[80mm] max-w-[80mm] bg-white px-[3mm] py-[2mm] font-mono text-[11px] leading-tight text-black antialiased print:text-[11px] print:shadow-none"
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
    >
      <div className="border-b border-dashed border-black pb-2 text-center">
        <p className="break-words text-[12px] font-bold uppercase leading-snug">{BRAND_DISPLAY_NAME}</p>
        <p className="mt-1 text-[10px] font-semibold tracking-wide">SALES RECEIPT</p>
      </div>

      <div className="mt-2 space-y-0.5 border-b border-dashed border-black pb-2 text-[10px]">
        <div className="flex justify-between gap-2">
          <span className="shrink-0 text-gray-600">Invoice</span>
          <span className="min-w-0 break-all text-right font-semibold">{sale.invoiceNo}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="shrink-0 text-gray-600">Date</span>
          <span className="min-w-0 text-right">{formatDateTime(sale.saleDate)}</span>
        </div>
        {sale.customer ? (
          <div className="pt-0.5">
            <span className="text-gray-600">Customer: </span>
            <span className="break-words font-medium">{sale.customer.name}</span>
            {sale.customer.phone ? (
              <div className="text-[9px] text-gray-600">{sale.customer.phone}</div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-2 space-y-2 border-b border-dashed border-black pb-2">
        {sale.items.map((item, i) => {
          const name = item.productName ?? item.product?.name ?? "Item";
          return (
            <div key={i} className="border-b border-dotted border-gray-400 pb-2 last:border-0 last:pb-0">
              <p className="break-words font-semibold">{name}</p>
              <div className="mt-0.5 flex justify-between gap-2 text-[10px]">
                <span className="min-w-0 text-gray-700">
                  {item.displayQty} {item.displayUnit} × {formatCurrency(item.unitPriceKg)}
                  {item.discount > 0 ? ` (−${item.discount}%)` : ""}
                </span>
                <span className="shrink-0 font-semibold">{formatCurrency(item.totalAmount)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 space-y-1 text-[10px]">
        <div className="flex justify-between gap-2">
          <span>Subtotal</span>
          <span>{formatCurrency(sale.subtotal)}</span>
        </div>
        {Number(sale.discountAmount) > 0 ? (
          <div className="flex justify-between gap-2">
            <span>Discount</span>
            <span>−{formatCurrency(sale.discountAmount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between gap-2 border-t border-black pt-1 text-[12px] font-bold">
          <span>TOTAL</span>
          <span>{formatCurrency(sale.totalAmount)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="min-w-0">Paid ({paymentLabel(sale.paymentMethod)})</span>
          <span className="shrink-0">{formatCurrency(sale.paidAmount)}</span>
        </div>
        {Number(sale.changeAmount) > 0 ? (
          <div className="flex justify-between gap-2 font-semibold">
            <span>Change</span>
            <span>{formatCurrency(sale.changeAmount)}</span>
          </div>
        ) : null}
        {Number(sale.creditAmount) > 0 ? (
          <div className="flex justify-between gap-2 font-semibold">
            <span>Credit</span>
            <span>{formatCurrency(sale.creditAmount)}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-3 border-t border-dashed border-black pt-2 text-center text-[9px] text-gray-600">
        Thank you — please come again
      </div>
    </div>
  );
}
