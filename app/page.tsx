"use client";

import dynamic from "next/dynamic";

const Experience = dynamic(() => import("@/components/Experience"), {
  ssr: false,
  loading: () => <div className="loading">CARPET DIEM</div>,
});

export default function Page() {
  return <Experience />;
}