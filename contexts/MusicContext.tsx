'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface MusicContextType {
  isPlaying: boolean;
  toggleMusic: () => void;
  volume: number;
  setVolume: (volume: number) => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const useMusicContext = () => {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusicContext must be used within a MusicProvider');
  }
  return context;
};

export const MusicProvider = ({ children }: { children: ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);

  useEffect(() => {
    const savedVolume = localStorage.getItem('music-volume');
    const savedPlaying = localStorage.getItem('music-playing');
    
    if (savedVolume !== null) {
      setVolume(parseFloat(savedVolume));
    }
    
    // Only override default if user has explicitly set a preference
    if (savedPlaying !== null) {
      setIsPlaying(savedPlaying === 'true');
    }else{
      setIsPlaying(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('music-volume', volume.toString());
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('music-playing', isPlaying.toString());
  }, [isPlaying]);

  const toggleMusic = () => {
    setIsPlaying(prev => !prev);
  };

  const value = {
    isPlaying,
    toggleMusic,
    volume,
    setVolume
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
};
