import { useState, useRef, KeyboardEvent, ClipboardEvent } from "react";

interface OtpInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
}

const OtpInput = ({ length = 6, onComplete, disabled }: OtpInputProps) => {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...values];
    next[index] = val.slice(-1);
    setValues(next);
    if (val && index < length - 1) inputs.current[index + 1]?.focus();
    const code = next.join("");
    if (code.length === length && next.every(Boolean)) onComplete(code);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent) => {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    const next = [...values];
    pasted.split("").forEach((ch, i) => (next[i] = ch));
    setValues(next);
    inputs.current[Math.min(pasted.length, length - 1)]?.focus();
    if (pasted.length === length) onComplete(pasted);
  };

  return (
    <div className="flex gap-2.5 justify-center">
      {values.map((v, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={v}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          className="w-11 h-12 text-center text-lg font-heading font-medium rounded-md bg-input border border-border text-foreground focus:border-muted-foreground outline-none transition-colors disabled:opacity-40"
        />
      ))}
    </div>
  );
};

export default OtpInput;
