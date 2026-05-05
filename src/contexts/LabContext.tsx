import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, set, remove } from 'firebase/database';
import { supabase } from '@/integrations/supabase/client';

async function logSessionToSheet(rollNo: string, tableNumber: number, startTimeSec: number) {
  try {
    await supabase.functions.invoke('log-session', {
      body: {
        rollNo,
        tableNumber,
        startTime: new Date(startTimeSec * 1000).toISOString(),
        endTime: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error('Failed to log session to sheet:', e);
  }
}

export interface TableEntry {
  id: number;
  isOn: boolean;
  manuallyOff: boolean;
  studentRollNo: string | null;
  allottedAt: number | null;
  date: string | null;
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
  getTimeRemaining: (tableId: number) => number;
  getAvailableTables: () => TableEntry[];
}

const LabContext = createContext<LabContextType | null>(null);
const SESSION_DURATION = 3 * 60 * 60;

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// Only Table 1 is active; Tables 2-10 are placeholders (disabled / gray in UI).
export const ACTIVE_TABLE_IDS = [1];
export const TOTAL_TABLES = 10;

function createInitialTables(): TableEntry[] {
  return Array.from({ length: TOTAL_TABLES }, (_, i) => ({
    id: i + 1,
    isOn: false,
    manuallyOff: false,
    studentRollNo: null,
    allottedAt: null,
    date: null,
  }));
}

// Push tables array to Firebase.
// ESP reads /LEDS/led1, /LEDS/led2, /LEDS/led3 (0/1) and /RELAY/status.
function pushTables(tables: TableEntry[]) {
  set(ref(db, 'tables'), tables).catch(console.error);
  // Table 1 controls all 3 relays (Relay_1, Relay_2, Relay_3) together.
  const t1 = tables[0]?.isOn ? 1 : 0;
  set(ref(db, 'RELAYS/Relay_1'), t1).catch(console.error);
  set(ref(db, 'RELAYS/Relay_2'), t1).catch(console.error);
  set(ref(db, 'RELAYS/Relay_3'), t1).catch(console.error);
  // If Table 1 is ON, clear emergency by setting status = "ON".
  if (t1) {
    set(ref(db, 'RELAY/status'), 'ON').catch(console.error);
  }
}

function pushRecords(records: AllocationRecord[]) {
  set(ref(db, 'records'), records).catch(console.error);
}

export const LabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tables, setTables] = useState<TableEntry[]>(createInitialTables);
  const [records, setRecords] = useState<AllocationRecord[]>([]);
  const [, setTick] = useState(0);
  const intervalRef = useRef<number>();
  const remoteSyncRef = useRef(false); // true while applying a remote snapshot (skip echo)

  // Subscribe to Firebase
  useEffect(() => {
    // Cleanup legacy nodes — no longer used.
    remove(ref(db, 'relays')).catch(() => {});
    remove(ref(db, 'LEDS')).catch(() => {});
    const unsubTables = onValue(ref(db, 'tables'), (snap) => {
      const val = snap.val();
      if (Array.isArray(val) && val.length === TOTAL_TABLES) {
        remoteSyncRef.current = true;
        setTables(val);
      } else if (val == null || (Array.isArray(val) && val.length !== TOTAL_TABLES)) {
        // first-run or schema mismatch: seed remote
        pushTables(createInitialTables());
      }
    });
    const unsubRecords = onValue(ref(db, 'records'), (snap) => {
      const val = snap.val();
      remoteSyncRef.current = true;
      setRecords(Array.isArray(val) ? val : []);
    });
    return () => { unsubTables(); unsubRecords(); };
  }, []);

  // 1Hz tick for timers
  useEffect(() => {
    intervalRef.current = window.setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // auto-expire sessions
  useEffect(() => {
    const now = Date.now() / 1000;
    let changed = false;
    const expiring: Array<{ rollNo: string; tableId: number; allottedAt: number }> = [];
    const updated = tables.map(t => {
      if (t.isOn && t.allottedAt && (now - t.allottedAt) >= SESSION_DURATION) {
        changed = true;
        if (t.studentRollNo) expiring.push({ rollNo: t.studentRollNo, tableId: t.id, allottedAt: t.allottedAt });
        return { ...t, isOn: false, studentRollNo: null, allottedAt: null, date: null, manuallyOff: false };
      }
      return t;
    });
    if (changed) {
      setTables(updated);
      pushTables(updated);
      expiring.forEach(e => logSessionToSheet(e.rollNo, e.tableId, e.allottedAt));
    }
  });

  // Mirror local tables to Firebase (skip if change came from remote)
  useEffect(() => {
    if (remoteSyncRef.current) { remoteSyncRef.current = false; return; }
    pushTables(tables);
  }, [tables]);

  useEffect(() => {
    if (remoteSyncRef.current) { remoteSyncRef.current = false; return; }
    pushRecords(records);
  }, [records]);

  const toggleTable = useCallback((id: number) => {
    setTables(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (t.isOn) {
        if (t.studentRollNo && t.allottedAt) {
          logSessionToSheet(t.studentRollNo, t.id, t.allottedAt);
        }
        return { ...t, isOn: false, manuallyOff: false, studentRollNo: null, allottedAt: null, date: null };
      } else {
        return { ...t, isOn: true, manuallyOff: false };
      }
    }));
  }, []);

  const allOffTables = useCallback(() => {
    setTables(prev => {
      prev.forEach(t => {
        if (t.isOn && t.studentRollNo && t.allottedAt) {
          logSessionToSheet(t.studentRollNo, t.id, t.allottedAt);
        }
      });
      return prev.map(t => ({
        ...t, isOn: false, manuallyOff: false, studentRollNo: null, allottedAt: null, date: null,
      }));
    });
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
    setTables(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (t.isOn && t.studentRollNo && t.allottedAt) {
        logSessionToSheet(t.studentRollNo, t.id, t.allottedAt);
      }
      return { ...t, isOn: false, studentRollNo: null, allottedAt: null, date: null, manuallyOff: false };
    }));
  }, []);

  const getTimeRemaining = useCallback((tableId: number): number => {
    const table = tables.find(t => t.id === tableId);
    if (!table || !table.allottedAt) return 0;
    const elapsed = Date.now() / 1000 - table.allottedAt;
    return Math.max(0, SESSION_DURATION - elapsed);
  }, [tables]);

  const allocateSpecificTable = useCallback((rollNo: string, tableId: number): boolean => {
    const table = tables.find(t => t.id === tableId);
    if (!table || table.isOn || table.studentRollNo) return false;
    const now = Date.now() / 1000;
    const date = formatDate(new Date());
    setTables(prev => prev.map(t =>
      t.id === tableId
        ? { ...t, isOn: true, studentRollNo: rollNo, allottedAt: now, date, manuallyOff: false }
        : t
    ));
    setRecords(prev => [...prev, { studentRollNo: rollNo, tableNumber: tableId, date }]);
    return true;
  }, [tables]);

  const getAvailableTables = useCallback((): TableEntry[] => {
    return tables.filter(t => ACTIVE_TABLE_IDS.includes(t.id) && !t.isOn && !t.studentRollNo);
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
