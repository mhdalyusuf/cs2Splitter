import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import {
  Swords,
  Shield,
  Plus,
  Trash2,
  Shuffle,
  Copy,
  Check,
  Trophy,
  UserCheck,
  AlertCircle,
  Award,
} from "lucide-react";

interface Player {
  id: string;
  name: string;
  skill_rating: number;
  elo_rating: number;
  matches_played: number;
  wins: number;
  losses: number;
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

export default function App() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerSkill, setNewPlayerSkill] = useState(5);

  const [map, setMap] = useState(CS2_MAPS[0]);
  const [scoreCTInput, setScoreCTInput] = useState(13);
  const [scoreTInput, setScoreTInput] = useState(11);
  const [teams, setTeams] = useState<SplitResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // 1. جلب قائمة اللاعبين من Supabase مرتبة حسب نقاط الـ Elo
  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("elo_rating", { ascending: false });

    if (error) {
      console.error("Error fetching players:", error);
    } else if (data) {
      setAllPlayers(data);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  // 2. إضافة لاعب جديد مع التحقق من عدم التكرار
  const handleAddPlayer = async () => {
    const trimmedName = newPlayerName.trim();
    if (!trimmedName) {
      setError("الرجاء إدخال اسم اللاعب.");
      return;
    }

    setError("");
    const { error: insertError } = await supabase.from("players").insert([
      {
        name: trimmedName,
        skill_rating: newPlayerSkill,
        elo_rating: 1000 + newPlayerSkill * 50, // Elo أولي بناءً على المهارة
      },
    ]);

    if (insertError) {
      if (insertError.code === "23505") {
        setError(`الاسم "${trimmedName}" موجود مسبقاً!`);
      } else {
        setError("حدث خطأ أثناء إضافة اللاعب.");
      }
      return;
    }

    setNewPlayerName("");
    setNewPlayerSkill(5);
    fetchPlayers();
  };

  const togglePlayerSelection = (id: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id],
    );
  };

  const handleDeletePlayer = async (id: string) => {
    await supabase.from("players").delete().eq("id", id);
    setSelectedPlayerIds((prev) => prev.filter((pId) => pId !== id));
    fetchPlayers();
  };

  // 3. تقسيم الفرق بالتساوي
  const divideTeams = () => {
    const activePlayers = allPlayers.filter((p) =>
      selectedPlayerIds.includes(p.id),
    );

    if (activePlayers.length < 2) {
      setError("اختر لاعبين اثنين على الأقل لتقسيم الفرق.");
      return;
    }

    if (activePlayers.length % 2 !== 0) {
      setError("عدد اللاعبين يجب أن يكون زوجياً.");
      return;
    }

    setError("");
    // الاعتماد على الـ Elo في التقسيم
    const sorted = [...activePlayers].sort(
      (a, b) => b.elo_rating - a.elo_rating,
    );

    const ct: Player[] = [];
    const t: Player[] = [];
    let scoreCT = 0;
    let scoreT = 0;

    sorted.forEach((player) => {
      if (
        ct.length < sorted.length / 2 &&
        (scoreCT <= scoreT || t.length === sorted.length / 2)
      ) {
        ct.push(player);
        scoreCT += player.elo_rating;
      } else {
        t.push(player);
        scoreT += player.elo_rating;
      }
    });

    setTeams({
      ct,
      t,
      ctScore: scoreCT,
      tScore: scoreT,
      ctAvg: (scoreCT / ct.length).toFixed(0),
      tAvg: (scoreT / t.length).toFixed(0),
    });
  };

  // 4. تسجيل النتيجة النهائية للمباراة وتحديث الإحصائيات في Supabase
  const recordMatchResult = async () => {
    if (!teams) return;

    const winnerSide =
      scoreCTInput > scoreTInput
        ? "CT"
        : scoreCTInput < scoreTInput
          ? "T"
          : "DRAW";

    // أ. إضافة الجولة لجدول المباريات
    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .insert([
        {
          map_name: map,
          score_ct: scoreCTInput,
          score_t: scoreTInput,
          winner_side: winnerSide,
        },
      ])
      .select()
      .single();

    if (matchError || !matchData) {
      alert("حدث خطأ أثناء حفظ المباراة.");
      return;
    }

    const winners =
      winnerSide === "CT" ? teams.ct : winnerSide === "T" ? teams.t : [];
    const losers =
      winnerSide === "CT" ? teams.t : winnerSide === "T" ? teams.ct : [];

    // ب. تحديث بيانات الفائزين (+25 Elo)
    for (const p of winners) {
      await supabase
        .from("players")
        .update({
          matches_played: p.matches_played + 1,
          wins: p.wins + 1,
          elo_rating: p.elo_rating + 25,
        })
        .eq("id", p.id);

      await supabase
        .from("match_players")
        .insert([
          {
            match_id: matchData.id,
            player_id: p.id,
            team: "CT",
            elo_change: 25,
          },
        ]);
    }

    // ج. تحديث بيانات الخاسرين (-20 Elo)
    for (const p of losers) {
      await supabase
        .from("players")
        .update({
          matches_played: p.matches_played + 1,
          losses: p.losses + 1,
          elo_rating: Math.max(100, p.elo_rating - 20),
        })
        .eq("id", p.id);

      await supabase
        .from("match_players")
        .insert([
          {
            match_id: matchData.id,
            player_id: p.id,
            team: "T",
            elo_change: -20,
          },
        ]);
    }

    alert("تم تسجيل المباراة وتحديث ترتيب النقاط بنجاح!");
    setTeams(null);
    fetchPlayers();
  };

  const copyToClipboard = () => {
    if (!teams) return;
    const text = `CS2 MATCH SPLIT (${map})\n----------------------------\n🔷 Counter-Terrorists (CT):\n${teams.ct.map((p) => `  • ${p.name} (Elo${p.elo_rating})`).join("\n")}\n\n🔶 Terrorists (T):\n${teams.t.map((p) => `  • ${p.name} (Elo${p.elo_rating})`).join("\n")}`;
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
      <div style={{ maxWidth: "950px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <h1
            style={{
              fontSize: "30px",
              fontWeight: "800",
              color: "#ffffff",
              margin: 0,
            }}
          >
            CS2 Squad Matchmaker & Leaderboard
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "6px" }}>
            نظام تصنيف وتوزيع فرق سحابي مدعوم بـ Supabase
          </p>
        </div>

        {/* إضافة لاعب جديد */}
        <div
          style={{
            backgroundColor: "#161b22",
            border: "1px solid #30363d",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "24px",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px 0",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Plus size={18} color="#f59e0b" /> إضافة لاعب جديد
          </h3>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="اسم اللاعب"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              style={{
                flex: 2,
                minWidth: "200px",
                backgroundColor: "#0d1117",
                border: "1px solid #30363d",
                color: "#fff",
                padding: "10px 14px",
                borderRadius: "6px",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                Skill (1-10):
              </span>
              <input
                type="number"
                min="1"
                max="10"
                value={newPlayerSkill}
                onChange={(e) => setNewPlayerSkill(Number(e.target.value))}
                style={{
                  width: "60px",
                  backgroundColor: "#0d1117",
                  border: "1px solid #30363d",
                  color: "#f59e0b",
                  padding: "10px",
                  borderRadius: "6px",
                  fontWeight: "bold",
                }}
              />
            </div>
            <button
              onClick={handleAddPlayer}
              style={{
                backgroundColor: "#f59e0b",
                color: "#000",
                border: "none",
                padding: "10px 20px",
                borderRadius: "6px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              حفظ اللاعب
            </button>
          </div>
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "#ef4444",
                fontSize: "13px",
                marginTop: "12px",
              }}
            >
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </div>

        {/* قائمة اللاعبين وجدول الصدارة */}
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
                fontSize: "18px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Award size={20} color="#f59e0b" /> جدول الصدارة واللاعبين (
              {allPlayers.length})
            </h3>
            <span
              style={{ fontSize: "13px", color: "#38bdf8", fontWeight: "bold" }}
            >
              المحددون للعب: {selectedPlayerIds.length}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "12px",
            }}
          >
            {allPlayers.map((player, rank) => {
              const isSelected = selectedPlayerIds.includes(player.id);
              const winRate =
                player.matches_played > 0
                  ? Math.round((player.wins / player.matches_played) * 100)
                  : 0;

              return (
                <div
                  key={player.id}
                  onClick={() => togglePlayerSelection(player.id)}
                  style={{
                    backgroundColor: isSelected
                      ? "rgba(56, 189, 248, 0.1)"
                      : "#0d1117",
                    border: isSelected
                      ? "1px solid #38bdf8"
                      : "1px solid #21262d",
                    padding: "12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: "bold",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          color:
                            rank === 0
                              ? "#f59e0b"
                              : rank === 1
                                ? "#94a3b8"
                                : "#854d0e",
                          fontSize: "12px",
                        }}
                      >
                        #{rank + 1}
                      </span>
                      {isSelected && <UserCheck size={16} color="#38bdf8" />}
                      {player.name}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#8b949e",
                        marginTop: "4px",
                      }}
                    >
                      Elo:{" "}
                      <strong style={{ color: "#38bdf8" }}>
                        {player.elo_rating}
                      </strong>{" "}
                      | W/L: {player.wins}/{player.losses} ({winRate}%)
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlayer(player.id);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: "20px",
              display: "flex",
              gap: "16px",
              alignItems: "center",
            }}
          >
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: "13px",
                  color: "#cbd5e1",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                الخريطة:
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
            <button
              onClick={divideTeams}
              style={{
                flex: 1,
                backgroundColor: "#f59e0b",
                color: "#000",
                border: "none",
                padding: "12px",
                borderRadius: "6px",
                fontWeight: "bold",
                fontSize: "15px",
                cursor: "pointer",
                marginTop: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <Shuffle size={18} /> تقسيم التشكيلة
            </button>
          </div>
        </div>

        {/* الفرق وتسجيل سكور الجولة */}
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
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Trophy size={20} color="#f59e0b" /> الفرق المتوازنة ({map})
              </h3>
              <button
                onClick={copyToClipboard}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "#21262d",
                  border: "1px solid #30363d",
                  color: "#fff",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                {copied ? (
                  <Check size={16} color="#22c55e" />
                ) : (
                  <Copy size={16} />
                )}{" "}
                {copied ? "تم النسخ" : "نسخ التشكيلة"}
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              {/* CT */}
              <div
                style={{
                  backgroundColor: "rgba(59, 130, 246, 0.05)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  borderRadius: "8px",
                  padding: "16px",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    color: "#60a5fa",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Shield size={18} /> CT (Avg Elo: {teams.ctAvg})
                </h4>
                {teams.ct.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      backgroundColor: "#0d1117",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      marginBottom: "6px",
                      fontSize: "14px",
                    }}
                  >
                    <span>{p.name}</span>
                    <span style={{ color: "#38bdf8", fontWeight: "bold" }}>
                      Elo {p.elo_rating}
                    </span>
                  </div>
                ))}
              </div>

              {/* T */}
              <div
                style={{
                  backgroundColor: "rgba(249, 115, 22, 0.05)",
                  border: "1px solid rgba(249, 115, 22, 0.3)",
                  borderRadius: "8px",
                  padding: "16px",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    color: "#fb923c",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Swords size={18} /> T (Avg Elo: {teams.tAvg})
                </h4>
                {teams.t.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      backgroundColor: "#0d1117",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      marginBottom: "6px",
                      fontSize: "14px",
                    }}
                  >
                    <span>{p.name}</span>
                    <span style={{ color: "#38bdf8", fontWeight: "bold" }}>
                      Elo {p.elo_rating}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* إدخال النتيجة النهائية للحساب التلقائي */}
            <div
              style={{
                backgroundColor: "#0d1117",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid #21262d",
              }}
            >
              <h4 style={{ margin: "0 0 12px 0", fontSize: "15px" }}>
                تسجيل نتيجة المباراة النهائية:
              </h4>
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <label style={{ fontSize: "12px", color: "#60a5fa" }}>
                    سكور CT:
                  </label>
                  <input
                    type="number"
                    value={scoreCTInput}
                    onChange={(e) => setScoreCTInput(Number(e.target.value))}
                    style={{
                      width: "60px",
                      backgroundColor: "#161b22",
                      border: "1px solid #30363d",
                      color: "#fff",
                      padding: "6px",
                      borderRadius: "4px",
                      textAlign: "center",
                      display: "block",
                    }}
                  />
                </div>
                <span style={{ fontWeight: "bold", fontSize: "18px" }}>:</span>
                <div>
                  <label style={{ fontSize: "12px", color: "#fb923c" }}>
                    سكور T:
                  </label>
                  <input
                    type="number"
                    value={scoreTInput}
                    onChange={(e) => setScoreTInput(Number(e.target.value))}
                    style={{
                      width: "60px",
                      backgroundColor: "#161b22",
                      border: "1px solid #30363d",
                      color: "#fff",
                      padding: "6px",
                      borderRadius: "4px",
                      textAlign: "center",
                      display: "block",
                    }}
                  />
                </div>
                <button
                  onClick={recordMatchResult}
                  style={{
                    backgroundColor: "#22c55e",
                    color: "#000",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    marginRight: "auto",
                  }}
                >
                  حفظ النتيجة وتحديث الـ Elo 🏆
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
