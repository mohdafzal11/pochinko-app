import type { Metadata, Viewport } from "next";


export const metadata: Metadata = {
  title: "Pochinko",
  description: "A modern Pochinko",
};


export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}