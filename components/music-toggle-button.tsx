'use client'

import { useMusicContext } from '../contexts/MusicContext';

export const MusicToggleButton = () => {
    const { isPlaying, toggleMusic } = useMusicContext();

    return (
        <div className="flex items-center gap-4">
            <span className="text-kode-monu text-gray-600 text-base font-medium tracking-wide">
                MUSIC
            </span>

            <button
                onClick={toggleMusic}
                className="relative w-18 h-8 bg-[#DD5622] rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-orange-300 border-2 border-orange-500"
                role="switch"
                aria-checked={isPlaying}
            >
                <span
                    className={`absolute left-2 top-1/2 -translate-y-1/2 text-white font-bold text-lg transition-opacity duration-200 ${isPlaying ? 'opacity-100' : 'opacity-0'
                        }`}
                >
                    I
                </span>

                <div
                    className={`absolute top-0.5 w-8 h-6 bg-white rounded-full transition-transform duration-300 shadow-md ${isPlaying ? 'translate-x-8' : 'translate-x-1'
                        }`}
                />
            </button>
        </div>
    );
};

