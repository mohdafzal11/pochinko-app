import { Loader2 } from "lucide-react";

export const Loader = () => {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <Loader2 className="animate-spin" />
    </div>
  );
};