import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, message }]);
    window.setTimeout(() => {
      setToasts((list) => list.filter((item) => item.id !== id));
    }, 2400);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toaster" aria-live="polite">
        {toasts.map((item) => (
          <div className="toast" role="status" key={item.id}>{item.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
