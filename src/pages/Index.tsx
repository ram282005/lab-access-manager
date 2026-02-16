import { useNavigate } from 'react-router-dom';
import { Monitor, User } from 'lucide-react';
import iithLogo from '@/assets/iith-logo.png';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <img src={iithLogo} alt="IIT Hyderabad Logo" className="mb-6 h-28 w-28 object-contain" />
      <h1 className="mb-2 text-3xl font-bold text-foreground">
        Indian Institute of Technology Hyderabad
      </h1>
      <p className="mb-10 text-lg text-muted-foreground">Electrical Engineering Laboratory Portal</p>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
        <button
          onClick={() => navigate('/staff')}
          className="group flex flex-col items-center gap-4 rounded-xl border-2 border-border bg-card p-10 shadow-sm transition-all hover:border-primary hover:shadow-lg"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-110">
            <Monitor size={28} />
          </div>
          <span className="text-xl font-semibold text-foreground">Technical Staff Portal</span>
          <span className="text-sm text-muted-foreground">Manage tables & power supply</span>
        </button>

        <button
          onClick={() => navigate('/student')}
          className="group flex flex-col items-center gap-4 rounded-xl border-2 border-border bg-card p-10 shadow-sm transition-all hover:border-accent hover:shadow-lg"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground transition-transform group-hover:scale-110">
            <User size={28} />
          </div>
          <span className="text-xl font-semibold text-foreground">Student Portal</span>
          <span className="text-sm text-muted-foreground">Scan ID & get table allocation</span>
        </button>
      </div>
    </div>
  );
};

export default Index;
