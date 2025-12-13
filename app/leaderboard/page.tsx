import { Suspense } from "react";
import PageClient from "./page-client";
import  Loader  from "@/components/loader";


export default async function LeaderboardPage() {


  return (
    <Suspense fallback={<Loader />}>
      <PageClient />
    </Suspense>
  );
}