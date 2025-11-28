import { Suspense } from "react";
import PageClient from "./page-client";
import { Loader } from "@/components/laoder";


export default async function MachinesPage() {


  return (
    <Suspense fallback={<Loader />}>
      <PageClient />
    </Suspense>
  );
}