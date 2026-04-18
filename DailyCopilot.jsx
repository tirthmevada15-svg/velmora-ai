import { useState, useEffect, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const MODES = [
  { id: "think",   label: "Think",   icon: "◎", desc: "Break down problems", color: "#60a5fa" },
  { id: "plan",    label: "Plan",    icon: "⊞", desc: "Build action steps",  color: "#34d399" },
  { id: "execute", label: "Execute", icon: "▶", desc: "Do it now",           color: "#fb923c" },
  { id: "review",  label: "Review",  icon: "◈", desc: "Debrief & reflect",   color: "#a78bfa" },
];

const QUICK_PROMPTS = {
  think:   ["What's the real problem here?", "Help me untangle this situation", "What am I missing?"],
  plan:    ["Turn my goal into a plan", "Prioritize my task list", "Break this into steps"],
  execute: ["Help me write this", "Review my draft", "Make a decision with me"],
  review:  ["Summarize my session", "What should I focus on next?", "What did I accomplish?"],
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "12px 16px" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#3b82f6",
            animation: `velPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 16,
      animation: "velFadeIn 0.25s ease",
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%", overflow: "hidden",
          background: "#000", border: "1px solid rgba(59,130,246,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginRight: 10, flexShrink: 0, marginTop: 2,
          boxShadow: "0 0 12px rgba(59,130,246,0.3)",
        }}>
          <img
            src="/logo.png"
            alt="Velmora"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}
      <div style={{
        maxWidth: "75%",
        background: isUser
          ? "linear-gradient(135deg, #1e3a5f, #1e40af)"
          : "rgba(255,255,255,0.05)",
        border: isUser
          ? "1px solid rgba(96,165,250,0.3)"
          : "1px solid rgba(255,255,255,0.08)",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        padding: "12px 16px",
        color: "#e8e8e0",
        fontSize: 14,
        lineHeight: 1.7,
        whiteSpace: "pre-wrap",
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        {msg.content}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DailyCopilot() {
  const [mode,         setMode]         = useState("think");
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [sessionGoal,  setSessionGoal]  = useState("");
  const [editingGoal,  setEditingGoal]  = useState(false);
  const [goalDraft,    setGoalDraft]    = useState("");
  const [tasksDone,    setTasksDone]    = useState([]);
  const [newTask,      setNewTask]      = useState("");
  const [serverStatus, setServerStatus] = useState("checking"); // "ok" | "error" | "checking"

  const chatEndRef = useRef(null);
  const inputRef   = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Check backend health on mount
  useEffect(() => {
    fetch("http://localhost:8000/")
      .then((r) => r.ok ? setServerStatus("ok") : setServerStatus("error"))
      .catch(() => setServerStatus("error"));
  }, []);

  const currentMode = MODES.find((m) => m.id === mode);

  // ── Send message to backend ────────────────────────────────────────────────
  async function sendMessage(text) {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");

    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const storedId = localStorage.getItem("velmora_user_id");
      const res = await fetch("http://localhost:8000/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          mode:    mode,
          user_id: storedId || null,
        }),
      });

      const data = await res.json();

      if (data.user_id && data.user_id !== "error" && !storedId) {
        localStorage.setItem("velmora_user_id", data.user_id);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      setServerStatus("ok");
    } catch {
      setServerStatus("error");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ Cannot reach the backend server.\n\nMake sure you ran:\n  cd backend\n  uvicorn server:app --reload --port 8000",
        },
      ]);
    }
    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function switchMode(newMode) {
    setMode(newMode);
    setMessages([]);
  }

  const now     = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0f14",
      fontFamily: "'IBM Plex Mono', monospace",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Global keyframe styles */}
      <style>{`
        @keyframes velPulse  { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }
        @keyframes velFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes velShimmer{ 0%{opacity:0.5} 50%{opacity:1} 100%{opacity:0.5} }
        input { outline: none; }
      `}</style>

      {/* ── Top Bar ───────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 28px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(13,15,20,0.97)",
        backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 100,
        flexShrink: 0,
      }}>
        {/* Logo + Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, overflow: "hidden",
            background: "#000", flexShrink: 0,
            boxShadow: "0 0 20px rgba(59,130,246,0.45)",
          }}>
            <img
              src="/logo.png"
              alt="Velmora AI Logo"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <div>
            <div style={{
              color: "#f8f4e8", fontWeight: 700, fontSize: 16,
              letterSpacing: "-0.02em", fontFamily: "'Space Grotesk', sans-serif",
            }}>
              Velmora{" "}
              <span style={{
                background: "linear-gradient(90deg, #60a5fa, #3b82f6)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>AI</span>
            </div>
            <div style={{ color: "#6b7280", fontSize: 11 }}>Your daily thinking partner</div>
          </div>
        </div>

        {/* Right — clock + status */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Server status badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "3px 10px", borderRadius: 20,
            background: serverStatus === "ok"
              ? "rgba(52,211,153,0.1)"
              : serverStatus === "error"
              ? "rgba(248,113,113,0.1)"
              : "rgba(255,255,255,0.05)",
            border: `1px solid ${serverStatus === "ok" ? "rgba(52,211,153,0.3)" : serverStatus === "error" ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.1)"}`,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: serverStatus === "ok" ? "#34d399" : serverStatus === "error" ? "#f87171" : "#9ca3af",
              animation: serverStatus === "ok" ? "velShimmer 2s infinite" : "none",
            }} />
            <span style={{
              fontSize: 10,
              color: serverStatus === "ok" ? "#34d399" : serverStatus === "error" ? "#f87171" : "#9ca3af",
            }}>
              {serverStatus === "ok" ? "Backend Online" : serverStatus === "error" ? "Backend Offline" : "Connecting..."}
            </span>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#60a5fa", fontSize: 13, fontWeight: 500 }}>{timeStr}</div>
            <div style={{ color: "#4b5563", fontSize: 11 }}>{dateStr}</div>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", flex: 1,
        overflow: "hidden",
        height: "calc(100vh - 65px)",
      }}>

        {/* ── Left Sidebar ────────────────────────────────────────────────── */}
        <div style={{
          width: 224,
          borderRight: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(255,255,255,0.015)",
          display: "flex", flexDirection: "column",
          padding: "18px 0",
          flexShrink: 0,
          overflowY: "auto",
        }}>

          {/* Mode section */}
          <div style={{ padding: "0 16px 10px", color: "#374151", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            Mode
          </div>
          {MODES.map((m) => {
            const active = mode === m.id;
            const rgbMap = { think: "96,165,250", plan: "52,211,153", execute: "251,146,60", review: "167,139,250" };
            return (
              <button
                key={m.id}
                onClick={() => switchMode(m.id)}
                style={{
                  margin: "1px 10px", padding: "9px 12px", borderRadius: 8, textAlign: "left",
                  background: active ? `rgba(${rgbMap[m.id]},0.12)` : "transparent",
                  border: active ? `1px solid ${m.color}35` : "1px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: active ? m.color : "#374151", fontSize: 15 }}>{m.icon}</span>
                  <div>
                    <div style={{
                      color: active ? m.color : "#9ca3af", fontSize: 13, fontWeight: 500,
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}>{m.label}</div>
                    <div style={{ color: "#374151", fontSize: 10, marginTop: 1 }}>{m.desc}</div>
                  </div>
                </div>
              </button>
            );
          })}

          {/* Session Goal */}
          <div style={{ margin: "18px 10px 0", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
            <div style={{ padding: "0 6px 8px", color: "#374151", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Session Goal
            </div>
            {editingGoal ? (
              <div style={{ padding: "0 6px" }}>
                <textarea
                  value={goalDraft}
                  onChange={(e) => setGoalDraft(e.target.value)}
                  placeholder="What do you want to achieve today?"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(59,130,246,0.35)",
                    borderRadius: 6, color: "#e8e8e0", fontSize: 12,
                    padding: 8, resize: "none",
                    fontFamily: "'IBM Plex Mono', monospace",
                    lineHeight: 1.5, minHeight: 68,
                    outline: "none",
                  }}
                />
                <button
                  onClick={() => { setSessionGoal(goalDraft); setEditingGoal(false); }}
                  style={{
                    marginTop: 5, width: "100%", padding: "6px",
                    background: "rgba(59,130,246,0.15)", color: "#60a5fa",
                    borderRadius: 6, fontSize: 11,
                    fontFamily: "'IBM Plex Mono', monospace",
                    border: "1px solid rgba(59,130,246,0.3)",
                  }}
                >Set Goal</button>
              </div>
            ) : (
              <button
                onClick={() => { setGoalDraft(sessionGoal); setEditingGoal(true); }}
                style={{
                  margin: "0 6px", padding: 8,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px dashed rgba(255,255,255,0.1)",
                  borderRadius: 6, width: "calc(100% - 12px)",
                  color: sessionGoal ? "#d1d5db" : "#4b5563",
                  fontSize: 11, textAlign: "left",
                  fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.5,
                }}
              >
                {sessionGoal || "+ Set session goal"}
              </button>
            )}
          </div>

          {/* Done Today tracker */}
          <div style={{ margin: "14px 10px 0", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
            <div style={{ padding: "0 6px 8px", color: "#374151", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Done Today
            </div>
            <div style={{ maxHeight: 130, overflowY: "auto", padding: "0 6px" }}>
              {tasksDone.length === 0 && (
                <div style={{ color: "#374151", fontSize: 11, fontStyle: "italic" }}>No wins yet — go get one!</div>
              )}
              {tasksDone.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 5 }}>
                  <span style={{ color: "#34d399", fontSize: 11, marginTop: 1 }}>✓</span>
                  <span style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.4 }}>{t}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "6px 6px 0" }}>
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTask.trim()) {
                    setTasksDone((prev) => [...prev, newTask.trim()]);
                    setNewTask("");
                  }
                }}
                placeholder="Log a win…"
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 5, color: "#e8e8e0", fontSize: 11,
                  padding: "5px 7px",
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Main Chat Area ───────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Mode header bar */}
          <div style={{
            padding: "14px 24px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: currentMode.color, fontSize: 20 }}>{currentMode.icon}</span>
              <div>
                <span style={{
                  color: currentMode.color, fontSize: 14, fontWeight: 600,
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>
                  {currentMode.label} Mode
                </span>
                <span style={{ color: "#4b5563", fontSize: 12, marginLeft: 10 }}>
                  {currentMode.desc}
                </span>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#6b7280", padding: "4px 10px", borderRadius: 6,
                  fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
                }}
              >Clear</button>
            )}
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            {messages.length === 0 ? (
              /* Empty state */
              <div style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                height: "100%", gap: 24,
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>{currentMode.icon}</div>
                  <div style={{
                    color: "#d1d5db", fontSize: 18, fontWeight: 600,
                    fontFamily: "'Space Grotesk', sans-serif", marginBottom: 6,
                  }}>
                    Ready to {currentMode.label.toLowerCase()}
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 13 }}>
                    Start with a prompt or pick a suggestion below
                  </div>
                </div>

                {/* Quick prompt chips */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 520 }}>
                  {QUICK_PROMPTS[mode].map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      style={{
                        padding: "8px 14px",
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${currentMode.color}28`,
                        borderRadius: 20, color: "#9ca3af", fontSize: 12,
                        fontFamily: "'IBM Plex Mono', monospace",
                        transition: "all 0.15s",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = `${currentMode.color}14`;
                        e.currentTarget.style.color = currentMode.color;
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                        e.currentTarget.style.color = "#9ca3af";
                      }}
                    >{p}</button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => <Message key={i} msg={msg} />)}
                {loading && <TypingIndicator />}
                <div ref={chatEndRef} />
              </>
            )}
          </div>

          {/* Input area */}
          <div style={{
            padding: "14px 24px 16px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.01)",
            flexShrink: 0,
          }}>
            <div style={{
              display: "flex", gap: 10, alignItems: "flex-end",
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${currentMode.color}35`,
              borderRadius: 12, padding: "10px 14px",
              boxShadow: `0 0 24px ${currentMode.color}08`,
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`${currentMode.label} with me… (Enter to send, Shift+Enter for newline)`}
                rows={1}
                style={{
                  flex: 1, background: "transparent", color: "#e8e8e0",
                  fontSize: 13, lineHeight: 1.6, resize: "none", maxHeight: 120,
                  fontFamily: "'IBM Plex Mono', monospace",
                  border: "none", overflow: "auto", outline: "none",
                }}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: loading || !input.trim()
                    ? "rgba(255,255,255,0.06)"
                    : `linear-gradient(135deg, ${currentMode.color}, ${currentMode.color}99)`,
                  color: loading || !input.trim() ? "#4b5563" : "#0d0f14",
                  fontSize: 16,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s", fontWeight: 700,
                }}
              >↑</button>
            </div>

            {/* Mode switcher pills */}
            <div style={{ marginTop: 8, display: "flex", gap: 10, justifyContent: "center" }}>
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => switchMode(m.id)}
                  style={{
                    background: "transparent",
                    color: mode === m.id ? m.color : "#374151",
                    fontSize: 11, padding: "2px 8px", borderRadius: 4,
                    border: mode === m.id ? `1px solid ${m.color}45` : "1px solid transparent",
                    fontFamily: "'IBM Plex Mono', monospace",
                    transition: "all 0.15s",
                  }}
                >{m.icon} {m.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
