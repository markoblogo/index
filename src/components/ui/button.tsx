import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-[3px] border border-black bg-uga-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-uga-dark focus:outline-none focus:ring-2 focus:ring-uga-green focus:ring-offset-2 ${className}`}
      type={type}
      {...props}
    />
  );
}
