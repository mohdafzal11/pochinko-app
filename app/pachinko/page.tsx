import { Suspense } from "react";
import PageClient from "./page-client";
import Loader  from "@/components/laoder";


export default async function PachinkoPage() {


  return (
    <Suspense fallback={<Loader />}>
      <PageClient />
    </Suspense>
  );
}