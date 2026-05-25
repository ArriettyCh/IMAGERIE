import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../store/uiStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function CustomUI() {
  const { toasts, removeToast, dialog, closeDialog } = useUIStore();

  return (
    <>
      {/* Toasts */}
      <div className="fixed top-24 right-6 z-[200] flex flex-col gap-3">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className="bg-white shadow-2xl rounded-2xl p-4 flex items-center gap-3 border border-foreground/5 min-w-[280px]"
            >
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-accent" />}
              <span className="text-sm font-light tracking-wide flex-1">{toast.message}</span>
              <button onClick={() => removeToast(toast.id)} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                <X className="w-4 h-4 text-secondary" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Dialog */}
      <AnimatePresence>
        {dialog.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[210] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={closeDialog}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-serif">{dialog.title}</h3>
                  <p className="text-sm font-light text-secondary leading-relaxed">
                    {dialog.message}
                  </p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      dialog.onCancel?.();
                      closeDialog();
                    }}
                    className="flex-1 py-3 text-xs tracking-widest uppercase font-light text-secondary hover:text-foreground transition-colors"
                  >
                    {dialog.cancelLabel || 'Cancel'}
                  </button>
                  <button
                    onClick={() => {
                      dialog.onConfirm?.();
                      closeDialog();
                    }}
                    className={`flex-1 py-3 rounded-2xl text-xs tracking-widest uppercase font-medium transition-all ${
                      dialog.isDestructive
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-foreground text-white hover:bg-foreground/90'
                    }`}
                  >
                    {dialog.confirmLabel || 'Confirm'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

