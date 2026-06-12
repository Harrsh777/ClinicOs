import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, "-");
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="clinic-label">
          {label}
        </label>
      )}
      <input id={inputId} className={cn("clinic-input", error && "border-[var(--danger-500)]", className)} {...props} />
      {error && <p className="mt-1 text-xs text-[var(--danger-500)]">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, "-");
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="clinic-label">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn("clinic-input min-h-[100px] resize-y", className)}
        {...props}
      />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
}

export function Select({ label, options, className, id, onChange, ...props }: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, "-");
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="clinic-label">
          {label}
        </label>
      )}
      <select id={inputId} className={cn("clinic-input", className)} onChange={onChange} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
