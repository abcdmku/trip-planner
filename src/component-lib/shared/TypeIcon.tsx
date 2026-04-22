import {
  Bed,
  Bus,
  Landmark,
  MapPin,
  Target,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import type { ItemType } from '@/types/trip';

const TYPE_MAP: Record<ItemType, { icon: LucideIcon; color: string; bg: string }> = {
  attraction: {
    icon: Landmark,
    color: 'text-blue-600 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-500/12',
  },
  restaurant: {
    icon: UtensilsCrossed,
    color: 'text-orange-600 dark:text-orange-300',
    bg: 'bg-orange-50 dark:bg-orange-500/12',
  },
  hotel: {
    icon: Bed,
    color: 'text-violet-600 dark:text-violet-300',
    bg: 'bg-violet-50 dark:bg-violet-500/12',
  },
  transport: {
    icon: Bus,
    color: 'text-emerald-600 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-500/12',
  },
  activity: {
    icon: Target,
    color: 'text-pink-600 dark:text-pink-300',
    bg: 'bg-pink-50 dark:bg-pink-500/12',
  },
  other: {
    icon: MapPin,
    color: 'text-stone-600 dark:text-stone-300',
    bg: 'bg-stone-100 dark:bg-stone-500/12',
  },
};

export interface TypeIconProps {
  type: ItemType;
  size?: 'sm' | 'md' | 'lg';
  showBackground?: boolean;
}

export function TypeIcon({
  type,
  size = 'md',
  showBackground = true,
}: TypeIconProps) {
  const config = TYPE_MAP[type] || TYPE_MAP.other;
  const Icon = config.icon;

  const sizeClasses = {
    sm: showBackground ? 'h-5 w-5' : 'h-3 w-3',
    md: showBackground ? 'h-7 w-7' : 'h-4 w-4',
    lg: showBackground ? 'h-9 w-9' : 'h-5 w-5',
  };

  const iconSizes = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3.5 w-3.5',
    lg: 'h-4.5 w-4.5',
  };

  if (!showBackground) {
    return <Icon className={`${iconSizes[size]} ${config.color}`} />;
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg ${config.bg} ${sizeClasses[size]}`}
    >
      <Icon className={`${iconSizes[size]} ${config.color}`} />
    </span>
  );
}
