"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Desk() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [mine, setMine] = useState([]);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  async function refreshMine(userId) {
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setMine(data || []);
  }

  useEffect(() => {
    if (!supabase) {
      setMsg("Supabase keys missing — cannot persist yet.");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) refreshMine(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) refreshMine(s.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function auth(mode) {
    setOk(false);
    setMsg("");
    const fn = mode === "in" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await fn({ email, password });
    if (error) setMsg(error.message);
    else {
      setOk(true);
      setMsg(mode === "up" ? "Account made. If mail confirm is on, check your inbox." : "In.");
    }
  }

  async function save(e) {
    e.preventDefault();
    if (!session) return;
    setMsg("");
    const { error } = await supabase.from("notes").insert({
      user_id: session.user.id,
      title: title.trim() || "Untitled slip",
      body: body.trim(),
      is_public: isPublic,
    });
    if (error) setMsg(error.message);
    else {
      setTitle("");
      setBody("");
      setIsPublic(false);
      setOk(true);
      setMsg("Saved.");
      refreshMine(session.user.id);
    }
  }

  async function togglePublic(note) {
    await supabase.from("notes").update({ is_public: !note.is_public }).eq("id", note.id);
    refreshMine(session.user.id);
  }

  return (
    <div className="wrap">
      <header className="mast">
        <h1 className="wordmark">Hour<span>house</span></h1>
        <nav className="nav">
          <Link href="/">Floor</Link>
          <Link href="/desk">Desk</Link>
        </nav>
      </header>
      {!session ? (
        <section className="hero">
          <div>
            <p className="kicker">Members</p>
            <h2 className="display">Sit down. The desk keeps what you give it.</h2>
            <p className="lede">Email and a password. Private slips never leave your account.</p>
          </div>
          <form className="card" onSubmit={(e) => e.preventDefault()}>
            <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
            <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={6} /></label>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => auth("in")}>Enter</button>
              <button className="ghost" type="button" onClick={() => auth("up")}>Make a key</button>
            </div>
            <p className={`notice ${ok ? "ok" : ""}`}>{msg}</p>
          </form>
        </section>
      ) : (
        <>
          <section className="hero">
            <div>
              <p className="kicker">Your desk</p>
              <h2 className="display">Write it once. Decide later if the floor may see it.</h2>
            </div>
            <form className="card" onSubmit={save}>
              <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></label>
              <label>Slip<textarea value={body} onChange={(e) => setBody(e.target.value)} required maxLength={8000} /></label>
              <label className="toggle">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                Mark public — eligible for the hour
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit">Keep</button>
                <button className="ghost" type="button" onClick={() => supabase.auth.signOut()}>Leave</button>
              </div>
              <p className={`notice ${ok ? "ok" : ""}`}>{msg}</p>
            </form>
          </section>
          <section className="grid">
            {mine.map((n) => (
              <article className="slip" key={n.id}>
                <h3>{n.title}</h3>
                <p>{n.body}</p>
                <p className="meta">{n.is_public ? "public" : "private"}</p>
                <button className="ghost" type="button" onClick={() => togglePublic(n)}>
                  {n.is_public ? "Pull from floor" : "Send to floor"}
                </button>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
