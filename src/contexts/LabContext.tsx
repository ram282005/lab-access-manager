import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

export interface TableEntry {
  id: number;
  isOn: boolean;
  manuallyOff: boolean;
  studentRollNo: string | null;
  allottedAt: number | null; // timestamp
  date: string | null; // DD-MM-YYYY
}

export interface AllocationRecord {
  studentRollNo: string;
  tableNumber: number;
  date: string;
}

interface LabContextType {
  tables: TableEntry[];
  records: AllocationRecord[];
  toggleTable: (id: number) => void;
  allOffTables: () => void;
  allocateTable: (rollNo: string) => number | null;
  allocateSpecificTable: (rollNo: string, tableId: number) => boolean;
  deallocateTable: (id: number) => void;
  getTimeRemaining: (tableId: number) => number; // seconds remaining
  getAvailableTables: () => TableEntry[];
}

const LabContext = createContext<LabContextType | null>(null);

const SESSION_DURATION = 3 * 60 * 60; // 3 hours in seconds

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function createInitialTables(): TableEntry[] {
  return Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    isOn: false,
    manuallyOff: false,
    studentRollNo: null,
    allottedAt: null,
    date: null,
  }));
}

export const LabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tables, setTables] = useState<TableEntry[]>(() => {
    const saved = localStorage.getItem('lab_tables');
    return saved ? JSON.parse(saved) : createInitialTables();
  });

  const [records, setRecords] = useState<AllocationRecord[]>(() => {
    const saved = localStorage.getItem('lab_records');
    return saved ? JSON.parse(saved) : [];
  });

  const [, setTick] = useState(0);
  const intervalRef = useRef<number>();

  // tick every second for timers
  useEffect(() => {
    intervalRef.current = window.setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // auto-expire sessions
  useEffect(() => {
    const now = Date.now() / 1000;
    let changed = false;
    const updated = tables.map(t => {
      if (t.isOn && t.allottedAt && (now - t.allottedAt) >= SESSION_DURATION) {
        changed = true;
        return { ...t, isOn: false, studentRollNo: null, allottedAt: null, date: null, manuallyOff: false };
      }
      return t;
    });
    if (changed) setTables(updated);
  });

  useEffect(() => {
    localStorage.setItem('lab_tables', JSON.stringify(tables));
  }, [tables]);

  useEffect(() => {
    localStorage.setItem('lab_records', JSON.stringify(records));
  }, [records]);

  const toggleTable = useCallback((id: number) => {
    setTables(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (t.isOn) {
        // turning off
        return { ...t, isOn: false, manuallyOff: false, studentRollNo: null, allottedAt: null, date: null };
      } else {
        return { ...t, isOn: true, manuallyOff: false };
      }
    }));
  }, []);

  const allOffTables = useCallback(() => {
    setTables(prev => prev.map(t => ({
      ...t, isOn: false, manuallyOff: false, studentRollNo: null, allottedAt: null, date: null,
    })));
  }, []);

  const allocateTable = useCallback((rollNo: string): number | null => {
    let allocatedId: number | null = null;
    setTables(prev => {
      const available = prev.find(t => !t.isOn && !t.studentRollNo);
      if (!available) return prev;
      allocatedId = available.id;
      const now = Date.now() / 1000;
      const date = formatDate(new Date());
      return prev.map(t =>
        t.id === available.id
          ? { ...t, isOn: true, studentRollNo: rollNo, allottedAt: now, date, manuallyOff: false }
          : t
      );
    });
    if (allocatedId) {
      const date = formatDate(new Date());
      setRecords(prev => [...prev, { studentRollNo: rollNo, tableNumber: allocatedId!, date }]);
    }
    return allocatedId;
  }, []);

  const deallocateTable = useCallback((id: number) => {
    setTables(prev => prev.map(t =>
      t.id === id
        ? { ...t, isOn: false, studentRollNo: null, allottedAt: null, date: null, manuallyOff: false }
        : t
    ));
  }, []);

  const getTimeRemaining = useCallback((tableId: number): number => {
    const table = tables.find(t => t.id === tableId);
    if (!table || !table.allottedAt) return 0;
    const elapsed = Date.now() / 1000 - table.allottedAt;
    return Math.max(0, SESSION_DURATION - elapsed);
  }, [tables]);

  const allocateSpecificTable = useCallback((rollNo: string, tableId: number): boolean => {
    let success = false;
    setTables(prev => {
      const table = prev.find(t => t.id === tableId);
      if (!table || table.isOn || table.studentRollNo) return prev;
      success = true;
      const now = Date.now() / 1000;
      const date = formatDate(new Date());
      return prev.map(t =>
        t.id === tableId
          ? { ...t, isOn: true, studentRollNo: rollNo, allottedAt: now, date, manuallyOff: false }
          : t
      );
    });
    if (success) {
      const date = formatDate(new Date());
      setRecords(prev => [...prev, { studentRollNo: rollNo, tableNumber: tableId, date }]);
    }
    return success;
  }, []);

  const getAvailableTables = useCallback((): TableEntry[] => {
    return tables.filter(t => !t.isOn && !t.studentRollNo);
  }, [tables]);

  return (
    <LabContext.Provider value={{ tables, records, toggleTable, allOffTables, allocateTable, allocateSpecificTable, deallocateTable, getTimeRemaining, getAvailableTables }}>
      {children}
    </LabContext.Provider>
  );
};

export const useLab = () => {
  const ctx = useContext(LabContext);
  if (!ctx) throw new Error('useLab must be used within LabProvider');
  return ctx;
};
