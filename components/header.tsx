'use client'

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
const Header = () => {

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <nav className="sticky top-0 bg-white z-50">
            <div className='flex justify-between items-center py-2 px-4'>
                {/* Logo */}
                <Link href="/" className="text-2xl font-semibold text-[#DD5622]">
                    PACHINKO
                </Link>

                {/* Desktop Navigation */}
                <div className='hidden md:flex items-center gap-6 text-muted-foreground'
                >
                    <Link href="/machines" className="hover:text-foreground transition-colors text-kode-monu">
                        MACHINES
                    </Link>
                    <Link href="/dashboard" className="hover:text-foreground transition-colors text-kode-monu">
                        ダッシュボード
                    </Link>
                    <Link href="/marketplace" className="hover:text-foreground transition-colors text-kode-monu">
                        MARKETPLACE
                    </Link>
                    <Link href="/leaderboard" className="hover:text-foreground transition-colors text-kode-monu">
                        LEADERBOARD
                    </Link>
                    <button className="text-white bg-black w-[179px] h-[38px] rounded-[100px] hover:bg-gray-800 transition-colors">
                        CONNECT
                    </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                    onClick={toggleMenu}
                    className='md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors'
                    aria-label="Toggle menu"
                >
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Navigation */}
            {isMenuOpen && (
                <div className='md:hidden bg-white border-t'>
                    <div className='flex flex-col gap-4 p-4 text-muted-foreground'>
                        <Link
                            href="/machines"
                            className="hover:text-foreground transition-colors py-2 text-kode-monu"
                            onClick={toggleMenu}
                        >
                            MACHINES
                        </Link>
                        <Link
                            href="/dashboard"
                            className="hover:text-foreground transition-colors py-2 text-kode-monu"
                            onClick={toggleMenu}
                        >
                            ダッシュボード
                        </Link>
                        <Link
                            href="/marketplace"
                            className="hover:text-foreground transition-colors py-2 txt-kode-monu"
                            onClick={toggleMenu}
                        >
                            MARKETPLACE
                        </Link>
                        <Link
                            href="/leaderboard"
                            className="hover:text-foreground transition-colors py-2 text-kode-monu"
                            onClick={toggleMenu}
                        >
                            LEADERBOARD
                        </Link>
                        <button className="text-white bg-black h-[38px] rounded-[100px] hover:bg-gray-800 transition-colors">
                            CONNECT
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}

export default Header;