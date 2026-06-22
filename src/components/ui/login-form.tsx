"use client";
import { useEffect, useRef, useState, FormEvent } from "react";
import { User, Lock, ArrowRight, AlertOctagon, Key, Eye, EyeOff } from 'lucide-react';

// Vertex shader source code
const vertexSmokeySource = `
  attribute vec4 a_position;
  void main() {
    gl_Position = a_position;
  }
`;

// Fragment shader source code for the smokey background effect
const fragmentSmokeySource = `
precision mediump float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 u_color;

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = fragCoord / iResolution;
    vec2 centeredUV = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);

    float time = iTime * 0.5;

    // Normalize mouse input (0.0 - 1.0) and remap to -1.0 ~ 1.0
    vec2 mouse = iMouse / iResolution;
    vec2 rippleCenter = 2.0 * mouse - 1.0;

    vec2 distortion = centeredUV;
    // Apply distortion for a wavy, smokey effect
    for (float i = 1.0; i < 8.0; i++) {
        distortion.x += 0.5 / i * cos(i * 2.0 * distortion.y + time + rippleCenter.x * 3.1415);
        distortion.y += 0.5 / i * cos(i * 2.0 * distortion.x + time + rippleCenter.y * 3.1415);
    }

    // Create a glowing wave pattern
    float wave = abs(sin(distortion.x + distortion.y + time));
    float glow = smoothstep(0.9, 0.2, wave);

    fragColor = vec4(u_color * glow, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

type BlurSize = "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

interface SmokeyBackgroundProps {
  backdropBlurAmount?: string;
  color?: string;
  className?: string;
}

const blurClassMap: Record<BlurSize, string> = {
  none: "backdrop-blur-none",
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-lg",
  xl: "backdrop-blur-xl",
  "2xl": "backdrop-blur-2xl",
  "3xl": "backdrop-blur-3xl",
};

/**
 * A React component that renders an interactive WebGL shader background.
 */
export function SmokeyBackground({
  backdropBlurAmount = "sm",
  color = "#0ea5e9", // Custom deep sky cyan color to align with IICS tech interface
  className = "",
}: SmokeyBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const hexToRgb = (hex: string): [number, number, number] => {
    const cleaned = hex.startsWith("#") ? hex.substring(1) : hex;
    const r = parseInt(cleaned.substring(0, 2), 16) / 255;
    const g = parseInt(cleaned.substring(2, 4), 16) / 255;
    const b = parseInt(cleaned.substring(4, 6), 16) / 255;
    return [r, g, b];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    const compileShader = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSmokeySource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSmokeySource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const iResolutionLocation = gl.getUniformLocation(program, "iResolution");
    const iTimeLocation = gl.getUniformLocation(program, "iTime");
    const iMouseLocation = gl.getUniformLocation(program, "iMouse");
    const uColorLocation = gl.getUniformLocation(program, "u_color");

    let startTime = Date.now();
    const [r, g, b] = hexToRgb(color);
    gl.uniform3f(uColorLocation, r, g, b);

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);

      const currentTime = (Date.now() - startTime) / 1000;

      gl.uniform2f(iResolutionLocation, width, height);
      gl.uniform1f(iTimeLocation, currentTime);
      gl.uniform2f(iMouseLocation, isHovering ? mousePosition.x : width / 2, isHovering ? height - mousePosition.y : height / 2);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(render);
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      setMousePosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseenter", handleMouseEnter);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    render();

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseenter", handleMouseEnter);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isHovering, mousePosition, color]);

  const finalBlurClass = blurClassMap[backdropBlurAmount as BlurSize] || blurClassMap["sm"];

  return (
    <div className={`absolute inset-0 w-full h-full overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full opacity-65" />
      <div className={`absolute inset-0 ${finalBlurClass} bg-slate-950/40`}></div>
    </div>
  );
}

export interface LoginFormProps {
  usernameInput: string;
  setUsernameInput: (val: string) => void;
  passwordInput: string;
  setPasswordInput: (val: string) => void;
  loginError: string;
  setLoginError: (val: string) => void;
  isLoggingIn: boolean;
  onLoginSubmit: (e: FormEvent) => void;
  onAutofill: () => void;
  onGoogleLogin?: () => void;
  onTypingChange?: (isTyping: boolean) => void;
  showPassword?: boolean;
  onShowPasswordChange?: (show: boolean) => void;
}

/**
 * Adapted glassmorphism-style login form component for the IICS independent portal.
 */
