import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, ArrowLeft } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface MfaChallengeProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

const MfaChallenge = ({ onSuccess, onCancel }: MfaChallengeProps) => {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleVerify = async () => {
    if (code.length < 6) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;

      const totpFactor = factors.data.totp.find(f => f.status === 'verified');
      if (!totpFactor) {
        throw new Error("Nenhum fator MFA verificado encontrado.");
      }

      const challenge = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.data.id,
        code,
      });

      if (verify.error) throw verify.error;

      toast({
        title: "Sucesso",
        description: "Autenticação MFA concluída.",
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Código inválido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (code.length === 6) {
      handleVerify();
    }
  }, [code]);

  return (
    <div className="space-y-6 max-w-sm mx-auto">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Verificação de Segurança</h2>
        <p className="text-sm text-muted-foreground">
          Sua conta possui MFA ativado. Insira o código de 6 dígitos do seu aplicativo autenticador.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            disabled={loading}
            autoFocus
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        {error && (
          <p className="text-xs text-destructive text-center font-medium animate-in fade-in slide-in-from-top-1">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleVerify} 
            disabled={loading || code.length < 6}
            className="w-full bg-gradient-primary"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Verificar Código"}
          </Button>
          {onCancel && (
            <Button 
              variant="ghost" 
              onClick={onCancel}
              disabled={loading}
              className="w-full text-xs"
            >
              <ArrowLeft className="w-3 h-3 mr-2" /> Voltar ao login
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MfaChallenge;
