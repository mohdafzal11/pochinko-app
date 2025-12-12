'use client'

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { MusicToggleButton } from './music-toggle-button';
import { useLoaderContext } from '../contexts/LoaderContext';
import { useMusicContext } from '../contexts/MusicContext';
import { Button } from '@/components/ui/button';

const Loader = () => {
  const { progress, showEnterButton, enterWorld } = useLoaderContext();
  const { isPlaying, volume } = useMusicContext();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [supportsWebM, setSupportsWebM] = useState(true);
  const [useSmallGif, setUseSmallGif] = useState(false);

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

  // Detect WebM support with alpha (Safari/iOS don't support WebM alpha)
  useEffect(() => {
    // iOS devices and Safari don't support WebM alpha
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    setSupportsWebM(!isIOS && !isSafari);

    // Detect network speed for Safari/iOS
    if (isIOS || isSafari) {
      // Try Network Information API first (not supported by Safari)
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        const downlink = connection.downlink; // in Mbps
        if (downlink && downlink < 3) {
          setUseSmallGif(true);
        }
      } else {
        // Fallback: measure download speed with a small test file
        const startTime = Date.now();
        const img = new window.Image();
        img.onload = () => {
          const duration = (Date.now() - startTime) / 1000; // seconds
          const fileSize = 0.05; // 50KB in MB
          const speed = fileSize / duration; // MB/s
          const speedMbps = speed * 8; // Convert to Mbps
          if (speedMbps < 3) {
            setUseSmallGif(true);
          }
        };
        img.src = '/loop-background.png?t=' + Date.now(); // Use existing image as test
      }
    }
  }, []);

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
            {!supportsWebM ? (
              // Safari/iOS: GIF with transparency - use small GIF on slow network
              <img
                src={useSmallGif ? "/assets/videos/loader-small.gif" : "/assets/videos/loader.gif"}
                alt="Loading animation"
                className="w-full h-full object-contain"
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              />
            ) : (
              // Chrome/Firefox/Edge: WebM with alpha (230KB)
              <video
                className="object-contain w-full h-full"
                autoPlay
                loop
                muted
                playsInline
              >
                <source src="/assets/videos/loader.webm" type="video/webm" />
              </video>
            )}
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