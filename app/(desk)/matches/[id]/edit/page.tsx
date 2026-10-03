"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type MatchDetail } from "@/lib/api";
import { TopBar } from "@/components/ui";
import { MatchForm, MatchGate } from "../../shared";

export default function EditMatchPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<MatchDetail | null>(null);
  useEffect(() => {
    api<MatchDetail>(`/matches/${id}`).then(setData);
  }, [id]);
  return (
    <MatchGate>
      <TopBar back={`/matches/${id}`} />
      <main className="page">
        <h1 className="h1">Edit match</h1>
        {data ? <MatchForm existing={data.match} /> : <div className="empty"><span className="spinner" /></div>}
      </main>
    </MatchGate>
  );
}
