import { Eye, EyeOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BalanceLogo } from "../components/BalanceLogo";
import { GoogleIcon } from "../components/GoogleIcon";
import { clearAuth, fetchAuthStatus, fetchCurrentUser, loginOrRegister, saveAuth, saveUser, startGoogleLogin } from "../lib/auth";

type Mode = "login" | "signup";

type LoginForm = {
  email: string;
  password: string;
};

type SignupForm = {
  name: string;
  email: string;
  password: string;
  mobile: string;
};

const initialLogin: LoginForm = {
  email: "",
  password: ""
};

const initialSignup: SignupForm = {
  name: "",
  email: "",
  password: "",
  mobile: ""
};

export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signup");
  const [loginForm, setLoginForm] = useState<LoginForm>(initialLogin);
  const [signupForm, setSignupForm] = useState<SignupForm>(initialSignup);
  const [loginVisible, setLoginVisible] = useState(false);
  const [signupVisible, setSignupVisible] = useState(false);
  const [loginStatus, setLoginStatus] = useState("");
  const [signupStatus, setSignupStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const loginError = useMemo(() => {
    if (!loginForm.email || !loginForm.password) {
      return "";
    }
    if (!/\S+@\S+\.\S+/.test(loginForm.email)) {
      return "Please enter a valid email address.";
    }
    if (loginForm.password.length < 6 || loginForm.password.length > 100) {
      return "Password must be 6-100 characters.";
    }
    return "";
  }, [loginForm]);

  const signupError = useMemo(() => {
    if (!signupForm.name || !signupForm.email || !signupForm.password || !signupForm.mobile) {
      return "";
    }
    if (!/^[A-Za-z ]{3,40}$/.test(signupForm.name)) {
      return "Full name should contain only letters and spaces.";
    }
    if (!/\S+@\S+\.\S+/.test(signupForm.email)) {
      return "Please enter a valid email address.";
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{6,100}$/.test(signupForm.password)) {
      return "Password must be 6-100 characters and include at least one letter and one number.";
    }
    if (!/^\d{10}$/.test(signupForm.mobile)) {
      return "Mobile number must be exactly 10 digits.";
    }
    return "";
  }, [signupForm]);

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (token) {
        try {
          const user = await fetchCurrentUser(token);
          saveAuth({ accessToken: token, user });
          window.history.replaceState({}, document.title, window.location.pathname);
          navigate("/measurement", { replace: true });
          return;
        } catch {
          clearAuth();
        }
      }

      try {
        const status = await fetchAuthStatus();
        if (status.authenticated) {
          if (status.user) {
            saveUser(status.user);
          }
          navigate("/measurement", { replace: true });
        }
      } catch {
        clearAuth();
      }
    };

    void run();
  }, [navigate]);

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!loginForm.email || !loginForm.password) {
      setLoginStatus("Please fill out all login fields.");
      return;
    }

    if (loginError) {
      setLoginStatus(loginError);
      return;
    }

    setLoading(true);
    setLoginStatus("Logging in...");

    try {
      const response = await loginOrRegister("/auth/login", loginForm);
      saveAuth(response);
      navigate("/measurement", { replace: true });
    } catch (error) {
      setLoginStatus(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const submitSignup = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!signupForm.name || !signupForm.email || !signupForm.password || !signupForm.mobile) {
      setSignupStatus("Please fill out all signup fields.");
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
        name: signupForm.name,
        email: signupForm.email,
        password: signupForm.password
      });
      saveAuth(response);
      navigate("/measurement", { replace: true });
    } catch (error) {
      setSignupStatus(error instanceof Error ? error.message : "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
      <section className="relative grid w-full max-w-6xl gap-6 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="rounded-[32px] border border-white/60 bg-white/90 p-8 shadow-auth backdrop-blur md:p-12">
          <div className="mx-auto flex max-w-md flex-col items-center text-center">
            <div className="flex h-56 w-56 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 via-[#eef5ff] to-[#dbe7ff] shadow-panel sm:h-64 sm:w-64">
              <BalanceLogo className="h-44 w-44 sm:h-52 sm:w-52" />
            </div>
            <h1 className="mt-8 text-3xl font-bold tracking-wide text-slate-900 sm:text-4xl">QUANTITY MEASUREMENT APP</h1>
            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-500 sm:text-base">
              Sign in to compare, convert, and calculate quantity measurements with your backend-powered app.
            </p>
          </div>
        </div>

        <section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-auth backdrop-blur sm:p-8">
          <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setLoginStatus("");
                setSignupStatus("");
              }}
              className={`rounded-xl px-4 py-3 text-sm font-semibold tracking-wide transition ${
                mode === "login" ? "bg-white text-slate-900 shadow" : "text-slate-500"
              }`}
            >
              LOGIN
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setLoginStatus("");
                setSignupStatus("");
              }}
              className={`rounded-xl px-4 py-3 text-sm font-semibold tracking-wide transition ${
                mode === "signup" ? "bg-white text-slate-900 shadow" : "text-slate-500"
              }`}
            >
              SIGNUP
            </button>
          </div>

          {mode === "login" ? (
            <form className="mt-8 space-y-5" onSubmit={submitLogin}>
              <FieldLabel htmlFor="loginEmail" label="Email Id" />
              <FieldInput
                id="loginEmail"
                type="email"
                value={loginForm.email}
                onChange={(value) => {
                  setLoginForm((current) => ({ ...current, email: value }));
                  setLoginStatus("");
                }}
              />

              <FieldLabel htmlFor="loginPassword" label="Password" />
              <PasswordField
                id="loginPassword"
                value={loginForm.password}
                visible={loginVisible}
                onToggle={() => setLoginVisible((current) => !current)}
                onChange={(value) => {
                  setLoginForm((current) => ({ ...current, password: value }));
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

              <button
                type="button"
                onClick={startGoogleLogin}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>

              <StatusText text={loginStatus || loginError} />
            </form>
          ) : (
            <form className="mt-8 space-y-5" onSubmit={submitSignup}>
              <FieldLabel htmlFor="signupName" label="Full Name" />
              <FieldInput
                id="signupName"
                value={signupForm.name}
                onChange={(value) => {
                  setSignupForm((current) => ({ ...current, name: value }));
                  setSignupStatus("");
                }}
              />

              <FieldLabel htmlFor="signupEmail" label="Email Id" />
              <FieldInput
                id="signupEmail"
                type="email"
                value={signupForm.email}
                onChange={(value) => {
                  setSignupForm((current) => ({ ...current, email: value }));
                  setSignupStatus("");
                }}
              />

              <FieldLabel htmlFor="signupPassword" label="Password" />
              <PasswordField
                id="signupPassword"
                value={signupForm.password}
                visible={signupVisible}
                onToggle={() => setSignupVisible((current) => !current)}
                onChange={(value) => {
                  setSignupForm((current) => ({ ...current, password: value }));
                  setSignupStatus("");
                }}
              />

              <FieldLabel htmlFor="signupMobile" label="Mobile Number" />
              <FieldInput
                id="signupMobile"
                type="tel"
                value={signupForm.mobile}
                onChange={(value) => {
                  setSignupForm((current) => ({ ...current, mobile: value.replace(/\D/g, "").slice(0, 10) }));
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

              <button
                type="button"
                onClick={startGoogleLogin}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>

              <StatusText text={signupStatus || signupError} />
            </form>
          )}
        </section>
      </section>
    </main>
  );
}

type FieldLabelProps = {
  htmlFor: string;
  label: string;
};

function FieldLabel({ htmlFor, label }: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800">
      {label}
    </label>
  );
}

type FieldInputProps = {
  id: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
};

function FieldInput({ id, type = "text", value, onChange }: FieldInputProps) {
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

type PasswordFieldProps = {
  id: string;
  value: string;
  visible: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
};

function PasswordField({ id, value, visible, onToggle, onChange }: PasswordFieldProps) {
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

type StatusTextProps = {
  text: string;
};

function StatusText({ text }: StatusTextProps) {
  return <p className="min-h-6 text-sm font-medium text-[#ad2f39]">{text}</p>;
}
