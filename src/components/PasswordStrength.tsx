import { useMemo } from "react";
import { motion } from "framer-motion";

interface PasswordStrengthProps {
  password: string;
}

function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: "Fraca", color: "bg-destructive" };
  if (score <= 2) return { score: 2, label: "Razoável", color: "bg-warning" };
  if (score <= 3) return { score: 3, label: "Boa", color: "bg-primary" };
  return { score: 4, label: "Forte", color: "bg-success" };
}

const PasswordStrength = ({ password }: PasswordStrengthProps) => {
  const strength = useMemo(() => getStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="space-y-1" role="status" aria-live="polite" aria-label={`Força da senha: ${strength.label}`}>
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <motion.div
            key={level}
            className={`h-1 flex-1 rounded-full transition-colors ${
              level <= strength.score ? strength.color : "bg-muted"
            }`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: level * 0.05 }}
          />
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Força: <span className="font-medium">{strength.label}</span>
      </p>
    </div>
  );
};

export default PasswordStrength;
