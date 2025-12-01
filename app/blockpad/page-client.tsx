'use client';

import Image from 'next/image';

export default function Blockpad() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 font-mono">
      <main className="w-full mx-auto px-4 lg:px-8 pt-12 grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">

        {/* LEFT SECTION */}
        <div className="space-y-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <div className="space-y-4 text-sm">
              {[300, 400, 500].map((g, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-8 h-8 bg-gray-${g} rounded-full`}></div>
                  <div>
                    <p className="font-bold">
                      {i === 0 ? 'won $2,580' : i === 1 ? '@grinding_negro' : '@tetsuodoteth'}
                    </p>
                    {i !== 0 && (
                      <p className="text-gray-600">
                        {i === 1 ? 'bought 69 balls ...' : 'sold 2 balls'}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-8 mt-12">
            {/* Left Icons */}
            <div className="flex flex-col items-center gap-3 lg:pl-40">
              <div className="w-12 h-12 bg-yellow-200 rounded-full shadow-lg"></div>
              <span className="text-xs font-bold text-gray-700">CONSOLE</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-orange-600 rounded-full shadow-lg"></div>
              <span className="text-xs font-bold text-gray-700">MUSIC</span>
            </div>
            <div className="flex flex-col items-center gap-3 lg:pl-40">
              <div className="w-12 h-12 bg-blue-600 rounded-full shadow-lg"></div>
              <span className="text-xs font-bold text-gray-700">HOW TO PLAY?</span>
            </div>
          </div>
        </div>

        {/* CENTER BLOCKPAD */}
        <div className="relative flex justify-center">
          <div className="relative w-full max-w-md">
            <div className="relative bg-[#c41e3a] w-full aspect-[3/4] rounded-[40px] shadow-2xl overflow-hidden">

              {/* Top Bar */}
              <div className="m-4 h-16 bg-black rounded-2xl shadow-inner" />

              {/* 5×5 Grid */}
              <div className="grid grid-cols-5 grid-rows-5 gap-2 sm:gap-4 px-4 sm:px-10 py-4">
                {Array.from({ length: 25 }, (_, i) => (
                  <button
                    key={i}
                    className={`p-3 sm:p-5 h-12 sm:h-16 rounded-lg shadow-md transition-colors 
                      text-lg font-semibold 
                      ${
                        i === 0
                          ? 'bg-[#6CFF82] hover:bg-green-400'
                          : i === 1
                          ? 'bg-[#EB6D6F] hover:bg-red-400'
                          : 'bg-[#fef3c7] hover:bg-[#fde68a]'
                      }
                    `}
                  />
                ))}
              </div>

              {/* Bottom Label + Buttons */}
              <div className="flex items-center justify-between px-4 sm:px-6">
                <div>
                  <p className="text-xl sm:text-2xl text-[#fef08a] font-black tracking-[0.15em] drop-shadow-2xl">
                    ブロックパッド
                  </p>
                  <p className="text-2xl sm:text-3xl text-[#fef08a] font-black tracking-wider drop-shadow-2xl">
                    BLOCKPAD
                  </p>
                </div>

                <div>
                  <div className="grid grid-cols-2 grid-rows-2 gap-2">
                    {[1, 2, 3].map((i) => (
                      <button
                        key={i}
                        className="bg-[#fef3c7] p-3 sm:p-5 h-10 hover:bg-[#fde68a] transition-colors rounded-lg shadow-md"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Play Button */}
            <button className="absolute -bottom-10 left-1/2 -translate-x-1/2 
              bg-white text-black font-black text-2xl sm:text-3xl px-12 sm:px-20 py-3 sm:py-4 
              rounded-full shadow-2xl hover:scale-105 transition-transform whitespace-nowrap">
              LET'S PLAY
            </button>
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="space-y-16">
          <div className="text-right pr-0 lg:pr-10">
            <p className="text-sm text-gray-600 leading-relaxed max-w-sm ml-auto">
              LET YOUR BALLS DROP! WATCH THEM BOUNCE AND HIT MASSIVE JACKPOTS!
              <br /><br />
              LET'S PLAY PACHINKO!
            </p>
          </div>

          {/* Right Icons */}
          <div className="flex flex-col items-center gap-12">
            <div className="flex flex-col items-center gap-3 lg:pr-40">
              <div className="w-12 h-12 bg-pink-300 rounded-full shadow-lg"></div>
              <span className="text-xs font-bold text-gray-700">INVENTORY</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-pink-400 rounded-full shadow-lg"></div>
              <span className="text-xs font-bold text-gray-700">MARKETPLACE</span>
            </div>
            <div className="flex flex-col items-center gap-3 lg:pr-40">
              <div className="w-12 h-12 bg-lime-300 rounded-full shadow-lg"></div>
              <span className="text-xs font-bold text-gray-700">MACHINES</span>
            </div>
          </div>
        </div>
      </main>

      {/* Prize Pool */}
      <div className="w-full mt-20 py-10 bg-gray-300/50 backdrop-blur">
        <div className="mx-auto px-8 flex flex-wrap items-center justify-center gap-10 sm:gap-20 text-center">
          <p className="text-gray-700 font-bold text-lg">TODAY'S PRIZE POOL</p>
          <div className="flex flex-wrap gap-10 text-4xl sm:text-5xl font-black text-orange-600">
            <span>+ $20,000</span>
            <span>+ $20,000</span>
            <span className="text-orange-500">+ $20,000</span>
          </div>
        </div>
      </div>

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
