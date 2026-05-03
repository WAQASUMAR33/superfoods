"use client";

import { useState, useRef } from "react";
import { Search, X, Plus, Minus, Printer, Check, LayoutGrid, ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { Unit, UNIT_OPTIONS, formatDisplay } from "@/lib/units";
import { formatCurrency } from "@/lib/utils";
import { SaleReceipt } from "./SaleReceipt";

interface Product {
  id: number; code: string; name: string; variety: string;
  defaultUnit: string; salePrice: number; stockKg: number;
  lowStockThresholdKg: number; brand?: { name: string } | null;
}
interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  creditLimit: number;
}

interface Props {
  products: Product[];
  customers: Customer[];
}

export function POSTerminal({ products, customers }: Props) {
  const { state, dispatch, subtotal, discountAmount, total, change } = useCart();
  const [search, setSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lastSale, setLastSale] = useState<unknown>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [mobileTab, setMobileTab] = useState<"products" | "cart">("products");
  const receiptRef = useRef<HTMLDivElement>(null);

  const filtered = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.variety.toLowerCase().includes(q);
  });

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  async function handleCheckout() {
    if (state.items.length === 0) return;
    setError("");
    setSaving(true);

    const payload = {
      customerId: state.customerId ?? undefined,
      items: state.items.map((i) => ({
        productId: i.productId,
        displayUnit: i.displayUnit,
        displayQty: i.displayQty,
        unitPriceKg: i.unitPriceKg,
        discount: i.discount,
      })),
      discountAmount,
      serviceChargeAmount: state.serviceChargeAmount,
      paymentMethod: state.paymentMethod,
      paidAmount: state.paidAmount,
      notes: state.notes,
    };

    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (res.ok) {
      const sale = await res.json();
      setLastSale(sale);
      setShowReceipt(true);
    } else {
      const err = await res.json();
      setError(err.error ?? "Failed to complete sale");
    }
  }

  function handleNewSale() {
    dispatch({ type: "CLEAR_CART" });
    setShowReceipt(false);
    setLastSale(null);
    setSearch("");
    setMobileTab("products");
  }

  if (showReceipt && lastSale) {
    return (
      <div className="flex flex-col h-full bg-gray-100">
        <div className="flex items-center gap-3 p-4 bg-white border-b">
          <div className="flex-1 flex items-center gap-2 text-green-600 font-semibold">
            <Check className="h-5 w-5" /> Sale Completed
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
            <Printer className="h-4 w-4" /> Print
          </button>
          <button onClick={handleNewSale} className="rounded bg-green-600 px-3 py-1.5 text-sm text-white">
            New Sale
          </button>
        </div>
        <div ref={receiptRef} className="flex-1 overflow-y-auto p-4">
          <SaleReceipt sale={lastSale as Parameters<typeof SaleReceipt>[0]["sale"]} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-gray-100">
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Product search + grid */}
        <div className={`flex-col overflow-hidden flex-1 ${mobileTab === "cart" ? "hidden md:flex" : "flex"}`}>
          <div className="bg-white border-b p-3 flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, code or variety..."
                className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length} items</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 content-start">
            {filtered.map((p) => {
              const isLow = p.stockKg <= p.lowStockThresholdKg;
              const isOut = p.stockKg <= 0;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    dispatch({ type: "ADD_ITEM", product: { id: p.id, code: p.code, name: p.name, salePrice: p.salePrice, stockKg: p.stockKg, defaultUnit: p.defaultUnit as Unit } });
                    setMobileTab("cart");
                  }}
                  disabled={isOut}
                  className={`rounded-lg border bg-white p-3 text-left shadow-sm hover:border-blue-400 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isOut ? "border-red-200" : isLow ? "border-yellow-300" : "border-gray-200"}`}
                >
                  <p className="text-xs text-gray-400 font-mono">{p.code}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5 leading-tight">{p.name}</p>
                  <p className="text-xs text-gray-500 truncate">{p.variety}{p.brand ? ` • ${p.brand.name}` : ""}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-blue-600">{formatCurrency(p.salePrice)}<span className="text-xs font-normal text-gray-400">/kg</span></span>
                    <span className={`text-xs font-medium ${isOut ? "text-red-600" : isLow ? "text-yellow-600" : "text-green-600"}`}>
                      {isOut ? "OUT" : formatDisplay(p.stockKg, "KG")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Cart */}
        <div className={`flex-col bg-white overflow-hidden md:border-l ${mobileTab === "products" ? "hidden md:flex md:w-96 md:flex-none" : "flex flex-1 md:w-96 md:flex-none"}`}>
          {/* Customer picker */}
          <div className="p-3 border-b relative">
            <input
              value={state.customerId ? state.customerName : customerSearch}
              onChange={(e) => {
                if (state.customerId) {
                  dispatch({ type: "SET_CUSTOMER", customerId: null, customerName: "" });
                }
                setCustomerSearch(e.target.value);
                setShowCustomerList(true);
              }}
              onFocus={() => setShowCustomerList(true)}
              placeholder="Search customer (or walk-in)..."
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {state.customerId && (
              <button onClick={() => dispatch({ type: "SET_CUSTOMER", customerId: null, customerName: "" })} className="absolute right-6 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
            {showCustomerList && !state.customerId && (
              <div className="absolute left-3 right-3 top-full mt-1 z-10 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                {filteredCustomers.map((c) => (
                  <button key={c.id} onClick={() => { dispatch({ type: "SET_CUSTOMER", customerId: c.id, customerName: c.name }); setShowCustomerList(false); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex justify-between">
                    <span>{c.name}</span>
                    <span className="text-xs text-gray-400">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {state.items.length === 0 && (
              <div className="text-center text-sm text-gray-400 py-8">No items in cart.<br />Click a product to add.</div>
            )}
            {state.items.map((item) => (
              <div key={item.productId} className="rounded-md border border-gray-100 bg-gray-50 p-2.5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{item.productName}</p>
                    <p className="text-xs text-gray-400">{item.productCode}</p>
                  </div>
                  <button onClick={() => dispatch({ type: "REMOVE_ITEM", productId: item.productId })} className="ml-2 text-gray-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={item.displayUnit}
                    onChange={(e) => dispatch({ type: "CHANGE_UNIT", productId: item.productId, unit: e.target.value as Unit })}
                    className="rounded border border-gray-300 px-1 py-0.5 text-xs"
                  >
                    {UNIT_OPTIONS.map((u) => <option key={u.value} value={u.value}>{u.value}</option>)}
                  </select>

                  <div className="flex items-center border rounded">
                    <button onClick={() => dispatch({ type: "UPDATE_QTY", productId: item.productId, displayQty: Math.max(0.5, item.displayQty - (item.displayUnit === "KG" ? 5 : 1)), unit: item.displayUnit })}
                      className="px-2 py-0.5 hover:bg-gray-100"><Minus className="h-3 w-3" /></button>
                    <input
                      type="number"
                      value={item.displayQty}
                      onChange={(e) => dispatch({ type: "UPDATE_QTY", productId: item.productId, displayQty: Number(e.target.value), unit: item.displayUnit })}
                      className="w-14 text-center text-xs border-x py-0.5 focus:outline-none"
                      step={item.displayUnit === "KG" ? 5 : 1}
                      min={0.001}
                    />
                    <button onClick={() => dispatch({ type: "UPDATE_QTY", productId: item.productId, displayQty: item.displayQty + (item.displayUnit === "KG" ? 5 : 1), unit: item.displayUnit })}
                      className="px-2 py-0.5 hover:bg-gray-100"><Plus className="h-3 w-3" /></button>
                  </div>

                  <span className="text-xs text-gray-400">{item.quantityKg.toFixed(2)} Kg</span>
                </div>

                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-xs text-gray-500">@ {formatCurrency(item.unitPriceKg)}/Kg</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(item.lineTotal)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Discount %</span>
              <input type="number" min={0} max={100} value={state.globalDiscount}
                onChange={(e) => dispatch({ type: "SET_GLOBAL_DISCOUNT", discount: Number(e.target.value) })}
                className="w-16 rounded border px-2 py-0.5 text-xs text-right" />
              <span className="ml-auto text-sm text-red-500">-{formatCurrency(discountAmount)}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Service charge</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={state.serviceChargeAmount || ""}
                onChange={(e) =>
                  dispatch({ type: "SET_SERVICE_CHARGE", amount: Number(e.target.value) || 0 })
                }
                className="flex-1 rounded border px-2 py-0.5 text-xs text-right"
                placeholder="0"
              />
            </div>

            <div className="flex justify-between border-t pt-2">
              <span className="font-bold text-gray-900">Total</span>
              <span className="text-lg font-bold text-blue-700">{formatCurrency(total)}</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex gap-1">
                {(["CASH", "CREDIT", "BANK_TRANSFER"] as const).map((m) => (
                  <button key={m} onClick={() => dispatch({ type: "SET_PAYMENT_METHOD", method: m })}
                    className={`flex-1 rounded py-1 text-xs font-medium border ${state.paymentMethod === m ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}>
                    {m === "BANK_TRANSFER" ? "BANK" : m}
                  </button>
                ))}
              </div>

              {state.paymentMethod !== "CREDIT" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Received</span>
                  <input type="number" value={state.paidAmount || ""}
                    onChange={(e) => dispatch({ type: "SET_PAID_AMOUNT", amount: Number(e.target.value) })}
                    placeholder={formatCurrency(total)}
                    className="flex-1 rounded border px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}

              {change > 0 && (
                <div className="flex justify-between text-sm font-medium text-green-700 bg-green-50 rounded px-2 py-1">
                  <span>Change</span><span>{formatCurrency(change)}</span>
                </div>
              )}
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{error}</p>}

            <button
              onClick={handleCheckout}
              disabled={saving || state.items.length === 0}
              className="w-full rounded-lg bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Processing..." : `COMPLETE SALE — ${formatCurrency(total)}`}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="flex flex-shrink-0 border-t border-gray-200 bg-white md:hidden">
        <button
          onClick={() => setMobileTab("products")}
          className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition ${
            mobileTab === "products" ? "text-blue-600" : "text-gray-500"
          }`}
        >
          <LayoutGrid className="h-5 w-5" />
          Products
        </button>
        <button
          onClick={() => setMobileTab("cart")}
          className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition ${
            mobileTab === "cart" ? "text-green-600" : "text-gray-500"
          }`}
        >
          <ShoppingBag className="h-5 w-5" />
          {state.items.length > 0 && (
            <span className="absolute right-1/4 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {state.items.length}
            </span>
          )}
          Cart{state.items.length > 0 ? ` (${state.items.length})` : ""}
        </button>
      </div>
    </div>
  );
}
