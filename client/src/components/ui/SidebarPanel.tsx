import React, { useEffect, useState, useRef, useCallback } from 'react';

interface SidebarPanelProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
}

const STORAGE_KEY = 'sidebar-width';
const DEFAULT_WIDTH = 320; // 80 * 4 (w-80 = 20rem = 320px)
const MIN_WIDTH = 280;
const MAX_WIDTH = 800;

export const SidebarPanel: React.FC<SidebarPanelProps> = ({
    isOpen,
    onClose,
    children,
    title,
}) => {
    const [width, setWidth] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? parseInt(stored, 10) : DEFAULT_WIDTH;
    });
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Save width to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, width.toString());
    }, [width]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing) return;

        const newWidth = window.innerWidth - e.clientX;
        if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
            setWidth(newWidth);
        }
    }, [isResizing]);

    const handleMouseUp = useCallback(() => {
        setIsResizing(false);
    }, []);

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            // Prevent text selection while resizing
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'ew-resize';
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };
    }, [isResizing, handleMouseMove, handleMouseUp]);

    if (!isOpen) return null;

    return (
        <>
            <div
                data-testid="sidebar-overlay"
                className="fixed inset-0 bg-black/50 z-40"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                ref={sidebarRef}
                role="dialog"
                aria-modal="true"
                className="fixed top-0 right-0 h-full bg-white shadow-xl z-50 transition-transform duration-300"
                style={{ width: `${width}px` }}
            >
                {/* Resize handle */}
                <div
                    onMouseDown={handleMouseDown}
                    className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 transition-colors group"
                    style={{ touchAction: 'none' }}
                >
                    <div className="absolute left-0 top-0 bottom-0 w-4 -ml-1.5" />
                    {isResizing && (
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />
                    )}
                </div>

                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Close"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>
                <div className="p-4 overflow-y-auto h-[calc(100%-64px)]">
                    {children}
                </div>
            </div>
        </>
    );
};
