import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { X } from 'lucide-react';

interface ErrorContextType {
  showError: (message: string) => void;
  hideError: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [error, setError] = useState<string | null>(null);

  const showError = useCallback((message: string) => {
    setError(message);
    setTimeout(() => {
      setError(null);
    }, 5000);
  }, []);

  const hideError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <ErrorContext.Provider value={{ showError, hideError }}>
      {children}
      {error && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-red-500 text-white p-4 rounded-lg shadow-lg flex items-center space-x-2">
            <span className="flex-grow">{error}</span>
            <button
              onClick={hideError}
              className="hover:bg-red-600 rounded-full p-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </ErrorContext.Provider>
  );
};

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};
