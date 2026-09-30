"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { hourKey, msUntilNextHour, pickFeatured, supabase } from "../lib/supabase";

export default function Home() {
  const [publicNotes, setPublicNotes] = useState([]);
  const [hourNote, setHourNote] = useState("");
  const [left, setLeft] = useState("");
  const key = hourKey();

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) return;
      const { data } = await supabase
        .from("notes")
        .select("id,title,body,created_at,user_id,profiles(handle,display_name)")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(40);
      if (alive) setPublicNotes(data || []);
      const { data: log } = await supabase
        .from("hourly_log")
        .select("title,body")
        .order("created_at", { ascending: false })
        .limit(1);
      if (alive && log?.[0]) setHourNote(`${log[0].title} — ${log[0].body}`);
    }
    load();
    const t = setInterval(() => {
      const ms = msUntilNextHour();
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setLeft(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }, 250);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [key]);

  const featured = useMemo(() => pickFeatured(publicNotes, key), [publicNotes, key]);

  return (
    <div className="wrap">
      <header className="mast">
        <h1 className="wordmark">Hour<span>house</span></h1>
        <nav className="nav">
          <Link href="/">Floor</Link>
          <Link href="/desk">Desk</Link>
        </nav>
      </header>
      <div className="hourbar">
        <span>UTC hour {key.slice(-2)} · next change in {left || "—"}</span>
        <div className="hand" aria-hidden><i /></div>
      </div>
      <section className="hero">
        <div>
          <p className="kicker">On the hour</p>
          <h2 className="display">{featured?.title || "The room is still finding its voice."}</h2>
          <p className="lede">{featured?.body || "Sign in at the desk, write something true, and mark it public if it can stand the light."}</p>
          <p className="meta">{featured?.profiles?.display_name ? `from ${featured.profiles.display_name}` : "house copy"}</p>
        </div>
        <aside className="card">
          <p className="kicker">House note</p>
          <p>{hourNote || "Every hour this room turns. Private work stays private. Public work can take the chair."}</p>
        </aside>
      </section>
      <section className="grid">
        {publicNotes.map((n) => (
          <article className="slip" key={n.id}>
            <h3>{n.title}</h3>
            <p>{n.body.slice(0, 220)}{n.body.length > 220 ? "…" : ""}</p>
            <p className="meta">{n.profiles?.handle ? `@${n.profiles.handle}` : "member"} · {new Date(n.created_at).toUTCString().slice(5, 22)}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
