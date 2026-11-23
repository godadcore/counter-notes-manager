import { forwardRef } from "react";

export const Button = forwardRef(function Button({ variant = "primary", type = "button", className = "", ...props }, ref) {
  return <button ref={ref} type={type} className={`btn btn-${variant} ${className}`.trim()} {...props} />;
});
