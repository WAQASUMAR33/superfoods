import { z } from "zod";
import { Unit } from "@/lib/units";

// ─── PRODUCT ─────────────────────────────────────────────────────────────────

export const ProductSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  variety: z.string().min(1),
  grainLength: z.string().optional(),
  brandId: z.number().optional(),
  defaultUnit: z.enum(["KG", "MAUND", "BAG"]),
  salePrice: z.number().min(0),
  purchasePrice: z.number().min(0),
  lowStockThresholdKg: z.number().min(0),
  notes: z.string().optional(),
});

export type ProductFormData = z.infer<typeof ProductSchema>;

// ─── PURCHASE ─────────────────────────────────────────────────────────────────

export const PurchaseItemSchema = z.object({
  productId: z.number(),
  displayUnit: z.enum(["KG", "MAUND", "BAG"]),
  displayQty: z.number().min(0.001),
  unitCostKg: z.number().min(0),
  bagWeight: z.number().optional(),
});

export const PurchaseSchema = z.object({
  invoiceNo: z.string().min(1),
  supplierId: z.number(),
  purchaseDate: z.string(),
  items: z.array(PurchaseItemSchema).min(1),
  discount: z.number().min(0).default(0),
  moisturePercent: z.number().min(0).max(100).optional(),
  qualityGrade: z.string().optional(),
  qualityNotes: z.string().optional(),
  vehicleNo: z.string().optional(),
  driverName: z.string().optional(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE", "CREDIT"]),
  paidAmount: z.number().min(0).default(0),
  paymentReference: z.string().optional(),
});

export type PurchaseFormData = z.infer<typeof PurchaseSchema>;

// ─── SALE ─────────────────────────────────────────────────────────────────────

export const SaleItemSchema = z.object({
  productId: z.number(),
  displayUnit: z.enum(["KG", "MAUND", "BAG"]),
  displayQty: z.number().min(0.001),
  unitPriceKg: z.number().min(0),
  discount: z.number().min(0).max(100).default(0),
});

export const SaleSchema = z.object({
  customerId: z.number().optional(),
  items: z.array(SaleItemSchema).min(1),
  discountAmount: z.number().min(0).default(0),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE", "CREDIT"]),
  paidAmount: z.number().min(0),
  notes: z.string().optional(),
});

export type SaleFormData = z.infer<typeof SaleSchema>;

// ─── EXPENSE ──────────────────────────────────────────────────────────────────

export const ExpenseSchema = z.object({
  categoryId: z.number(),
  amount: z.number().min(0.01),
  description: z.string().optional(),
  expenseDate: z.string(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE", "CREDIT"]),
  reference: z.string().optional(),
});

export type ExpenseFormData = z.infer<typeof ExpenseSchema>;

// ─── CART (POS) ───────────────────────────────────────────────────────────────

export interface CartItem {
  productId: number;
  productCode: string;
  productName: string;
  displayUnit: Unit;
  displayQty: number;
  quantityKg: number;
  unitPriceKg: number;
  discount: number;
  lineTotal: number;
  stockKg: number;
}

export interface CartState {
  items: CartItem[];
  customerId: number | null;
  customerName: string;
  globalDiscount: number;
  paymentMethod: "CASH" | "BANK_TRANSFER" | "CHEQUE" | "CREDIT";
  paidAmount: number;
  notes: string;
}

export type CartAction =
  | { type: "ADD_ITEM"; product: { id: number; code: string; name: string; salePrice: number; stockKg: number; defaultUnit: Unit } }
  | { type: "REMOVE_ITEM"; productId: number }
  | { type: "UPDATE_QTY"; productId: number; displayQty: number; unit: Unit }
  | { type: "CHANGE_UNIT"; productId: number; unit: Unit }
  | { type: "SET_ITEM_DISCOUNT"; productId: number; discount: number }
  | { type: "SET_CUSTOMER"; customerId: number | null; customerName: string }
  | { type: "SET_GLOBAL_DISCOUNT"; discount: number }
  | { type: "SET_PAYMENT_METHOD"; method: CartState["paymentMethod"] }
  | { type: "SET_PAID_AMOUNT"; amount: number }
  | { type: "SET_NOTES"; notes: string }
  | { type: "CLEAR_CART" };