export function LoginForm({
  usernameInput,
  setUsernameInput,
  passwordInput,
  setPasswordInput,
  loginError,
  setLoginError,
  isLoggingIn,
  onLoginSubmit,
  onAutofill,
  onGoogleLogin,
  onTypingChange,
  showPassword = false,
  onShowPasswordChange,
}: LoginFormProps) {
  const [localShowPassword, setLocalShowPassword] = useState(false);
  
  const actualShowPassword = onShowPasswordChange ? !!showPassword : localShowPassword;
  const toggleShowPassword = () => {
    if (onShowPasswordChange) {
      onShowPasswordChange(!actualShowPassword);
    } else {
      setLocalShowPassword(!localShowPassword);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-7 bg-transparent relative z-10 text-left">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-white tracking-tight font-sans">
          ¡Bienvenido de nuevo!
        </h2>
        <p className="text-sm text-zinc-450 leading-relaxed font-sans text-gray-400 font-normal">
          Por favor ingresa tus datos
        </p>
      </div>

      <form onSubmit={onLoginSubmit} className="space-y-4">
        {loginError && (
          <div className="p-3 bg-red-950/40 border border-red-500/20 text-red-400 text-xs text-left leading-relaxed flex gap-2 rounded-none font-sans">
            <AlertOctagon className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
            <span>{loginError}</span>
          </div>
        )}

        {/* Email Address */}
        <div className="space-y-2 text-left">
          <label className="text-xs font-semibold text-zinc-200 block font-sans">
            Correo electrónico
          </label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="anna@gmail.com"
              value={usernameInput}
              onChange={(e) => {
                setUsernameInput(e.target.value);
                setLoginError('');
              }}
              onFocus={() => onTypingChange?.(true)}
              onBlur={() => onTypingChange?.(false)}
              className="w-full bg-[#0d0d0f] border border-zinc-850 focus:border-zinc-700 pl-4 pr-4 py-3 text-sm text-white rounded-none focus:outline-none transition-all font-sans placeholder-zinc-600"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2 text-left">
          <label className="text-xs font-semibold text-zinc-200 block font-sans">
            Contraseña
          </label>
          <div className="relative">
            <input
              type={actualShowPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setLoginError('');
              }}
              onFocus={() => onTypingChange?.(true)}
              onBlur={() => onTypingChange?.(false)}
              className="w-full bg-[#0d0d0f] border border-zinc-850 focus:border-zinc-700 pl-4 pr-10 py-3 text-sm text-white rounded-none focus:outline-none transition-all font-sans placeholder-zinc-650"
            />
            <button
              type="button"
              onClick={toggleShowPassword}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              {actualShowPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Checkbox and link */}
        <div className="flex items-center justify-between text-xs py-1.5 font-sans">
          <label className="flex items-center gap-2 text-zinc-300 hover:text-white cursor-pointer select-none">
            <input 
              type="checkbox" 
              className="w-4 h-4 rounded-none border-zinc-800 bg-[#0d0d0f] text-white focus:ring-0 cursor-pointer"
              defaultChecked 
            />
            <span>Recordar por 30 días</span>
          </label>
          <a href="#forgot" className="text-zinc-300 hover:text-white transition-all font-semibold">
            ¿Olvidaste tu contraseña?
          </a>
        </div>

        <button
          type="submit"
          disabled={isLoggingIn}
          className="w-full flex items-center justify-center py-3 bg-[#e4e4e7] hover:bg-white active:bg-zinc-200 disabled:opacity-50 text-black font-semibold text-sm rounded-none transition-colors cursor-pointer mt-3"
        >
          {isLoggingIn ? (
            <>
              <span className="animate-spin mr-2 h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full" />
              Iniciando sesión...
            </>
          ) : (
            "Iniciar sesión"
          )}
        </button>
      </form>

      {/* Google Login Separator & Button */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={onGoogleLogin}
          className="w-full flex items-center justify-center gap-2.5 py-3 bg-black hover:bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-white font-semibold text-sm rounded-none transition-all cursor-pointer shadow-sm select-none font-sans"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <span>Iniciar sesión con Google</span>
        </button>
      </div>

      {/* Demo Autofill Accent Option */}
      <div 
        onClick={onAutofill}
        className="border border-zinc-800 hover:border-zinc-700 bg-zinc-950 p-3.5 rounded-none text-left cursor-pointer transition-all select-none space-y-1"
      >
        <div className="flex items-center gap-2">
          <Key className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider font-mono">
            Autocompletar Demo
          </span>
        </div>
        <p className="text-[10px] text-zinc-500 leading-tight block">
          Haz clic aquí para autocompletar rápidamente las credenciales autorizadas.
        </p>
      </div>

      {/* Account Signup Footer Link */}
      <div className="text-center text-xs text-zinc-400 font-sans">
        ¿No tienes una cuenta?{" "}
        <span 
          onClick={onAutofill}
          className="text-white hover:underline font-bold cursor-pointer"
        >
          Registrarse
        </span>
      </div>
    </div>
  );
}
