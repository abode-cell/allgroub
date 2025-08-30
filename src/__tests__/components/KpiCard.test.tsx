import { render, screen } from '@testing-library/react';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { CircleDollarSign } from 'lucide-react';

describe('KpiCard', () => {
  const defaultProps = {
    title: 'Test Title',
    value: '1,000 ر.س',
    change: '+5%',
    icon: <CircleDollarSign className="size-6" />,
  };

  it('renders correctly', () => {
    render(<KpiCard {...defaultProps} />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('1,000 ر.س')).toBeInTheDocument();
    expect(screen.getByText('+5%')).toBeInTheDocument();
  });

  it('applies change color correctly', () => {
    render(<KpiCard {...defaultProps} changeColor="text-green-500" />);
    
    const changeElement = screen.getByText('+5%');
    expect(changeElement).toHaveClass('text-green-500');
  });
});