'use client'

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useLoaderContext } from '@/contexts/LoaderContext';
import Loader from '@/components/laoder';

const games = [
  {
    id: 1,
    name: 'Gacha',
    image: '/gacha.jpeg',
    description: 'COMING SOON',
    href: '/gacha',
    isComingSoon: true
  },
  {
    id: 2,
    name: 'BlockPad',
    image: '/blockpad.png',
    description: 'COMING SOON',
    href: '/blockpad',
    isComingSoon: true
  },
  {
    id: 3,
    name: 'Pachinko',
    image: '/pachinko.jpeg',
    description: 'COMING SOON',
    href: '/pachinko',
    isComingSoon: true
  }
];

export default function Home() {

  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(1);
  const [animateCircle, setAnimateCircle] = useState(false);
  const { isLoading } = useLoaderContext();


  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : games.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < games.length - 1 ? prev + 1 : 0));
  };

  const getPreviousIndex = () => (currentIndex - 1 + games.length) % games.length;
  const getNextIndex = () => (currentIndex + 1) % games.length;

  const isGame1 = (index: number) => games[index].id === 1;

  const handleClick = () => {
    if (games[currentIndex].isComingSoon) return;

    setAnimateCircle(true);
    setTimeout(() => {
      setAnimateCircle(false);
      router.push(games[currentIndex].href);
    }, 600);
  };
  if (isLoading) {
    return <Loader />
  }

  return (
    <div className="min-h-screen flex flex-col justify-center overflow-x-hidden">
      {/* Game Carousel */}
      <div className="min-h-[calc(100vh-80px)] relative w-full flex items-center justify-center pt-12">
        <div className="relative flex items-center justify-center w-full gap-4 md:gap-8 lg:gap-12">

          {/* LEFT CARD */}
          <div className="relative z-0 hidden sm:block">
            <div
              className={`
    relative w-64 h-80 sm:w-72 sm:h-96 
    md:w-[250px] md:h-[300px] lg:w-[300px] lg:h-[300px] 
    xl:w-[330px] xl:h-[380px] 2xl:w-[400px] 2xl:h-[450px]
    overflow-hidden transition-all duration-700 ease-out
    -translate-x-16
    hover:scale-105 hover:-translate-y-2 opacity-40
  `}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-transparent z-20 pointer-events-none" />

              <Image
                src={games[getPreviousIndex()].image}
                alt="Previous game"
                fill
                className="object-contain transition-all duration-700 ease-out"
              />
            </div>
          </div>

          {/* PREVIOUS BUTTON */}
          <div className="z-20 flex flex-col items-center gap-2 flex-shrink-0 -mx-2 sm:mx-0">
            <button
              onClick={handlePrevious}
              className="bg-white rounded-full p-2 sm:p-3 md:p-4 shadow-xl hover:shadow-2xl transition-all hover:scale-110 cursor-pointer"
            >
              <ChevronLeft size={20} className="text-gray-700 sm:w-6 sm:h-6 md:w-7 md:h-7" />
            </button>
            <div className="text-[10px] sm:text-xs text-gray-500 tracking-[0.15em] uppercase">Prev</div>
          </div>

          {/* CENTER CARD */}
          <div className="relative z-10 flex flex-col items-center gap-4 md:gap-6 flex-shrink-0">
            <div
              key={currentIndex}
              className="relative w-80 h-96 sm:w-[340px] sm:h-[420px] md:w-[440px] md:h-[560px]
  lg:w-[400px] lg:h-[500px] xl:w-[450px] xl:h-[500px] 2xl:w-[600px] 2xl:h-[700px] overflow-hidden
  transition-all duration-700 ease-out
  animate-fadeIn
  hover:scale-105 hover:-translate-y-2"
            >

              <Image
                src={games[currentIndex].image}
                alt={games[currentIndex].name}
                fill
                className="object-contain"
              />
            </div>

            {/* TEXT BELOW */}
            <div className='absolute -bottom-10 text-kode-monu space-y-2'>
              <div className="flex items-center justify-center">
                <Button
                  onClick={handleClick}

                  disabled={games[currentIndex].isComingSoon}
                  className={`relative shadow-xl hover:scale-105 text-sm sm:text-lg min-w-[200px] sm:min-w-[260px] py-4 sm:py-7 rounded-full overflow-hidden transition-all ${games[currentIndex].isComingSoon
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-white border-1'
                    }`}
                >
                  <motion.div
                    initial={{ x: -70 }}
                    animate={animateCircle ? { x: 100 } : { x: -100 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className="absolute w-12 h-12 rounded-full bg-white shadow-md border"
                  />
                  {games[currentIndex].name}
                </Button>
              </div>


              <div className="text-center text-[10px] sm:text-xs text-gray-400 tracking-[0.2em] uppercase">
                {games[currentIndex].description}
              </div>
            </div>
          </div>

          {/* NEXT BUTTON */}
          <div className="z-20 flex flex-col items-center gap-2 flex-shrink-0 -mx-2 sm:mx-0">
            <button
              onClick={handleNext}
              className="bg-white rounded-full p-2 sm:p-3 md:p-4 shadow-xl hover:shadow-2xl transition-all hover:scale-110 cursor-pointer"
            >
              <ChevronRight size={20} className="text-gray-700 sm:w-6 sm:h-6 md:w-7 md:h-7" />
            </button>
            <div className="text-[10px] sm:text-xs text-gray-500 tracking-[0.15em] uppercase">Next</div>
          </div>

          {/* RIGHT CARD */}
          <div className="relative z-0 hidden sm:block">
            <div
              className={`
    relative w-64 h-80 sm:w-72 sm:h-96 
     md:w-[250px] md:h-[300px] lg:w-[300px] lg:h-[300px] 
    xl:w-[330px] xl:h-[380px] 2xl:w-[400px] 2xl:h-[450px]
    overflow-hidden transition-all duration-700 ease-out
    translate-x-16
    hover:scale-105 hover:-translate-y-2 opacity-40
  `}
            >

              <div className="absolute inset-0 bg-gradient-to-l from-white via-white/60 to-transparent z-20 pointer-events-none" />

              <Image
                src={games[getNextIndex()].image}
                alt="Next game"
                fill
                className="object-contain transitio-700 ease-out"
              />
            </div>
          </div>

        </div>
      </div>

      <div className="px-8">
        <Image
          src="/loop-background.png"
          alt="Pachinko Background"
          className="object-cover"
          height={40}
          width={500}
        />
      </div>
    </div>
  );
}
