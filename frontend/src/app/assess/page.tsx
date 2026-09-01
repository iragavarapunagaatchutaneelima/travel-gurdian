"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AssessPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/plan");
  }, [router]);

  return null;
}
