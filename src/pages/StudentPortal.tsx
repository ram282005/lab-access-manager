import { useState } from 'react';
import { useLab } from '@/contexts/LabContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ScanLine, ChevronDown } from 'lucide-react';
import iithLogo from '@/assets/iith-logo.png';

const StudentPortal = () => {
  const [rollNo, setRollNo] = useState('');
  const [selectedTable, setSelectedTable] = useState<number | ''>('');
  const [step, setStep] = useState<'scan' | 'select' | 'done'>('scan');
  const [result, setResult] = useState<{ rollNo: string; tableNo: number } | null>(null);
  const [error, setError] = useState('');
  const { allocateSpecificTable, getAvailableTables } = useLab();
  const navigate = useNavigate();

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!rollNo.trim()) {
      setError('Please enter your Roll Number');
      return;
    }
    setStep('select');
  };

  const handleAllocate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedTable) {
      setError('Please select a table');
      return;
    }
    const success = allocateSpecificTable(rollNo.trim().toUpperCase(), selectedTable);
    if (success) {
      setResult({ rollNo: rollNo.trim().toUpperCase(), tableNo: selectedTable });
      setStep('done');
    } else {
      setError('This table is no longer available. Please select another.');
      setSelectedTable('');
    }
  };

  const handleReset = () => {
    setResult(null);
    setError('');
    setRollNo('');
    setSelectedTable('');
    setStep('scan');
  };

  const availableTables = getAvailableTables();

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Logo */}
      <div className="hidden w-1/2 flex-col items-center justify-center bg-primary p-12 md:flex">
        <img src={iithLogo} alt="IIT Hyderabad Logo" className="mb-8 h-48 w-48 object-contain brightness-0 invert" />
        <h2 className="mb-2 text-center text-2xl font-bold text-primary-foreground">
          Indian Institute of Technology Hyderabad
        </h2>
        <p className="text-center text-primary-foreground/70">
          Electrical Engineering Laboratory
        </p>
      </div>

      {/* Right Side */}
      <div className="flex w-full flex-col md:w-1/2">
        <header className="border-b border-border bg-card px-6 py-4 md:border-0">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="rounded-lg p-2 text-foreground hover:bg-muted">
              <ArrowLeft size={20} />
            </button>
            <span className="text-lg font-semibold text-foreground md:hidden">Student Portal</span>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center p-8">
          {step === 'scan' && (
            <>
              <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
                <ScanLine size={32} className="text-accent" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-foreground">Scan Your ID Card</h1>
              <p className="mb-8 text-center text-muted-foreground">
                Enter your Roll Number to get started
              </p>
              <form onSubmit={handleScan} className="w-full max-w-sm">
                <input
                  type="text"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  placeholder="Enter Roll Number (e.g., EE22BTECH11001)"
                  autoFocus
                  className="mb-4 w-full rounded-xl border-2 border-border bg-card px-5 py-4 text-center font-mono text-lg font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                {error && <p className="mb-4 text-center text-sm font-medium text-destructive">{error}</p>}
                <button
                  type="submit"
                  className="w-full rounded-xl bg-primary py-4 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Next
                </button>
              </form>
            </>
          )}

          {step === 'select' && (
            <>
              <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
                <ScanLine size={32} className="text-accent" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-foreground">Select a Table</h1>
              <p className="mb-2 text-center font-mono text-sm font-semibold text-accent">
                Roll No: {rollNo.trim().toUpperCase()}
              </p>
              <p className="mb-8 text-center text-muted-foreground">
                {availableTables.length} table{availableTables.length !== 1 ? 's' : ''} available
              </p>
              <form onSubmit={handleAllocate} className="w-full max-w-sm">
                <div className="relative mb-4">
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(Number(e.target.value))}
                    className="w-full appearance-none rounded-xl border-2 border-border bg-card px-5 py-4 text-center font-mono text-lg font-medium text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    <option value="">-- Select a Table --</option>
                    {availableTables.map((t) => (
                      <option key={t.id} value={t.id}>
                        Table T-{String(t.id).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
                {error && <p className="mb-4 text-center text-sm font-medium text-destructive">{error}</p>}
                <button
                  type="submit"
                  className="mb-3 w-full rounded-xl bg-primary py-4 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Allocate Table
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full rounded-xl bg-secondary py-3 text-base font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
                >
                  Back
                </button>
              </form>
            </>
          )}

          {step === 'done' && result && (
            <div className="w-full max-w-sm text-center">
              <div className="mb-6 rounded-2xl border-2 border-success bg-success/5 p-8">
                <div className="mb-1 text-sm font-medium text-muted-foreground">Student Roll Number</div>
                <div className="mb-6 font-mono text-xl font-bold text-foreground">{result.rollNo}</div>
                <div className="mb-1 text-sm font-medium text-muted-foreground">Allotted Table Number</div>
                <div className="text-5xl font-extrabold text-success">T-{String(result.tableNo).padStart(2, '0')}</div>
                <div className="mt-6 text-sm text-muted-foreground">Session Duration: 3 Hours</div>
              </div>
              <button
                onClick={handleReset}
                className="w-full rounded-xl bg-secondary py-3 text-base font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
              >
                Scan Another ID
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentPortal;
