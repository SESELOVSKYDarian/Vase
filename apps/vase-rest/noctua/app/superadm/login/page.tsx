'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { verifyPin } from './actions';

export default function SuperAdmLoginPage() {
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (lockedUntil && Date.now() > lockedUntil) {
      setLockedUntil(null);
      setAttempts(0);
    }
  }, [lockedUntil]);

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index]) {
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleInputChange = async (index: number, value: string) => {
    if (error) setError(false);
    if (value.length > 1) {
      value = value[value.length - 1];
    }

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const pinString = newPin.join('');
    if (pinString.length === 6) {
      await submitPin(pinString);
    }
  };

  const submitPin = async (pinToCheck: string) => {
    if (lockedUntil) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('pin', pinToCheck);
      const result = await verifyPin(formData);

      if (result.success) {
        router.push('/superadm');
      } else {
        setError(true);
        setAttempts(prev => prev + 1);
        if (attempts + 1 >= 3) {
          setLockedUntil(Date.now() + 60000);
        }
        setPin(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const getLockTimeLeft = () => {
    if (!lockedUntil) return '';
    const seconds = Math.ceil((lockedUntil - Date.now()) / 1000);
    return `${seconds}s`;
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-white tracking-widest mb-2">NOCTUA</h1>
          <p className="text-[#676b67] text-sm uppercase tracking-widest">SUPER ADMIN</p>
        </div>

        <div className="bg-[#151515] border border-[#252525] rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-6 text-center">
            {lockedUntil ? 'Bloqueado temporalmente' : 'Ingresa el PIN'}
          </h2>

          {lockedUntil ? (
            <div className="text-center py-8">
              <p className="text-red-400 text-lg mb-4">
                Demasiados intentos fallidos.
              </p>
              <p className="text-3xl font-mono text-white">{getLockTimeLeft()}</p>
            </div>
          ) : (
            <form>
              <div className="flex gap-3 justify-center mb-8">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <motion.input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="password"
                    maxLength={1}
                    value={pin[i]}
                    onChange={(e) => handleInputChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={loading}
                    className={`w-14 h-16 text-center text-3xl font-mono text-white bg-[#0d0d0d] border-2 rounded-xl focus:outline-none transition-all ${
                      error ? 'border-red-500' : 'border-[#252525] focus:border-violet-500'
                    }`}
                    animate={error ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                  />
                ))}
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center mb-6">
                  PIN incorrecto. {3 - attempts - 1} intentos restantes.
                </p>
              )}
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
