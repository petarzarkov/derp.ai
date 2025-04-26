import React, { createContext, useContext, RefObject } from 'react';

interface ScrollContextType {
  scrollableRef: RefObject<HTMLElement | null>;
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

export const useScrollContext = () => {
  const context = useContext(ScrollContext);
  if (context === undefined) {
    throw new Error('useScrollContext must be used within a ScrollContextProvider');
  }
  return context;
};

interface ScrollContextProviderProps {
  children: React.ReactNode;
  scrollableRef: RefObject<HTMLElement | null>;
}

export const ScrollContextProvider: React.FC<ScrollContextProviderProps> = ({ children, scrollableRef }) => {
  return <ScrollContext.Provider value={{ scrollableRef }}>{children}</ScrollContext.Provider>;
};
