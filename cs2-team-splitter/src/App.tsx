import { useState } from "react";
import {
  Users,
  Swords,
  Shield,
  Target,
  Plus,
  Trash2,
  Shuffle,
  Copy,
  Check,
  Zap,
  Award,
  Sparkles,
  Trophy,
} from "lucide-react";

interface Player {
  id: string;
  name: string;
  skill: number;
}

interface SplitResult {
  ct: Player[];
  t: Player[];
  ctScore: number;
  tScore: number;
  ctAvg: string;
  tAvg: string;
}

const CS2_MAPS = [
  "Mirage",
  "Inferno",
  "Dust II",
  "Nuke",
  "Ancient",
  "Anubis",
  "Vertigo",
  "Overpass",
];

const PRESETS: { label: string; players: Player[] }[] = [
  {
    label: "5v5 Standard Squad",
    players: [
      { id: "1", name: "S1mple_Pro", skill: 10 },
      { id: "2", name: "ZywOo_Clutch", skill: 10 },
      { id: "3", name: "Niko_Aim", skill: 9 },
      { id: "4", name: "m0NESY_Flick", skill: 9 },
      { id: "5", name: "b1t_Headshot", skill: 8 },
      { id: "6", name: "ropz_Lurk", skill: 8 },
      { id: "7", name: "Apex_IGL", skill: 7 },
      { id: "8", name: "Karrigan_Brain", skill: 7 },
      { id: "9", name: "Rookie_Noob", skill: 4 },
      { id: "10", name: "Silver_Player", skill: 3 },
    ],
  },
  {
    label: "2v2 Casual Wingman",
    players: [
      { id: "1", name: "Ahmad_Carry", skill: 9 },
      { id: "2", name: "Samer_Pro", skill: 8 },
      { id: "3", name: "Omar_Mid", skill: 6 },
      { id: "4", name: "Khaled_Support", skill: 5 },
    ],
  },
];

