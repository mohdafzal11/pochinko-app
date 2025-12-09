import type { Metadata, Viewport } from "next";


export const metadata: Metadata = {
  title: "Pachinko Marketplace",
  description: "A modern Pachinko Marketplace",
};


export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}