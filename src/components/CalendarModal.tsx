import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Calendar as CalendarIcon
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  eachDayOfInterval,
  parseISO
} from 'date-fns';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddReminder: (reminder: any) => void;
}

export function CalendarModal({ isOpen, onClose, onAddReminder }: CalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
          <CalendarIcon className="text-brand-500" size={24} />
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 mb-4">
        {days.map((day) => (
          <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    const rows = [];
    let days = [];

    calendarDays.forEach((day, i) => {
      const formattedDate = format(day, 'd');
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isToday = isSameDay(day, new Date());

      days.push(
        <button
          key={day.toString()}
          className={`relative h-14 flex flex-col items-center justify-center rounded-2xl transition-all ${!isCurrentMonth
              ? "text-slate-200"
              : isToday
                ? "bg-brand-500 text-white shadow-lg shadow-brand-200 font-bold"
                : "text-slate-700 hover:bg-slate-50"
            }`}
        >
          <span className="text-sm">{formattedDate}</span>
          {isToday && (
            <motion.div
              layoutId="today-dot"
              className="absolute bottom-2 w-1 h-1 bg-white rounded-full"
            />
          )}
        </button>
      );

      if ((i + 1) % 7 === 0) {
        rows.push(
          <div className="grid grid-cols-7 gap-1" key={day.toString()}>
            {days}
          </div>
        );
        days = [];
      }
    });

    return <div className="space-y-1">{rows}</div>;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all z-10"
            >
              <X size={20} />
            </button>

            <div className="p-8">
              {renderHeader()}
              {renderDays()}
              {renderCells()}

              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-brand-500 rounded-full" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today</span>
                </div>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 uppercase tracking-wider"
                >
                  Jump to Today
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
