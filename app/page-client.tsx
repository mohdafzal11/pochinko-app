'use client'

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const games = [
  {
    id: 1,
    name: 'GAME 1',
    image: '/game-1.jpeg',
    description: 'CLICK TO PROCEED'
  },
  {
    id: 2,
    name: 'GAME 2',
    image: '/game-2.jpeg',
    description: 'CLICK TO PROCEED'
  },
  {
    id: 3,
    name: 'GAME 3',
    image: '/game-3.jpeg',
    description: 'CLICK TO PROCEED'
  }
];

export default function Home() {
  const [currentIndex, setCurrentIndex] = useState(1);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : games.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < games.length - 1 ? prev + 1 : 0));
  };

  const getPreviousIndex = () => (currentIndex - 1 + games.length) % games.length;
  const getNextIndex = () => (currentIndex + 1) % games.length;

  const isGame1 = (index: number) => games[index].id === 1;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden justify-center">
      {/* Game Carousel */}
      <div className="relative w-full flex justify-center pt-12">
        <div className="relative flex items-center justify-center w-full gap-4 md:gap-8 lg:gap-12">

          {/* LEFT CARD */}
          <div className="relative z-0 hidden sm:block">
            <div
              className={`
    relative w-64 h-80 sm:w-72 sm:h-96 
    md:w-96 md:h-[500px] lg:w-[420px] lg:h-[540px] 
    overflow-hidden transition-all duration-700 ease-out
    -translate-x-6
    hover:scale-105 hover:-translate-y-2
    ${isGame1(getPreviousIndex()) ? "rotate-25" : "rotate-0"}
  `}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/100 via-white/60 to-transparent z-20 pointer-events-none" />

              <Image
                src={games[getPreviousIndex()].image}
                alt="Previous game"
                fill
                className="object-contain transition-all duration-700 ease-out"
              />
            </div>
          </div>

          {/* PREVIOUS BUTTON */}
          <div className="z-20 flex flex-col items-center gap-2 flex-shrink-0">
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
              className="relative w-64 h-80 sm:w-72 sm:h-96 md:w-96 md:h-[500px]
  lg:w-[420px] lg:h-[540px] overflow-hidden
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
            <div className='absolute -bottom-5 text-kode-monu space-y-2'>
              <button
                className="
    text-base sm:text-xl md:text-2xl font-bold tracking-[0.15em] uppercase
    bg-white px-6 sm:px-8 md:px-12 py-2 rounded-full shadow-xl cursor-pointer

    transition-all duration-300 
    hover:scale-110 hover:shadow-2xl hover:bg-gray-50
    active:scale-95
  "
              >
                {games[currentIndex].name}
              </button>

              <div className="text-center text-[10px] sm:text-xs text-gray-400 tracking-[0.2em] uppercase">
                {games[currentIndex].description}
              </div>
            </div>
          </div>

          {/* NEXT BUTTON */}
          <div className="z-20 flex flex-col items-center gap-2 flex-shrink-0">
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
    md:w-96 md:h-[500px] lg:w-[420px] lg:h-[540px] 
    overflow-hidden transition-all duration-700 ease-out
    translate-x-6
    hover:scale-105 hover:-translate-y-2
    ${isGame1(getNextIndex()) ? "-rotate-25" : "rotate-0"}
  `}
            >

              <div className="absolute inset-0 bg-gradient-to-l from-white/100 via-white/60 to-transparent z-20 pointer-events-none" />

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

      {/* BACKGROUND SECTION BELOW */}
      <div className="px-8">
        <Image
          src="/loop-background.png"
          alt="Pachinko Background"
          className="object-cover"
          height={10}
          width={300}
        />
      </div>
    </div>
  );
}
