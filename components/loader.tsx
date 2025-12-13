'use client'

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { MusicToggleButton } from './music-toggle-button';
import { useLoaderContext } from '../contexts/LoaderContext';
import { useMusicContext } from '../contexts/MusicContext';
import { Button } from '@/components/ui/button';

const Loader = () => {
  const { progress, showEnterButton, enterWorld } = useLoaderContext();
  const { isPlaying, volume, toggleMusic, setVolume } = useMusicContext();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicStartedByInteraction = useRef(false);

  useEffect(() => {
    const handleFirstButtonClick = () => {
      if (!musicStartedByInteraction.current && !isPlaying) {
        toggleMusic(); 
        musicStartedByInteraction.current = true;
        
        document.removeEventListener('click', handleButtonClick);
        document.removeEventListener('keydown', handleButtonClick);
        document.removeEventListener('touchstart', handleButtonClick);
      }
    };

    const handleButtonClick = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        handleFirstButtonClick();
      }
    };

    document.addEventListener('click', handleButtonClick);
    document.addEventListener('keydown', handleButtonClick);
    document.addEventListener('touchstart', handleButtonClick);
    

    return () => {
      document.removeEventListener('click', handleButtonClick);
      document.removeEventListener('keydown', handleButtonClick);
      document.removeEventListener('touchstart', handleButtonClick);
    };
  }, [isPlaying, toggleMusic]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/assets/sfx/01 - loader.wav');
      audioRef.current.loop = true;
    }

    audioRef.current.volume = volume;

    if (isPlaying) {
      audioRef.current.play().catch(() => {
      });
    } else {
      audioRef.current.pause();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [isPlaying, volume]);

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden z-50">
      <div className="relative w-full h-full flex items-center justify-center">
        <Image
          src="/loop-background.png"
          alt="Pachinko Background"
          fill
          className="object-contain md:object-cover "
          priority
        />
        <div className='absolute right-[5%] top-[65%] md:top-[70%] -translate-y-1/2'>
          <MusicToggleButton />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center">
          {/* Animation with transparency */}
          <div className="w-80 h-80 md:w-96 md:h-96 lg:w-128 lg:h-128 relative">
             <img
                src={"/assets/videos/loader.gif"}
                alt="Loading animation"
                className="w-full h-full object-contain"
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              />
          </div>
          
          {/* Loading Text / Enter Button - positioned below GIF */}
          <div className='text-center text-kode-monu mt-8'>
            {showEnterButton ?
              <Button className='bg-[#DD5622] hover:bg-[#DD5622]/90 text-white ' onClick={enterWorld}>{'Explore'}</Button> :
              <span>Loading... {progress}%</span>}
          </div>
        </div>
      </div>
    </div>
  );
};


export default Loader;