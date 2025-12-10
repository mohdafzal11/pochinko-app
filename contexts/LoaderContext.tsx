'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LoaderContextType {
  progress: number;
  isLoading: boolean;
  showEnterButton: boolean;
  enterWorld: () => void;
  startAutoLoad: () => void;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

export const useLoaderContext = () => {
  const context = useContext(LoaderContext);
  if (context === undefined) {
    throw new Error('useLoaderContext must be used within a LoaderProvider');
  }
  return context;
};

export const LoaderProvider = ({ children }: { children: ReactNode }) => {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showEnterButton, setShowEnterButton] = useState(false);

  useEffect(() => {
    const storedValue = localStorage.getItem('has-entered-world');
    console.log("Raw localStorage value:", storedValue);
    const hasEntered = storedValue === 'true';
    console.log("hasEntered", hasEntered);
    
    if (hasEntered) {
      console.log("Setting isLoading to false");
      setIsLoading(false);
    } else {
      startLoadingToEnter();
    }
  }, []);

  useEffect(() => {
    console.log("isLoading changed to:", isLoading);
  }, [isLoading]);

  const startLoadingToEnter = () => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 1;
      setProgress(currentProgress);
      
      if (currentProgress >= 12) {
        clearInterval(interval);
        
        setTimeout(() => {
          setProgress(100);
          
          setTimeout(() => {
            setShowEnterButton(true);
          }, 800);
        }, 500);
      }
    }, 1000 / 12);
  };

  const startAutoLoad = () => {
    setProgress(12);
    
    setTimeout(() => {
      setProgress(100);
    }, 1500);
  };

  const enterWorld = () => {
    console.log("enterWorld called");
    localStorage.setItem('has-entered-world', 'true');
    setIsLoading(false);
    setShowEnterButton(false);
  };

  const value = {
    progress,
    isLoading,
    showEnterButton,
    enterWorld,
    startAutoLoad
  };

  return (
    <LoaderContext.Provider value={value}>
      {children}
    </LoaderContext.Provider>
  );
};
