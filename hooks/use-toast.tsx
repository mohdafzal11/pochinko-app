import { toast as sonnerToast } from "sonner";

export function toast(options: { 
  title?: string; 
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  type?: "success" | "error" | "info" | "warning" | "default";
}) {
  const { title, description, action, type = "default" } = options;

  return sonnerToast(title ?? "", {
    description,
    action: action
      ? {
          label: action.label,
          onClick: action.onClick,
        }
      : undefined,
  });
}

export function useToast() {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
  };
}
