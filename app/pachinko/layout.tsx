import type { Metadata, Viewport } from "next";


export const metadata: Metadata = {
  title: "Pachinko",
  description: "A modern Pachinko",
};


export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}