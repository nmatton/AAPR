import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SidebarPanel } from './SidebarPanel';

describe('SidebarPanel', () => {
    it('does not render content when isOpen is false', () => {
        render(
            <SidebarPanel isOpen={false} onClose={() => { }}>
                <div data-testid="sidebar-content">Content</div>
            </SidebarPanel>
        );
        expect(screen.queryByTestId('sidebar-content')).not.toBeInTheDocument();
    });

    it('renders content when isOpen is true', () => {
        render(
            <SidebarPanel isOpen={true} onClose={() => { }}>
                <div data-testid="sidebar-content">Content</div>
            </SidebarPanel>
        );
        expect(screen.getByTestId('sidebar-content')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
        const handleClose = vi.fn();
        render(
            <SidebarPanel isOpen={true} onClose={handleClose}>
                Content
            </SidebarPanel>
        );
        const closeButton = screen.getByRole('button', { name: /close/i });
        fireEvent.click(closeButton);
        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay is clicked', () => {
        const handleClose = vi.fn();
        render(
            <SidebarPanel isOpen={true} onClose={handleClose}>
                Content
            </SidebarPanel>
        );
        // Assuming there's an overlay div. We might need to target it specifically.
        // For now, let's look for a generic element acting as overlay or check for specific class/testid if we implement it that way.
        // Spec says "overlay click-to-close". I'll assume a distinct overlay element.
        const overlay = screen.getByTestId('sidebar-overlay');
        fireEvent.click(overlay);
        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('renders with fixed positioning classes', () => {
        render(
            <SidebarPanel isOpen={true} onClose={() => { }}>
                Content
            </SidebarPanel>
        );
        // We check for the container having fixed, right-0 classes
        const sidebar = screen.getByRole('dialog'); // Or some role
        expect(sidebar).toHaveClass('fixed');
        expect(sidebar).toHaveClass('right-0');
    });
});
