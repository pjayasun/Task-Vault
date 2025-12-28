import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { useAuth } from "./context/AuthContext";

function Auth({ onAuthed }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function signUp() {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return alert(error.message);
    alert("Check your email for confirmation (if enabled).");
    onAuthed?.(data?.user);
  }

  async function signIn() {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return alert(error.message);
    onAuthed?.(data.user);
  }

  return (
    <div
      style={{ maxWidth: 420, margin: "40px auto", display: "grid", gap: 12 }}
    >
      <h2>TaskVault — Login</h2>
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={signIn}>Sign In</button>
        <button onClick={signUp}>Sign Up</button>
      </div>
    </div>
  );
}

function Dashboard({ user }) {
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");

  async function loadProfile() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) return alert(error.message);

    // If no profile row exists yet, create it
    if (!data) {
      const { error: insertError } = await supabase.from("profiles").insert({
        id: user.id,
        username: user.email?.split("@")[0] ?? "user",
        full_name: "",
      });
      if (insertError) return alert(insertError.message);
      return loadProfile();
    }

    setProfile(data);
  }

  async function loadTasks() {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return alert(error.message);
    setTasks(data ?? []);
  }

  async function addTask(e) {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) return;

    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: clean,
    });

    if (error) return alert(error.message);
    setTitle("");
    loadTasks();
  }

  async function toggleDone(task) {
    const { error } = await supabase
      .from("tasks")
      .update({ is_done: !task.is_done })
      .eq("id", task.id);

    if (error) return alert(error.message);
    loadTasks();
  }

  async function removeTask(taskId) {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) return alert(error.message);
    loadTasks();
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  useEffect(() => {
    loadProfile();
    loadTasks();
  }, []);

  return (
    <div
      style={{ maxWidth: 720, margin: "40px auto", display: "grid", gap: 14 }}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
      >
        <div>
          <h2>Welcome</h2>
          <div style={{ opacity: 0.8 }}>
            {profile?.username} ({user.email})
          </div>
        </div>
        <button onClick={signOut}>Sign out</button>
      </div>

      <form onSubmit={addTask} style={{ display: "flex", gap: 10 }}>
        <input
          placeholder="New task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ flex: 1 }}
        />
        <button>Add</button>
      </form>

      <div style={{ display: "grid", gap: 10 }}>
        {tasks.map((t) => (
          <div
            key={t.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 12,
            }}
          >
            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={t.is_done}
                onChange={() => toggleDone(t)}
              />
              <span
                style={{ textDecoration: t.is_done ? "line-through" : "none" }}
              >
                {t.title}
              </span>
            </label>
            <button onClick={() => removeTask(t.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  return user ? <Dashboard user={user} /> : <Auth />;
}
