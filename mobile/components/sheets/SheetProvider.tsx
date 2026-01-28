import React, { createContext, useCallback, useContext } from 'react';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useRouter, usePathname } from 'expo-router';
import { FloatingAIButton } from '../ui/FloatingAIButton';

// ============================================================================
// SHEET CONTEXT
// Provides methods to open native formSheet presentations via expo-router
// These routes use transparent backgrounds for iOS 26 Liquid Glass effect
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
  const router = useRouter();
  const pathname = usePathname();

  // Open stock sheet using native formSheet route
  // This route has transparent background for Liquid Glass on iOS 26+
  const openStockSheet = useCallback((ticker: string) => {
    router.push({
      pathname: '/sheets/stock/[ticker]',
      params: { ticker },
    });
  }, [router]);

  const closeStockSheet = useCallback(() => {
    router.back();
  }, [router]);

  // Open glossary sheet using native formSheet route
  const openGlossarySheet = useCallback((termKey: string) => {
    router.push({
      pathname: '/sheets/glossary/[term]',
      params: { term: termKey },
    });
  }, [router]);

  const closeGlossarySheet = useCallback(() => {
    router.back();
  }, [router]);

  // Navigate to AI chat tab when floating button is pressed
  const handleAIButtonPress = useCallback(() => {
    router.push('/(tabs)/chat');
  }, [router]);

  // Only show floating AI button on tab screens, but not on the chat tab itself
  const showFloatingAI = pathname.startsWith('/(tabs)') && !pathname.includes('/chat');

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
        <FloatingAIButton onPress={handleAIButtonPress} visible={showFloatingAI} />
      </BottomSheetModalProvider>
    </SheetContext.Provider>
  );
}
