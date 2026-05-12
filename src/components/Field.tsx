import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Icon, type IconName } from "./icons/Icon";

interface FieldProps {
  label: ReactNode;
  icon?: IconName;
  hint?: ReactNode;
  children: ReactNode;
}

export function Field({ label, icon, hint, children }: FieldProps) {
  return (
    <div className="pg-field">
      <div className="pg-field-label">
        {icon && <Icon name={icon} size={11} />}
        {label}
      </div>
      {children}
      {hint && <div className="pg-field-hint">{hint}</div>}
    </div>
  );
}

interface FormSectionProps {
  icon: IconName;
  title: string;
  hint?: ReactNode;
  children: ReactNode;
}

export function FormSection({ icon, title, hint, children }: FormSectionProps) {
  return (
    <section className="pg-form-section">
      <header className="pg-form-section-head">
        <Icon name={icon} size={16} className="pg-form-section-icon" />
        <h3>{title}</h3>
        {hint && <span className="pg-form-section-hint">{hint}</span>}
      </header>
      {children}
    </section>
  );
}

export function FieldGrid({
  children,
  cols = 2,
}: {
  children: ReactNode;
  cols?: 1 | 2;
}) {
  return (
    <div className={`pg-field-grid pg-field-grid-${cols}`}>{children}</div>
  );
}

interface BaseInputProps {
  mono?: boolean;
  invalid?: boolean;
}

export function Input({
  mono,
  invalid,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & BaseInputProps) {
  return (
    <input
      className={`pg-input${mono ? " mono" : ""}${invalid ? " pg-input-invalid" : ""}${className ? ` ${className}` : ""}`}
      {...rest}
    />
  );
}

export function Textarea({
  mono,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & BaseInputProps) {
  return (
    <textarea
      className={`pg-input pg-textarea${mono ? " mono" : ""}${className ? ` ${className}` : ""}`}
      {...rest}
    />
  );
}

export function Select({
  className,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`pg-input pg-select${className ? ` ${className}` : ""}`} {...rest} />;
}
