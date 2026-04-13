import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { cn } from '../utils/cn';
import { CheckCircle, WarningCircle as AlertCircle, Info, X } from '@phosphor-icons/react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 5000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => (
                    <Toast key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);

const Toast = ({ toast, onRemove }) => {
    const icons = {
        success: <CheckCircle size={18} weight="bold" className="text-emerald-500" />,
        error: <AlertCircle size={18} weight="bold" className="text-rose-500" />,
        info: <Info size={18} weight="bold" className="text-evolution-indigo" />
    };

    return (
        <div
            className={cn(
                "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-dark border border-white/10 shadow-2xl animate-in slide-in-from-right-10 duration-500 glass",
                "max-w-xs min-w-[240px]"
            )}
        >
            <div className="flex-shrink-0">{icons[toast.type]}</div>
            <p className="flex-1 text-[13px] font-medium text-white">{toast.message}</p>
            <button
                onClick={onRemove}
                className="text-zinc-500 hover:text-white transition-colors"
            >
                <X size={16} weight="bold" />
            </button>
        </div>
    );
};
