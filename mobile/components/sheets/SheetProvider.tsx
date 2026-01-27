import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { BottomSheetModal, BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import StockAnalysisSheet from './StockAnalysisSheet';
import GlossarySheet from './GlossarySheet';

// ============================================================================
// CONTEXT
// ============================================================================

export interface SheetContextValue {
  openStockSheet: (ticker: string) => void;
  closeStockSheet: () => void;
  openGlossarySheet: (termKey: string) => void;
  closeGlossarySheet: () => void;
}

const SheetContext = createContext<SheetContextValue>({
  openStockSheet: () => {},
  closeStockSheet: () => {},
  openGlossarySheet: () => {},
  closeGlossarySheet: () => {},
});

export const useSheetContext = () => useContext(SheetContext);

// ============================================================================
// PROVIDER
// ============================================================================

interface SheetProviderProps {
  children: React.ReactNode;
}

export default function SheetProvider({ children }: SheetProviderProps) {
  const stockSheetRef = useRef<BottomSheetModal>(null);
  const glossarySheetRef = useRef<BottomSheetModal>(null);

  const [stockTicker, setStockTicker] = useState<string | null>(null);
  const [glossaryTerm, setGlossaryTerm] = useState<string | null>(null);

  const openStockSheet = useCallback((ticker: string) => {
    setStockTicker(ticker);
    // Delay present() by one frame so React processes the state update first
    requestAnimationFrame(() => {
      stockSheetRef.current?.present();
    });
  }, []);

  const closeStockSheet = useCallback(() => {
    stockSheetRef.current?.dismiss();
  }, []);

  const openGlossarySheet = useCallback((termKey: string) => {
    setGlossaryTerm(termKey);
    requestAnimationFrame(() => {
      glossarySheetRef.current?.present();
    });
  }, []);

  const closeGlossarySheet = useCallback(() => {
    glossarySheetRef.current?.dismiss();
  }, []);

  const contextValue: SheetContextValue = {
    openStockSheet,
    closeStockSheet,
    openGlossarySheet,
    closeGlossarySheet,
  };

  return (
    <SheetContext.Provider value={contextValue}>
      <BottomSheetModalProvider>
        {children}
        <StockAnalysisSheet ref={stockSheetRef} ticker={stockTicker} />
        <GlossarySheet ref={glossarySheetRef} termKey={glossaryTerm} />
      </BottomSheetModalProvider>
    </SheetContext.Provider>
  );
}
