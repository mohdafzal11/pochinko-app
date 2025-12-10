'use client'

import Image from 'next/image';
import { MusicToggleButton } from './music-toggle-button';
import { useLoaderContext } from '../contexts/LoaderContext';
import { Button } from '@/components/ui/button';

const Loader = () => {
  const { progress, showEnterButton, enterWorld } = useLoaderContext();

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
            src="/loop.mp4"
            className="object-contain"
            autoPlay
            loop
            muted
            playsInline
          />
          <div className='text-center text-kode-monu'>
            {showEnterButton ?
              <Button className='bg-[#DD5622] hover:bg-[#DD5622]/90 text-white ' onClick={enterWorld}>Enter the world of machines</Button> :
              <span>Loading... {progress}%</span>}
          </div>
        </div>
      </div>
    </div>
  );
};


export default Loader;