import { create } from 'zustand';

export interface CartItem {
  id: string;
  itemType: 'service' | 'product';
  serviceId?: string;
  productId?: string;
  name: string;
  price: number;
  duration?: number;
  quantity: number;
  stock?: number;
  collaboratorId: string;
}

export interface SplitPaymentItem {
  method: 'cash' | 'card' | 'transfer';
  amount: number;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  type: 'discount_pct' | 'discount_fixed' | 'free_service';
  value: string;
  serviceId?: string;
}

interface POSStore {
  cart: CartItem[];
  selectedClientId: string;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'credit' | 'split';
  splitPayments: SplitPaymentItem[];
  discountAmount: number;
  discountPercent: number;
  tipAmount: number;
  depositAmount: number;
  depositPaymentMethod: 'cash' | 'card' | 'transfer';
  notes: string;
  linkedAppointmentId: string | null;

  loyaltyBalance: number;
  availableRewards: LoyaltyReward[];
  appliedReward: LoyaltyReward | null;

  // Actions
  addToCart: (itemData: any, type: 'service' | 'product') => void;
  updateQuantity: (cartId: string, delta: number) => void;
  updateItemCollaborator: (cartId: string, collaboratorId: string) => void;
  removeFromCart: (cartId: string) => void;
  clearCart: () => void;
  setSelectedClientId: (clientId: string) => void;
  setPaymentMethod: (method: 'cash' | 'card' | 'transfer' | 'credit' | 'split') => void;
  setSplitPayments: (payments: SplitPaymentItem[]) => void;
  setDiscount: (amount: number, percent: number) => void;
  setTipAmount: (amount: number) => void;
  setDepositAmount: (amount: number) => void;
  setDepositPaymentMethod: (method: 'cash' | 'card' | 'transfer') => void;
  setNotes: (notes: string) => void;
  setLinkedAppointmentId: (id: string | null) => void;

  setLoyaltyData: (balance: number, rewards: LoyaltyReward[]) => void;
  applyLoyaltyReward: (reward: LoyaltyReward | null) => void;
  getLoyaltyDiscount: () => number;

  // Calculations
  getCartSubtotal: () => number;
  getCalculatedDiscount: () => number;
  getFinalTotal: () => number;

  // Pre-populate cart from pending appointment or service
  populateFromPending: (
    pending: { clientId?: string; serviceId?: string; collaboratorId?: string; appointmentId?: string },
    services: any[]
  ) => void;
}

