"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, LogOut } from "lucide-react";

export function LogoutConfirmModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.18)" }}
            >
              {/* Top accent bar */}
              <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #e8470a, #0033a0)" }} />

              <div className="p-6 text-center">
                {/* Icon */}
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "linear-gradient(135deg, #fff1ec, #fde8e8)" }}
                >
                  <LogOut size={28} style={{ color: "#e8470a" }} />
                </div>

                <h2 className="text-[18px] font-bold text-gray-800 mb-2">Log Out?</h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  Are you sure you want to log out? You will need to verify your mobile number again to log back in.
                </p>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm border-2 border-gray-100 text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onConfirm}
                    className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #e8470a, #c0392b)" }}
                  >
                    <LogOut size={15} />
                    Yes, Log Out
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
