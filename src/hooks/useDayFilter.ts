import { useUI } from './useUI';
import type { Day } from '../types/trip';

export function useDayFilter(days: Day[]) {
  const { selectedDayIds, setSelectedDays } = useUI();

  const toggleDay = (dayId: string) => {
    if (selectedDayIds.includes(dayId)) {
      setSelectedDays(selectedDayIds.filter(id => id !== dayId));
    } else {
      setSelectedDays([...selectedDayIds, dayId]);
    }
  };

  const selectAll = () => setSelectedDays(days.map(d => d.dayId));
  const clearAll = () => setSelectedDays([]);
  const isSelected = (dayId: string) => selectedDayIds.length === 0 || selectedDayIds.includes(dayId);

  // When no days are explicitly selected, show all
  const filteredDayIds = selectedDayIds.length === 0 ? days.map(d => d.dayId) : selectedDayIds;

  return { selectedDayIds: filteredDayIds, toggleDay, selectAll, clearAll, isSelected };
}