export const usePOSStore = create<POSStore>((set, get) => ({
  cart: [],
  selectedClientId: '',
  paymentMethod: 'cash',
  splitPayments: [],
  discountAmount: 0,
  discountPercent: 0,
  tipAmount: 0,
  depositAmount: 0,
  depositPaymentMethod: 'cash',
  notes: '',
  linkedAppointmentId: null,

  loyaltyBalance: 0,
  availableRewards: [],
  appliedReward: null,

  addToCart: (itemData, type) => {
    const isService = type === 'service';
    const cartId = `${itemData.id}-${Date.now()}`;
    const newItem: CartItem = {
      id: cartId,
      itemType: type,
      serviceId: isService ? itemData.id : undefined,
      productId: !isService ? itemData.id : undefined,
      name: itemData.name,
      price: typeof itemData.price === 'string' ? parseFloat(itemData.price) : itemData.price,
      duration: isService ? itemData.duration : undefined,
      stock: !isService ? (parseInt(itemData.stock, 10) || 0) : undefined,
      quantity: 1,
      collaboratorId: '',
    };
    set((state) => ({ cart: [...state.cart, newItem] }));
  },

  updateQuantity: (cartId, delta) => {
    set((state) => ({
      cart: state.cart
        .map((item) => {
          if (item.id === cartId) {
            const nextQty = item.quantity + delta;
            if (item.itemType === 'product' && item.stock !== undefined && nextQty > item.stock) {
              alert(`Solo hay ${item.stock} unidades disponibles en inventario de este producto.`);
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0),
    }));
  },

  updateItemCollaborator: (cartId, collaboratorId) => {
    set((state) => ({
      cart: state.cart.map((item) => (item.id === cartId ? { ...item, collaboratorId } : item)),
    }));
  },

  removeFromCart: (cartId) => {
    set((state) => ({
      cart: state.cart.filter((item) => item.id !== cartId),
    }));
  },

  clearCart: () =>
    set({
      cart: [],
      selectedClientId: '',
      notes: '',
      paymentMethod: 'cash',
      splitPayments: [],
      discountAmount: 0,
      discountPercent: 0,
      tipAmount: 0,
      depositAmount: 0,
      depositPaymentMethod: 'cash',
      linkedAppointmentId: null,
      loyaltyBalance: 0,
      availableRewards: [],
      appliedReward: null,
    }),

  setSelectedClientId: (selectedClientId) => set({ selectedClientId }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setSplitPayments: (splitPayments) => set({ splitPayments }),
  setDiscount: (discountAmount, discountPercent) => set({ discountAmount, discountPercent }),
  setTipAmount: (tipAmount) => set({ tipAmount }),
  setDepositAmount: (depositAmount) => set({ depositAmount }),
  setDepositPaymentMethod: (depositPaymentMethod) => set({ depositPaymentMethod }),
  setNotes: (notes) => set({ notes }),
  setLinkedAppointmentId: (linkedAppointmentId) => set({ linkedAppointmentId }),

  setLoyaltyData: (loyaltyBalance, availableRewards) => set({ loyaltyBalance, availableRewards }),
  applyLoyaltyReward: (appliedReward) => set({ appliedReward }),

  getLoyaltyDiscount: () => {
    const reward = get().appliedReward;
    if (!reward) return 0;

    const subtotal = get().getCartSubtotal();

    if (reward.type === 'discount_pct') {
      return (subtotal * parseFloat(reward.value)) / 100;
    }
    if (reward.type === 'discount_fixed') {
      return Math.min(parseFloat(reward.value), subtotal);
    }
    if (reward.type === 'free_service' && reward.serviceId) {
      const freeServiceItem = get().cart.find(
        item => item.serviceId === reward.serviceId
      );
      if (freeServiceItem) {
        return Math.min(freeServiceItem.price * freeServiceItem.quantity, subtotal);
      }
    }
    return 0;
  },

  getCartSubtotal: () => {
    return get().cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  getCalculatedDiscount: () => {
    const subtotal = get().getCartSubtotal();
    const percent = get().discountPercent;
    const fixed = get().discountAmount;

    if (percent > 0) {
      return (subtotal * percent) / 100;
    }
    return Math.min(fixed, subtotal);
  },

  getFinalTotal: () => {
    const subtotal = get().getCartSubtotal();
    const discount = get().getCalculatedDiscount();
    const loyaltyDiscount = get().getLoyaltyDiscount();
    const tip = get().tipAmount;
    return Math.max(0, subtotal - discount - loyaltyDiscount + tip);
  },

  populateFromPending: (pending, services) => {
    if (pending.appointmentId) {
      set({ linkedAppointmentId: pending.appointmentId });
    }
    if (pending.clientId) {
      set({ selectedClientId: pending.clientId });
    }
    if (pending.serviceId) {
      const targetService = services.find((s: any) => s.id === pending.serviceId);
      if (targetService) {
        const cartId = `service-${targetService.id}`;
        const newItem: CartItem = {
          id: cartId,
          itemType: 'service',
          serviceId: targetService.id,
          name: targetService.name,
          price: typeof targetService.price === 'string' ? parseFloat(targetService.price) : targetService.price,
          duration: targetService.duration,
          quantity: 1,
          collaboratorId: pending.collaboratorId || '',
        };
        set({ cart: [newItem] });
      }
    }
  },
}));
