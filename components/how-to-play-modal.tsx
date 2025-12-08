'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from '@/components/ui/button';

interface HowToPlayContent {
    title: string;
    subtitle: string;
    pages: {
        description: string[];
    }[];
    totalPages: number;
}

interface HowToPlayModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: HowToPlayContent;
}


export default function HowToPlayModal({
    isOpen,
    onClose,
    content
}: HowToPlayModalProps) {
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (!isOpen) {
            setCurrentPage(1);
        }
    }, [isOpen]);

    const nextPage = () => {
        if (currentPage < content.totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const prevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 flex items-center justify-center z-50"
                >
                    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
                    <motion.div
                        initial={{ y: 50 }}
                        animate={{ y: 0 }}
                        className="relative bg-white rounded-2xl p-8 max-w-xl w-full mx-4 shadow-2xl"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>

                        <div className="text-center space-y-6">
                            {/* Japanese Title */}
                            <h2 className="text-3xl font-bold text-gray-800">
                                {content.title}
                            </h2>

                            {/* Subtitle */}
                            <h3 className="text-xl font-semibold text-gray-600">
                                {content.subtitle}
                            </h3>

                            {/* Description */}
                            <div className="space-y-4">
                                {content.pages[currentPage - 1].description.map((description, index) => (
                                    <p key={index} className="text-gray-700">
                                        {description}
                                    </p>
                                ))}
                            </div>

                            {/* Pagination Section */}
                            <div className="flex items-center justify-center space-x-6">
                                {/* Left Arrow */}
                                <button
                                    onClick={prevPage}
                                    disabled={currentPage === 1}
                                    className={`w-10 h-10 flex items-center justify-center rounded-full border-2 transition-all ${
                                        currentPage === 1
                                            ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-600 text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>

                                {/* Page Number */}
                                <span className="text-gray-700 text-lg font-medium">
                                    {currentPage} / {content.totalPages}
                                </span>

                                {/* Right Arrow */}
                                <button
                                    onClick={nextPage}
                                    disabled={currentPage === content.totalPages}
                                    className={`w-10 h-10 flex items-center justify-center rounded-full border-2 transition-all ${
                                        currentPage === content.totalPages
                                            ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-600 text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
