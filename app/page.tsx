import { Suspense } from "react";
import PageClient from "./page-client";
import  Loader  from "@/components/laoder";
import { LoaderProvider } from "@/contexts/LoaderContext";
import { MusicProvider } from "@/contexts/MusicContext";


export default async function HomePage() {
  return (
    <MusicProvider>
      <LoaderProvider>
        <Suspense fallback={<Loader />}>
          <PageClient/>
        </Suspense>
      </LoaderProvider>
    </MusicProvider>
  );
}