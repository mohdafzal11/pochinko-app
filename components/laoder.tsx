'use client'

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { MusicToggleButton } from './music-toggle-button';
import { useLoaderContext } from '../contexts/LoaderContext';
import { useMusicContext } from '../contexts/MusicContext';
import { Button } from '@/components/ui/button';

const Loader = () => {
  const { progress, showEnterButton, enterWorld } = useLoaderContext();
  const { isPlaying, volume } = useMusicContext();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/assets/sfx/01 - loader.wav');
      audioRef.current.loop = true;
    }

    audioRef.current.volume = volume;

    if (isPlaying) {
      audioRef.current.play().catch(() => {
        // Browser may block autoplay until user interaction
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
        <div className="relative z-10 w-80 h-80 md:w-96 md:h-96 lg:w-128 lg:h-128">
          <video
            className="object-contain"
            autoPlay
            loop
            muted
            playsInline
          >
            {/* WebM with alpha channel for transparency support (most browsers including mobile) */}
            <source src="/loop.webm" type="video/webm" />
            {/* MP4 fallback for browsers that don't support WebM */}
            {/* <source src="/loop.mp4" type="video/mp4" /> */}
          </video>
          <div className='text-center text-kode-monu'>
            {showEnterButton ?
              <Button className='bg-[#DD5622] hover:bg-[#DD5622]/90 text-white ' onClick={enterWorld}>Explore</Button> :
              <span>Loading... {progress}%</span>}
          </div>
        </div>
      </div>
    </div>
  );
};


export default Loader;