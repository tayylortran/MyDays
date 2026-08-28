import { createContext, ReactNode, useContext, useState } from 'react';

type CalendarMonthContextValue = {
  year: number;
  month: number;
  prev: () => void;
  next: () => void;
};

const CalendarMonthContext = createContext<CalendarMonthContextValue | undefined>(undefined);

export function CalendarMonthProvider({ children }: { children: ReactNode }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));

  const prev = () => {
    setCurrentMonth(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    );
  };

  const next = () => {
    setCurrentMonth(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    );
  };

  return (
    <CalendarMonthContext.Provider
      value={{
        year: currentMonth.year,
        month: currentMonth.month,
        prev,
        next,
      }}
    >
      {children}
    </CalendarMonthContext.Provider>
  );
}

export function useCalendarMonth() {
  const context = useContext(CalendarMonthContext);

  if (!context) {
    throw new Error('useCalendarMonth must be used within a CalendarMonthProvider');
  }

  return context;
}
