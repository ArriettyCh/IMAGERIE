import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface Dialog {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  isDestructive?: boolean;
}

interface UIStore {
  toasts: Toast[];
  dialog: Dialog;
  searchQuery: string;
  isAiSearchMode: boolean;
  isSearching: boolean;
  searchTrigger: number;
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  showConfirm: (options: Omit<Dialog, 'isOpen'>) => void;
  closeDialog: () => void;
  setSearchQuery: (query: string) => void;
  setIsAiSearchMode: (isAi: boolean) => void;
  setIsSearching: (isSearching: boolean) => void;
  triggerSearch: (isAi?: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  toasts: [],
  dialog: {
    isOpen: false,
    title: '',
    message: '',
  },
  searchQuery: '',
  isAiSearchMode: false,
  isSearching: false,
  searchTrigger: 0,
  addToast: (message, type = 'success') => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  showConfirm: (options) =>
    set({
      dialog: { ...options, isOpen: true },
    }),
  closeDialog: () =>
    set((state) => ({
      dialog: { ...state.dialog, isOpen: false },
    })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsAiSearchMode: (isAi) => set({ isAiSearchMode: isAi }),
  setIsSearching: (isSearching) => set({ isSearching: isSearching }),
  triggerSearch: (isAi = false) => set((state) => ({
    searchTrigger: state.searchTrigger + 1,
    isAiSearchMode: isAi
  })),
}));

