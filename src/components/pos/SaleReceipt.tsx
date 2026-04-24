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

interface ReceiptSale {
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

export function SaleReceipt({ sale }: { sale: ReceiptSale }) {
  return (
    <div className="mx-auto max-w-sm bg-white p-6 font-mono text-sm print:shadow-none shadow-md rounded">
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold">RICE POS</h1>
        <p className="text-xs text-gray-500">Sales Invoice</p>
        <div className="border-b border-dashed my-2" />
        <p className="text-xs">Invoice: <strong>{sale.invoiceNo}</strong></p>
        <p className="text-xs text-gray-500">{formatDateTime(sale.saleDate)}</p>
        {sale.customer && <p className="text-xs mt-1">Customer: <strong>{sale.customer.name}</strong></p>}
      </div>

      <div className="border-b border-dashed mb-2" />

      <div className="space-y-1 mb-3">
        {sale.items.map((item, i) => {
          const name = item.productName ?? item.product?.name ?? "";
          return (
            <div key={i}>
              <div className="flex justify-between">
                <span className="text-xs truncate flex-1">{name}</span>
                <span className="text-xs font-medium ml-2">{formatCurrency(item.totalAmount)}</span>
              </div>
              <div className="text-xs text-gray-400 pl-2">
                {item.displayQty} {item.displayUnit} ({Number(item.quantityKg).toFixed(2)} Kg) × {formatCurrency(item.unitPriceKg)}/Kg
                {item.discount > 0 && ` (${item.discount}% off)`}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-dashed pt-2 space-y-0.5">
        <div className="flex justify-between text-xs">
          <span>Subtotal</span><span>{formatCurrency(sale.subtotal)}</span>
        </div>
        {Number(sale.discountAmount) > 0 && (
          <div className="flex justify-between text-xs text-red-600">
            <span>Discount</span><span>-{formatCurrency(sale.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold border-t pt-1 mt-1">
          <span>Total</span><span>{formatCurrency(sale.totalAmount)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Paid ({sale.paymentMethod})</span><span>{formatCurrency(sale.paidAmount)}</span>
        </div>
        {Number(sale.changeAmount) > 0 && (
          <div className="flex justify-between text-xs text-green-600">
            <span>Change</span><span>{formatCurrency(sale.changeAmount)}</span>
          </div>
        )}
        {Number(sale.creditAmount) > 0 && (
          <div className="flex justify-between text-xs text-orange-600 font-medium">
            <span>Credit Balance</span><span>{formatCurrency(sale.creditAmount)}</span>
          </div>
        )}
      </div>

      <div className="text-center mt-4 text-xs text-gray-400 border-t pt-2">
        Thank you for your business!
      </div>
    </div>
  );
}
