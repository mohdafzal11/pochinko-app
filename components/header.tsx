'use client'

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import ConnectWallet from './connect-wallet';

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const menuItems = [
        { href: "/", english: "MACHINES", japanese: "マシン" },
        { href: "/dashboard", english: "DASHBOARD", japanese: "ダッシュボード" },
        { href: "/marketplace", english: "MARKETPLACE", japanese: "マーケット" },
        { href: "/leaderboard", english: "LEADERBOARD", japanese: "リーダーボード" }
    ];

    return (
        <nav className="sticky top-0 bg-white z-[9999999]">
            <div className='flex justify-between items-center py-2 px-4'>
                {/* Logo */}
                <Link href="/" className="text-2xl font-semibold text-[#DD5622]">
                    PACHINKO
                </Link>

                {/* Desktop Navigation */}
                <div className='hidden md:flex items-center gap-6 text-muted-foreground'>
                    {menuItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="hover:text-foreground transition-colors text-kode-monu relative inline-block min-w-[120px] text-center"
                            onMouseEnter={() => setHoveredItem(item.href)}
                            onMouseLeave={() => setHoveredItem(null)}
                        >
                            <span className={`transition-opacity duration-300 ${hoveredItem === item.href ? 'opacity-0' : 'opacity-100'}`}>
                                {item.english}
                            </span>
                            <span className={`absolute inset-0 transition-opacity duration-300 flex items-center justify-center ${hoveredItem === item.href ? 'opacity-100' : 'opacity-0'}`}>
                                {item.japanese}
                            </span>
                        </Link>
                    ))}
                    <ConnectWallet />
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
                        {menuItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="hover:text-foreground transition-colors py-2 text-kode-monu relative inline-block"
                                onClick={toggleMenu}
                                onMouseEnter={() => setHoveredItem(item.href)}
                                onMouseLeave={() => setHoveredItem(null)}
                            >
                                <span className={`transition-opacity duration-300 ${hoveredItem === item.href ? 'opacity-0' : 'opacity-100'}`}>
                                    {item.english}
                                </span>
                                <span className={`absolute inset-0 transition-opacity duration-300 flex items-center ${hoveredItem === item.href ? 'opacity-100' : 'opacity-0'}`}>
                                    {item.japanese}
                                </span>
                            </Link>
                        ))}
                        <ConnectWallet />
                    </div>
                </div>
            )}
        </nav>
    );
}

export default Header