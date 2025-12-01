import type { Metadata, Viewport } from "next";


export const metadata: Metadata = {
  title: "Blockpad",
  description: "A modern Blockpad",
};


export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}