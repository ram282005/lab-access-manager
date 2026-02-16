import { useLab } from '@/contexts/LabContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Power, PowerOff } from 'lucide-react';

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const StaffPortal = () => {
  const { tables, toggleTable, allOffTables, getTimeRemaining, deallocateTable } = useLab();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-primary px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="rounded-lg p-2 text-primary-foreground hover:bg-primary-foreground/10">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">Technical Staff Portal</h1>
              <p className="text-sm text-primary-foreground/70">Electrical Lab — Power Management</p>
            </div>
          </div>
          <button
            onClick={allOffTables}
            className="flex items-center gap-2 rounded-lg bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
          >
            <PowerOff size={16} />
            ALL OFF
          </button>
        </div>
      </header>

      {/* Tables as a proper HTML table */}
      <main className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex items-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-success" /> Available</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-accent" /> Occupied</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-muted-foreground" /> Off</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="px-4 py-3 text-left font-semibold text-foreground">Table</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Student</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Time Remaining</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((table) => {
                const remaining = getTimeRemaining(table.id);
                const isOccupied = table.isOn && table.studentRollNo;
                const isAvailableOn = table.isOn && !table.studentRollNo;

                return (
                  <tr key={table.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-bold text-foreground">T-{String(table.id).padStart(2, '0')}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            isOccupied ? 'bg-accent' : table.isOn ? 'bg-success' : 'bg-muted-foreground'
                          }`}
                        />
                        <span className={`text-xs font-medium ${
                          isOccupied ? 'text-accent' : table.isOn ? 'text-success' : table.manuallyOff ? 'text-destructive' : 'text-muted-foreground'
                        }`}>
                          {isOccupied ? 'Occupied' : isAvailableOn ? 'Available' : table.manuallyOff ? 'Manually OFF' : 'Off'}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-foreground">{table.studentRollNo || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{table.date || '—'}</td>
                    <td className="px-4 py-3 font-mono text-accent">{isOccupied ? formatTimer(remaining) : '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          if (isOccupied) {
                            deallocateTable(table.id);
                          } else {
                            toggleTable(table.id);
                          }
                        }}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          table.isOn
                            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                            : 'bg-success text-success-foreground hover:bg-success/90'
                        }`}
                      >
                        {table.isOn ? <PowerOff size={14} /> : <Power size={14} />}
                        {table.isOn ? (isOccupied ? 'End Session' : 'OFF') : 'ON'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default StaffPortal;
