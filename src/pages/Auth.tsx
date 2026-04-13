import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Mail, Lock, Loader2, Eye, EyeOff, Shield, Sparkles } from "lucide-react";
import PasswordStrength from "@/components/PasswordStrength";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Navigate } from "react-router-dom";
import AuthLeftPanel from "@/components/AuthLeftPanel";

type AuthMode = "login" | "signup" | "forgot";

const Auth = () => {
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const { toast } = useToast();

  const emailError = useMemo(() => { if (!touched.email || !email) return ""; return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "" : "E-mail inválido"; }, [email, touched.email]);
  const passwordError = useMemo(() => { if (!touched.password || !password || mode === "forgot") return ""; return password.length < 6 ? "Mínimo de 6 caracteres" : ""; }, [password, touched.password, mode]);

  if (authLoading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") { const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }); if (error) throw error; toast({ title: "E-mail enviado", description: "Verifique sua caixa de entrada para redefinir a senha." }); setMode("login"); }
      else if (mode === "signup") { const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } }); if (error) throw error; toast({ title: "Conta criada!", description: "Verifique seu e-mail para confirmar o cadastro." }); }
      else { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; }
    } catch (error: unknown) { toast({ title: "Erro", description: error instanceof Error ? error.message : "Ocorreu um erro. Tente novamente.", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const headingText = { login: "Bem-vindo de volta", signup: "Crie sua conta", forgot: "Recupere sua senha" };
  const subtitleText = { login: "Entre com suas credenciais para continuar", signup: "Preencha os dados para começar", forgot: "Enviaremos um link para redefinir sua senha" };

  return (
    <div className="min-h-screen bg-background flex" role="main">
      <a href="#auth-form" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring">Pular para o formulário</a>
      <AuthLeftPanel />

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-8">
          <div className="flex lg:hidden items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow"><Layers className="w-6 h-6 text-primary-foreground" aria-hidden="true" /></div>
            <span className="text-xl font-display font-bold text-foreground">Promo Design</span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">{headingText[mode]}</h1>
            <p className="text-sm text-foreground/60 mt-1" id="auth-description">{subtitleText[mode]}</p>
          </div>

          <form id="auth-form" onSubmit={handleSubmit} className="space-y-5" aria-describedby="auth-description" aria-label={headingText[mode]}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" /><Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, email: true }))} className={`pl-10 h-12 bg-surface-1 border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${emailError ? "border-destructive" : ""}`} required autoComplete="email" aria-required="true" aria-invalid={!!emailError} aria-describedby={emailError ? "email-error" : undefined} /></div>
              {emailError && <p id="email-error" className="text-xs text-destructive mt-1">{emailError}</p>}
            </div>
            <AnimatePresence mode="wait">
              {mode !== "forgot" && (
                <motion.div key="password" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
                  <div className="flex items-center justify-between"><Label htmlFor="password">Senha</Label>{mode === "login" && <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">Esqueceu a senha?</button>}</div>
                  <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" /><Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, password: true }))} className={`pl-10 pr-10 h-12 bg-surface-1 border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${passwordError ? "border-destructive" : ""}`} required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} aria-required="true" aria-invalid={!!passwordError} aria-describedby={passwordError ? "password-error" : undefined} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">{showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}</button></div>
                  {passwordError && <p id="password-error" className="text-xs text-destructive mt-1">{passwordError}</p>}
                  {mode === "signup" && <PasswordStrength password={password} />}
                </motion.div>
              )}
            </AnimatePresence>
            <Button type="submit" disabled={loading} className="w-full h-12 text-base font-semibold bg-gradient-primary text-primary-foreground shadow-lg hover:shadow-primary/25 transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" aria-busy={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <><Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />{mode === "login" && "Entrar"}{mode === "signup" && "Criar conta"}{mode === "forgot" && "Enviar link"}</>}
            </Button>
          </form>

          {mode !== "forgot" && (
            <>
              <div className="relative" role="separator"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div><div className="relative flex justify-center text-xs"><span className="bg-background px-3 text-muted-foreground uppercase tracking-wider">ou</span></div></div>
              <div className="space-y-3" role="group" aria-label="Login social">
                <Button type="button" variant="outline" className="w-full h-12 border-border hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" aria-label="Entrar com Google" onClick={async () => { const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin }); if (error) toast({ title: "Erro", description: String(error), variant: "destructive" }); }}>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>Entrar com Google
                </Button>
                <Button type="button" variant="outline" className="w-full h-12 border-border hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" aria-label="Entrar com Apple" onClick={async () => { const { error } = await lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin }); if (error) toast({ title: "Erro", description: String(error), variant: "destructive" }); }}>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>Entrar com Apple
                </Button>
              </div>
            </>
          )}

          <div className="text-center text-sm text-muted-foreground">
            {mode === "login" && <p>Não tem uma conta?{" "}<button onClick={() => setMode("signup")} className="text-primary hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">Registre-se</button></p>}
            {mode === "signup" && <p>Já tem conta?{" "}<button onClick={() => setMode("login")} className="text-primary hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">Entrar</button></p>}
            {mode === "forgot" && <button onClick={() => setMode("login")} className="text-primary hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">Voltar ao login</button>}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2"><Shield className="w-3.5 h-3.5" aria-hidden="true" /><span>Conexão segura · Dados criptografados</span></div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
