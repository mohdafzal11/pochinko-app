import type { Metadata, Viewport } from "next";


export const metadata: Metadata = {
  title: "Gacha",
  description: "A modern Gacha",
};


export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}