export default function App() {
  const [map, setMap] = useState<string>(CS2_MAPS[0]);
  const [matchLevel, setMatchLevel] = useState<string>("Competitive (MM)");
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [players, setPlayers] = useState<Player[]>([
    { id: "1", name: "Player 1", skill: 7 },
    { id: "2", name: "Player 2", skill: 7 },
    { id: "3", name: "Player 3", skill: 5 },
    { id: "4", name: "Player 4", skill: 5 },
  ]);

  const [teams, setTeams] = useState<SplitResult | null>(null);

  const addPlayerPair = () => {
    const timestamp = Date.now();
    setPlayers((prev) => [
      ...prev,
      { id: `p_${timestamp}`, name: `Player ${prev.length + 1}`, skill: 5 },
      { id: `p_${timestamp + 1}`, name: `Player ${prev.length + 2}`, skill: 5 },
    ]);
  };

  const removePlayerPair = () => {
    if (players.length > 2) {
      setPlayers((prev) => prev.slice(0, prev.length - 2));
    }
  };

  const updatePlayer = (
    id: string,
    field: keyof Player,
    value: string | number,
  ) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  const loadPreset = (presetPlayers: Player[]) => {
    setPlayers(presetPlayers);
    setTeams(null);
    setError("");
  };

  const divideTeams = () => {
    const valid = players.filter((p) => p.name.trim() !== "");

    if (valid.length < 2) {
      setError("الرجاء إدخال اسمين على الأقل للبدء.");
      return;
    }

    if (valid.length % 2 !== 0) {
      setError("يجب أن يكون إجمالي عدد اللاعبين زوجياً لتقسيم التشكيلة.");
      return;
    }

    setError("");

    const sorted = [...valid].sort((a, b) => b.skill - a.skill);
    const teamCT: Player[] = [];
    const teamT: Player[] = [];
    let scoreCT = 0;
    let scoreT = 0;

    sorted.forEach((player) => {
      if (
        teamCT.length < sorted.length / 2 &&
        (scoreCT <= scoreT || teamT.length === sorted.length / 2)
      ) {
        teamCT.push(player);
        scoreCT += player.skill;
      } else {
        teamT.push(player);
        scoreT += player.skill;
      }
    });

    setTeams({
      ct: teamCT,
      t: teamT,
      ctScore: scoreCT,
      tScore: scoreT,
      ctAvg: (scoreCT / teamCT.length).toFixed(1),
      tAvg: (scoreT / teamT.length).toFixed(1),
    });
  };

  const copyToClipboard = () => {
    if (!teams) return;
    const text = `CS2 MATCH SPLIT (${map} - ${matchLevel})\n----------------------------\n🔷 Counter-Terrorists (CT):\n${teams.ct
      .map((p) => `  • ${p.name} (Lvl${p.skill})`)
      .join("\n")}\nAvg Rating: ${teams.ctAvg}\n\n🔶 Terrorists (T):\n${teams.t
      .map((p) => `  • ${p.name} (Lvl${p.skill})`)
      .join("\n")}\nAvg Rating: ${teams.tAvg}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0b0e14",
        color: "#e2e8f0",
        padding: "24px 16px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              color: "#f59e0b",
              fontSize: "14px",
              fontWeight: "bold",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            <Zap size={18} /> CS2 Balanced Matchmaker
          </div>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "800",
              margin: "8px 0",
              color: "#ffffff",
            }}
          >
            {" "}
            Counter-Strike 2 Team Splitter
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>
            قسّم فريقك بشكل متكافئ تماماً بناءً على مستوى المهارة والخريطة
          </p>
        </div>

        {/* Configuration Bar */}
        <div
          style={{
            backgroundColor: "#161b22",
            border: "1px solid #30363d",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  color: "#cbd5e1",
                  marginBottom: "8px",
                }}
              >
                <Target size={16} color="#f59e0b" /> الخريطة (Map)
              </label>
              <select
                value={map}
                onChange={(e) => setMap(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: "#0d1117",
                  border: "1px solid #30363d",
                  color: "#fff",
                  padding: "10px",
                  borderRadius: "6px",
                }}
              >
                {CS2_MAPS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  color: "#cbd5e1",
                  marginBottom: "8px",
                }}
              >
                <Award size={16} color="#f59e0b" /> مستوى المواجهة
              </label>
              <select
                value={matchLevel}
                onChange={(e) => setMatchLevel(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: "#0d1117",
                  border: "1px solid #30363d",
                  color: "#fff",
                  padding: "10px",
                  borderRadius: "6px",
                }}
              >
                <option value="Casual / Fun">Casual / Fun</option>
                <option value="Competitive (MM)">Competitive (MM)</option>
                <option value="Premier Mode">Premier Mode</option>
              </select>
            </div>
          </div>

          {/* Quick Presets */}
          <div
            style={{
              marginTop: "16px",
              paddingTop: "16px",
              borderTop: "1px solid #21262d",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                color: "#8b949e",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Sparkles size={14} /> نماذج جاهزة:
            </span>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => loadPreset(p.players)}
                style={{
                  backgroundColor: "#21262d",
                  border: "1px solid #30363d",
                  color: "#c9d1d9",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Players List Section */}
        <div
          style={{
            backgroundColor: "#161b22",
            border: "1px solid #30363d",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h3
              style={{
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "18px",
              }}
            >
              <Users size={20} color="#38bdf8" /> قائمة اللاعبين (
              {players.length})
            </h3>
            <span style={{ fontSize: "12px", color: "#8b949e" }}>
              يجب أن يكون العدد زوجياً
            </span>
          </div>

          <div style={{ display: "grid", gap: "10px", marginBottom: "16px" }}>
            {players.map((player, idx) => (
              <div
                key={player.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  backgroundColor: "#0d1117",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #21262d",
                }}
              >
                <span
                  style={{ color: "#6e7681", fontSize: "12px", width: "24px" }}
                >
                  #{idx + 1}
                </span>
                <input
                  type="text"
                  placeholder="اسم اللاعب"
                  value={player.name}
                  onChange={(e) =>
                    updatePlayer(player.id, "name", e.target.value)
                  }
                  style={{
                    flex: 1,
                    backgroundColor: "transparent",
                    border: "none",
                    color: "#fff",
                    outline: "none",
                  }}
                />
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span style={{ fontSize: "12px", color: "#8b949e" }}>
                    Skill:
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={player.skill}
                    onChange={(e) =>
                      updatePlayer(
                        player.id,
                        "skill",
                        Math.min(10, Math.max(1, Number(e.target.value))),
                      )
                    }
                    style={{
                      width: "50px",
                      backgroundColor: "#161b22",
                      border: "1px solid #30363d",
                      color: "#f59e0b",
                      padding: "4px 6px",
                      borderRadius: "4px",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                border: "1px solid #ef4444",
                color: "#fca5a5",
                padding: "10px",
                borderRadius: "6px",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={addPlayerPair}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                backgroundColor: "#21262d",
                border: "1px solid #30363d",
                color: "#fff",
                padding: "10px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              <Plus size={16} /> إضافة لاعبين (+2)
            </button>
            <button
              onClick={removePlayerPair}
              disabled={players.length <= 2}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                backgroundColor: "#21262d",
                border: "1px solid #30363d",
                color: players.length <= 2 ? "#484f58" : "#ef4444",
                padding: "10px 16px",
                borderRadius: "6px",
                cursor: players.length <= 2 ? "not-allowed" : "pointer",
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={divideTeams}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            backgroundColor: "#f59e0b",
            color: "#000",
            border: "none",
            padding: "14px",
            borderRadius: "8px",
            fontWeight: "bold",
            fontSize: "16px",
            cursor: "pointer",
            marginBottom: "24px",
          }}
        >
          <Shuffle size={20} /> تقسيم الفرق بالتساوي
        </button>

        {/* Results */}
        {teams && (
          <div
            style={{
              backgroundColor: "#161b22",
              border: "1px solid #30363d",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                paddingBottom: "12px",
                borderBottom: "1px solid #21262d",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Trophy size={20} color="#f59e0b" /> الفرق المتوازنة
                </h3>
                <span style={{ fontSize: "12px", color: "#8b949e" }}>
                  {map} — {matchLevel}
                </span>
              </div>
              <button
                onClick={copyToClipboard}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "#21262d",
                  border: "1px solid #30363d",
                  color: "#fff",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                {copied ? (
                  <Check size={16} color="#22c55e" />
                ) : (
                  <Copy size={16} />
                )}
                {copied ? "تم النسخ!" : "نسخ التشكيلة"}
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "16px",
              }}
            >
              {/* CT Side */}
              <div
                style={{
                  backgroundColor: "rgba(59, 130, 246, 0.05)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  borderRadius: "8px",
                  padding: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      color: "#60a5fa",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Shield size={18} /> Counter-Terrorists (CT)
                  </h4>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#93c5fd",
                      backgroundColor: "rgba(59, 130, 246, 0.2)",
                      padding: "2px 8px",
                      borderRadius: "12px",
                    }}
                  >
                    Score: {teams.ctScore} (Avg {teams.ctAvg})
                  </span>
                </div>
                <div style={{ display: "grid", gap: "8px" }}>
                  {teams.ct.map((player) => (
                    <div
                      key={player.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        backgroundColor: "#0d1117",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                    >
                      <span>{player.name}</span>
                      <span style={{ color: "#f59e0b", fontWeight: "bold" }}>
                        Lvl {player.skill}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* T Side */}
              <div
                style={{
                  backgroundColor: "rgba(249, 115, 22, 0.05)",
                  border: "1px solid rgba(249, 115, 22, 0.3)",
                  borderRadius: "8px",
                  padding: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      color: "#fb923c",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Swords size={18} /> Terrorists (T)
                  </h4>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#fdba74",
                      backgroundColor: "rgba(249, 115, 22, 0.2)",
                      padding: "2px 8px",
                      borderRadius: "12px",
                    }}
                  >
                    Score: {teams.tScore} (Avg {teams.tAvg})
                  </span>
                </div>
                <div style={{ display: "grid", gap: "8px" }}>
                  {teams.t.map((player) => (
                    <div
                      key={player.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        backgroundColor: "#0d1117",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                    >
                      <span>{player.name}</span>
                      <span style={{ color: "#f59e0b", fontWeight: "bold" }}>
                        Lvl {player.skill}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
