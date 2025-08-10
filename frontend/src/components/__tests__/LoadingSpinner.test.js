// eslint-disable-next-line no-unused-vars
import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders loading spinner with text', () => {
    render(<LoadingSpinner />);
    
    expect(screen.getByText('Loading more photos...')).toBeInTheDocument();
  });

  it('has proper CSS classes for styling', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByText('Loading more photos...').previousSibling;
    expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'h-8', 'w-8', 'border-b-2', 'border-white');
  });

  it('renders spinner and text in flex container', () => {
    const { container } = render(<LoadingSpinner />);
    const wrapper = container.firstChild;
    
    expect(wrapper).toHaveClass('flex', 'items-center', 'space-x-2');
  });
});