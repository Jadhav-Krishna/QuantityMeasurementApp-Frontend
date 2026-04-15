import { Eye, EyeOff, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BalanceLogo } from "../components/BalanceLogo";
import { GoogleIcon } from "../components/GoogleIcon";
import { clearAuth, consumeOAuthReturnTo, fetchAuthStatus, fetchCurrentUser, loginOrRegister, saveAuth, startGoogleLogin } from "../lib/auth";
import { resetGuestUses } from "../lib/measurement";

type Mode = "login" | "signup";

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loginVisible, setLoginVisible] = useState(false);
  const [signupVisible, setSignupVisible] = useState(false);
  const [loginStatus, setLoginStatus] = useState("");
  const [signupStatus, setSignupStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const returnTo = searchParams.get("returnTo") ?? consumeOAuthReturnTo() ?? "/measurement";

  const loginError = useMemo(() => {
    if (!loginEmail || !loginPassword) return "";
    if (!/\S+@\S+\.\S+/.test(loginEmail)) return "Please enter a valid email address.";
    if (loginPassword.length < 6 || loginPassword.length > 100) return "Password must be 6-100 characters.";
    return "";
  }, [loginEmail, loginPassword]);

  const signupError = useMemo(() => {
    if (!signupName || !signupEmail || !signupPassword) return "";
    if (!/^[A-Za-z ]{3,40}$/.test(signupName)) return "Full name should contain only letters and spaces.";
    if (!/\S+@\S+\.\S+/.test(signupEmail)) return "Please enter a valid email address.";
    if (!/^(?=.*[A-Za-z])(?=.*\d).{6,100}$/.test(signupPassword)) {
      return "Password must be 6-100 characters with at least one letter and one number.";
    }
    return "";
  }, [signupName, signupEmail, signupPassword]);

  useEffect(() => {
    const token = searchParams.get("token") ?? searchParams.get("accessToken");
    const authError = searchParams.get("error");

    if (token) {
      fetchCurrentUser(token)
        .then((user) => {
          saveAuth({ accessToken: token, user });
          resetGuestUses();
          navigate(returnTo, { replace: true });
        })
        .catch(() => {
          clearAuth();
          setLoginStatus("Google sign-in failed. Please try again.");
        });
      return;
    }

    if (authError) {
      clearAuth();
      setLoginStatus("Google sign-in failed. Please try again.");
    }
  }, [navigate, returnTo, searchParams]);

  useEffect(() => {
    if (searchParams.get("token") || searchParams.get("accessToken")) {
      return;
    }

    fetchAuthStatus()
      .then((status) => {
        if (status.authenticated) {
          navigate(returnTo, { replace: true });
        }
      })
      .catch(() => {});
  }, [navigate, returnTo, searchParams]);

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginStatus("Please fill out all fields.");
      return;
    }
    if (loginError) {
      setLoginStatus(loginError);
      return;
    }

    setLoading(true);
    setLoginStatus("Logging in...");

    try {
      const response = await loginOrRegister("/auth/login", { email: loginEmail, password: loginPassword });
      saveAuth(response);
      resetGuestUses();
      navigate(returnTo, { replace: true });
    } catch (error) {
      setLoginStatus(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const submitSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!signupName || !signupEmail || !signupPassword) {
      setSignupStatus("Please fill out all fields.");
      return;
    }
    if (signupError) {
      setSignupStatus(signupError);
      return;
    }

    setLoading(true);
    setSignupStatus("Creating your account...");

    try {
      const response = await loginOrRegister("/auth/register", {
        name: signupName,
        email: signupEmail,
        password: signupPassword
      });
      saveAuth(response);
      resetGuestUses();
      navigate(returnTo, { replace: true });
    } catch (error) {
      setSignupStatus(error instanceof Error ? error.message : "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    startGoogleLogin(returnTo);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
      <section className="relative w-full max-w-6xl space-y-6">
        <section className="relative grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="rounded-[32px] border border-white/60 bg-white/90 p-8 shadow-auth backdrop-blur md:p-12">
          <div className="mx-auto flex max-w-md flex-col items-center text-center">
            <div className="flex h-56 w-56 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 via-[#eef5ff] to-[#dbe7ff] shadow-panel sm:h-64 sm:w-64">
              <BalanceLogo className="h-44 w-44 sm:h-52 sm:w-52" />
            </div>
            <h1 className="mt-8 text-3xl font-bold tracking-wide text-slate-900 sm:text-4xl">
              QUANTITY MEASUREMENT APP
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-500 sm:text-base">
              Sign in to save history, view credits, and make payments. Every guest gets 5 free calculation credits before recharge is needed.
            </p>
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-left">
              <p className="text-sm font-semibold text-amber-900">Guest users get 5 free measurement credits.</p>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                You can start calculating right away, then log in later when you want history and recharge access.
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-auth backdrop-blur sm:p-8">
          <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            {(["login", "signup"] as Mode[]).map((currentMode) => (
              <button
                key={currentMode}
                type="button"
                onClick={() => {
                  setMode(currentMode);
                  setLoginStatus("");
                  setSignupStatus("");
                }}
                className={`rounded-xl px-4 py-3 text-sm font-semibold tracking-wide transition ${
                  mode === currentMode ? "bg-white text-slate-900 shadow" : "text-slate-500"
                }`}
              >
                {currentMode.toUpperCase()}
              </button>
            ))}
          </div>

          {mode === "login" ? (
            <form className="mt-8 space-y-5" onSubmit={submitLogin}>
              <FieldLabel htmlFor="loginEmail" label="Email" />
              <FieldInput
                id="loginEmail"
                type="email"
                value={loginEmail}
                onChange={(value) => {
                  setLoginEmail(value);
                  setLoginStatus("");
                }}
              />

              <FieldLabel htmlFor="loginPassword" label="Password" />
              <PasswordField
                id="loginPassword"
                value={loginPassword}
                visible={loginVisible}
                onToggle={() => setLoginVisible((current) => !current)}
                onChange={(value) => {
                  setLoginPassword(value);
                  setLoginStatus("");
                }}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#ad2f39] px-4 py-3 text-base font-semibold text-white transition hover:bg-[#972833] disabled:cursor-not-allowed disabled:opacity-70"
              >
                Login
              </button>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
                >
                  <GoogleIcon />
                  <span>Google Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/measurement")}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 font-semibold text-amber-900 transition hover:bg-amber-100"
                >
                  <UserRound className="h-5 w-5" />
                  <span>Guest User</span>
                </button>
              </div>
              <StatusText text={loginStatus || loginError} />
            </form>
          ) : (
            <form className="mt-8 space-y-5" onSubmit={submitSignup}>
              <FieldLabel htmlFor="signupName" label="Full Name" />
              <FieldInput
                id="signupName"
                value={signupName}
                onChange={(value) => {
                  setSignupName(value);
                  setSignupStatus("");
                }}
              />

              <FieldLabel htmlFor="signupEmail" label="Email" />
              <FieldInput
                id="signupEmail"
                type="email"
                value={signupEmail}
                onChange={(value) => {
                  setSignupEmail(value);
                  setSignupStatus("");
                }}
              />

              <FieldLabel htmlFor="signupPassword" label="Password" />
              <PasswordField
                id="signupPassword"
                value={signupPassword}
                visible={signupVisible}
                onToggle={() => setSignupVisible((current) => !current)}
                onChange={(value) => {
                  setSignupPassword(value);
                  setSignupStatus("");
                }}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#ad2f39] px-4 py-3 text-base font-semibold text-white transition hover:bg-[#972833] disabled:cursor-not-allowed disabled:opacity-70"
              >
                Signup
              </button>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
                >
                  <GoogleIcon />
                  <span>Google Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/measurement")}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 font-semibold text-amber-900 transition hover:bg-amber-100"
                >
                  <UserRound className="h-5 w-5" />
                  <span>Guest User</span>
                </button>
              </div>
              <StatusText text={signupStatus || signupError} />
            </form>
          )}
        </section>
        </section>
      </section>
    </main>
  );
}

function FieldLabel({ htmlFor, label }: { htmlFor: string; label: string }) {
  return <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800">{label}</label>;
}

function FieldInput({
  id,
  type = "text",
  value,
  onChange
}: {
  id: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
    />
  );
}

function PasswordField({
  id,
  value,
  visible,
  onToggle,
  onChange
}: {
  id: string;
  value: string;
  visible: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative mt-2">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-900"
      >
        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}

function StatusText({ text }: { text: string }) {
  return <p className="min-h-6 text-sm font-medium text-[#ad2f39]">{text}</p>;
}
