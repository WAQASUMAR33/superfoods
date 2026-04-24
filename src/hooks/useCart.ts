import { useReducer } from "react";
import { CartState, CartAction, CartItem } from "@/types";
import { toKg, fromKg, Unit } from "@/lib/units";

const initialState: CartState = {
  items: [],
  customerId: null,
  customerName: "",
  globalDiscount: 0,
  paymentMethod: "CASH",
  paidAmount: 0,
  notes: "",
};

function calcLineTotal(item: CartItem): number {
  return item.quantityKg * item.unitPriceKg * (1 - item.discount / 100);
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find((i) => i.productId === action.product.id);
      if (existing) {
        const items = state.items.map((i) =>
          i.productId === action.product.id
            ? { ...i, displayQty: i.displayQty + 1, quantityKg: toKg(i.displayQty + 1, i.displayUnit), lineTotal: calcLineTotal({ ...i, displayQty: i.displayQty + 1, quantityKg: toKg(i.displayQty + 1, i.displayUnit) }) }
            : i
        );
        return { ...state, items };
      }
      const defaultUnit = action.product.defaultUnit;
      const newItem: CartItem = {
        productId: action.product.id,
        productCode: action.product.code,
        productName: action.product.name,
        displayUnit: defaultUnit,
        displayQty: 1,
        quantityKg: toKg(1, defaultUnit),
        unitPriceKg: action.product.salePrice,
        discount: 0,
        lineTotal: toKg(1, defaultUnit) * action.product.salePrice,
        stockKg: action.product.stockKg,
      };
      return { ...state, items: [...state.items, newItem] };
    }

    case "REMOVE_ITEM":
      return { ...state, items: state.items.filter((i) => i.productId !== action.productId) };

    case "UPDATE_QTY": {
      const items = state.items.map((i) => {
        if (i.productId !== action.productId) return i;
        const quantityKg = toKg(action.displayQty, action.unit);
        return { ...i, displayQty: action.displayQty, displayUnit: action.unit, quantityKg, lineTotal: calcLineTotal({ ...i, quantityKg }) };
      });
      return { ...state, items };
    }

    case "CHANGE_UNIT": {
      const items = state.items.map((i) => {
        if (i.productId !== action.productId) return i;
        const displayQty = fromKg(i.quantityKg, action.unit);
        return { ...i, displayUnit: action.unit, displayQty };
      });
      return { ...state, items };
    }

    case "SET_ITEM_DISCOUNT": {
      const items = state.items.map((i) => {
        if (i.productId !== action.productId) return i;
        return { ...i, discount: action.discount, lineTotal: calcLineTotal({ ...i, discount: action.discount }) };
      });
      return { ...state, items };
    }

    case "SET_CUSTOMER":
      return { ...state, customerId: action.customerId, customerName: action.customerName };

    case "SET_GLOBAL_DISCOUNT":
      return { ...state, globalDiscount: action.discount };

    case "SET_PAYMENT_METHOD":
      return { ...state, paymentMethod: action.method };

    case "SET_PAID_AMOUNT":
      return { ...state, paidAmount: action.amount };

    case "SET_NOTES":
      return { ...state, notes: action.notes };

    case "CLEAR_CART":
      return initialState;

    default:
      return state;
  }
}

export function useCart() {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const subtotal = state.items.reduce((sum, i) => sum + i.lineTotal, 0);
  const discountAmount = (subtotal * state.globalDiscount) / 100;
  const total = subtotal - discountAmount;
  const change = state.paymentMethod === "CASH" ? Math.max(0, state.paidAmount - total) : 0;

  return { state, dispatch, subtotal, discountAmount, total, change };
}
