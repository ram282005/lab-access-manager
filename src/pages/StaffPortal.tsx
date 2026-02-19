import { useState } from 'react';
import { useLab } from '@/contexts/LabContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Power, PowerOff, Lock } from 'lucide-react';

const STAFF_PASSWORD = '12345678';

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const StaffPortal = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { tables, toggleTable, allOffTables, getTimeRemaining, deallocateTable } = useLab();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === STAFF_PASSWORD) {
      setAuthenticated(true);
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password. Please try again.');
    }
  };

  if (!authenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Lock size={32} className="text-primary" />
            </div>
            <h1 className="mb-1 text-2xl font-bold text-foreground">Staff Login</h1>
            <p className="text-sm text-muted-foreground">Enter password to access the portal</p>
          </div>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password"
              autoFocus
              className="mb-4 w-full rounded-xl border-2 border-border bg-card px-5 py-4 text-center text-lg font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {passwordError && (
              <p className="mb-4 text-center text-sm font-medium text-destructive">{passwordError}</p>
            )}
            <button
              type="submit"
              className="mb-3 w-full rounded-xl bg-primary py-4 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full rounded-xl bg-secondary py-3 text-base font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              Back to Home
            </button>
          </form>
        </div>
      </div>
    );
  }

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

      {/* Table */}
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
