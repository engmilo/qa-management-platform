import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ 
  className, 
  variant = 'primary', 
  size = 'md',
  ...props 
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#48a43f] focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none shadow-sm';
  
  const variants = {
    primary: 'bg-[#48a43f] text-white hover:bg-[#3d8c36] active:bg-[#32722b]',
    secondary: 'bg-white border border-[#d8dee4] text-[#4f6174] hover:bg-[#f5f7f9] hover:text-[#1d2d3e]',
    outline: 'bg-transparent border border-[#d8dee4] text-[#4f6174] hover:bg-[#f5f7f9]',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  };
  
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 text-xs',
    lg: 'h-11 px-5 text-sm',
  };
  
  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
