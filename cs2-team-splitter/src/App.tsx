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
  History,
  Repeat,
  Flame,
  Users,
  Calendar,
  Target,
  UserPlus,
  X,
  Eye,
  CheckCircle2,
  Edit,
  RefreshCw,
} from "lucide-react";

interface Player {
  id: string;
  name: string;
  skill_rating: number;
  elo_rating: number;
  matches_played: number;
  wins: number;
  losses: number;
  win_streak: number;
}

interface SplitResult {
  ct: Player[];
  t: Player[];
  ctScore: number;
  tScore: number;
  ctAvg: string;
  tAvg: string;
}

interface MatchPlayerDetail {
  player_id: string;
  player_name: string;
  team: "CT" | "T";
  kills: number;
}

interface DetailedMatchRecord {
  id: string;
  map_name: string;
  score_ct: number;
  score_t: number;
  winner_side: string;
  created_at: string;
  players_details: MatchPlayerDetail[];
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
  const [activeTab, setActiveTab] = useState<
    "matchmaker" | "players" | "history" | "leaderboard"
  >("matchmaker");
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [detailedMatches, setDetailedMatches] = useState<DetailedMatchRecord[]>(
    [],
  );

  // اللاعب المختار لعرض التفاصيل/الأرشيف
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);

  // اللاعب المختار للتعديل
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editName, setEditName] = useState("");
  const [editSkill, setEditSkill] = useState(5);
  const [editElo, setEditElo] = useState(1000);

  // إضافة لاعب جديد
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerSkill, setNewPlayerSkill] = useState(5);

  // إعدادات المباراة
  const [map, setMap] = useState(CS2_MAPS[0]);
  const [scoreCTInput, setScoreCTInput] = useState(13);
  const [scoreTInput, setScoreTInput] = useState(11);
  const [playerKillsInput, setPlayerKillsInput] = useState<{
    [playerId: string]: number;
  }>({});
  const [teams, setTeams] = useState<SplitResult | null>(null);

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // جلب البيانات الأساسية
  const fetchData = async () => {
    const { data: playersData } = await supabase
      .from("players")
      .select("*")
      .order("elo_rating", { ascending: false });

    if (playersData) setAllPlayers(playersData);
  };

  // جلب أرشيف المباريات المفصل
  const fetchMatchHistory = async () => {
    const { data: matchesData } = await supabase
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false });

    if (!matchesData) return;

    const formattedHistory: DetailedMatchRecord[] = [];

    for (const match of matchesData) {
      const { data: matchPlayers } = await supabase
        .from("match_players")
        .select("team, kills, player_id, players(name)")
        .eq("match_id", match.id);

      const playersDetails: MatchPlayerDetail[] = (matchPlayers || []).map(
        (mp: any) => ({
          player_id: mp.player_id,
          player_name: mp.players?.name || "لاعب محذوف",
          team: mp.team,
          kills: mp.kills || 0,
        }),
      );

      formattedHistory.push({
        ...match,
        players_details: playersDetails,
      });
    }

    setDetailedMatches(formattedHistory);
  };

  useEffect(() => {
    fetchData();
    fetchMatchHistory();
  }, []);

  const getPlayerTotalKills = (playerId: string) => {
    let total = 0;
    detailedMatches.forEach((m) => {
      const matchDetail = m.players_details.find(
        (p) => p.player_id === playerId,
      );
      if (matchDetail) total += matchDetail.kills;
    });
    return total;
  };

  const handleAddPlayer = async () => {
    const trimmedName = newPlayerName.trim();
    if (!trimmedName) {
      setError("الرجاء إدخال اسم اللاعب.");
      return;
    }

    setError("");
    const { error: insertError } = await supabase
      .from("players")
      .insert([
        {
          name: trimmedName,
          skill_rating: newPlayerSkill,
          elo_rating: 1000 + newPlayerSkill * 50,
        },
      ]);

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? `الاسم "${trimmedName}" موجود مسبقاً!`
          : "حدث خطأ أثناء إضافة اللاعب.",
      );
      return;
    }

    setNewPlayerName("");
    setNewPlayerSkill(5);
    fetchData();
  };

  // بدء التعديل على لاعب
  const startEditingPlayer = (player: Player) => {
    setEditingPlayer(player);
    setEditName(player.name);
    setEditSkill(player.skill_rating);
    setEditElo(player.elo_rating);
  };

  // حفظ التعديلات في Supabase
  const handleSavePlayerEdit = async () => {
    if (!editingPlayer) return;
    const trimmedName = editName.trim();
    if (!trimmedName) return;

    const { error: updateError } = await supabase
      .from("players")
      .update({
        name: trimmedName,
        skill_rating: editSkill,
        elo_rating: editElo,
      })
      .eq("id", editingPlayer.id);

    if (updateError) {
      alert("حدث خطأ أثناء التعديل، قد يكون الاسم مُستخدم مسبقاً.");
      return;
    }

    setEditingPlayer(null);
    fetchData();
    fetchMatchHistory();
  };

  // تصفير جميع الإحصائيات وبدء موسم جديد
  const handleResetAllStats = async () => {
    const confirm1 = window.confirm(
      "هل أنت أرباب ومتأكد من تصفير كافة الإحصائيات وأرشيف المباريات لجميع اللاعبين؟",
    );
    if (!confirm1) return;

    // 1. مسح جدول المباريات والتفاصيل
    await supabase
      .from("match_players")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("matches")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    // 2. تصفير الـ Elo والإحصائيات لكل اللاعبين
    for (const p of allPlayers) {
      await supabase
        .from("players")
        .update({
          matches_played: 0,
          wins: 0,
          losses: 0,
          win_streak: 0,
          elo_rating: 1000 + p.skill_rating * 50,
        })
        .eq("id", p.id);
    }

    alert("تم تصفير جميع الإحصائيات وبدء موسم جديد بنجاح! 🔄");
    fetchData();
    fetchMatchHistory();
  };

  const togglePlayerSelection = (id: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id],
    );
  };

  const handleDeletePlayer = async (id: string) => {
    await supabase.from("players").delete().eq("id", id);
    setSelectedPlayerIds((prev) => prev.filter((pId) => pId !== id));
    fetchData();
  };

  const divideTeams = () => {
    const activePlayers = allPlayers.filter((p) =>
      selectedPlayerIds.includes(p.id),
    );

    if (activePlayers.length < 2) {
      setError("اختر لاعبين اثنين على الأقل.");
      return;
    }

    if (activePlayers.length % 2 !== 0) {
      setError("عدد اللاعبين يجب أن يكون زوجياً.");
      return;
    }

    setError("");
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

  const movePlayerToOtherTeam = (player: Player, currentTeam: "CT" | "T") => {
    if (!teams) return;
    if (currentTeam === "CT") {
      setTeams({
        ...teams,
        ct: teams.ct.filter((p) => p.id !== player.id),
        t: [...teams.t, player],
      });
    } else {
      setTeams({
        ...teams,
        t: teams.t.filter((p) => p.id !== player.id),
        ct: [...teams.ct, player],
      });
    }
  };

  const switchSides = () => {
    if (!teams) return;
    setTeams({
      ...teams,
      ct: teams.t,
      t: teams.ct,
      ctAvg: teams.tAvg,
      tAvg: teams.ctAvg,
    });
  };

  const handleEndMatch = async () => {
    if (!teams) return;
    const winnerSide =
      scoreCTInput > scoreTInput
        ? "CT"
        : scoreCTInput < scoreTInput
          ? "T"
          : "DRAW";

    const { data: matchData } = await supabase
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

    if (!matchData) return;

    const winners =
      winnerSide === "CT" ? teams.ct : winnerSide === "T" ? teams.t : [];
    const losers =
      winnerSide === "CT" ? teams.t : winnerSide === "T" ? teams.ct : [];

    for (const p of teams.ct) {
      const kills = playerKillsInput[p.id] || 0;
      const isWinner = winnerSide === "CT";
      const eloDiff = isWinner ? 25 : -20;

      await supabase
        .from("match_players")
        .insert([
          {
            match_id: matchData.id,
            player_id: p.id,
            team: "CT",
            kills,
            elo_change: eloDiff,
          },
        ]);
    }

    for (const p of teams.t) {
      const kills = playerKillsInput[p.id] || 0;
      const isWinner = winnerSide === "T";
      const eloDiff = isWinner ? 25 : -20;

      await supabase
        .from("match_players")
        .insert([
          {
            match_id: matchData.id,
            player_id: p.id,
            team: "T",
            kills,
            elo_change: eloDiff,
          },
        ]);
    }

    for (const p of winners) {
      await supabase
        .from("players")
        .update({
          matches_played: p.matches_played + 1,
          wins: p.wins + 1,
          win_streak: (p.win_streak || 0) + 1,
          elo_rating: p.elo_rating + 25,
        })
        .eq("id", p.id);
    }

    for (const p of losers) {
      await supabase
        .from("players")
        .update({
          matches_played: p.matches_played + 1,
          losses: p.losses + 1,
          win_streak: 0,
          elo_rating: Math.max(100, p.elo_rating - 20),
        })
        .eq("id", p.id);
    }

    alert("تم إنهاء المباراة وحفظ الكيلات وتحديث الإحصائيات بنجاح! 🏆");
    setTeams(null);
    setPlayerKillsInput({});
    fetchData();
    fetchMatchHistory();
  };

  const copyToClipboard = () => {
    if (!teams) return;
    const text = `CS2 MATCH SPLIT (${map})\n----------------------------\n🔷 Counter-Terrorists (CT):\n${teams.ct.map((p) => `  • ${p.name} (Elo ${p.elo_rating})`).join("\n")}\n\n🔶 Terrorists (T):\n${teams.t.map((p) => `  • ${p.name} (Elo ${p.elo_rating})`).join("\n")}`;
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
      <div style={{ maxWidth: "980px", margin: "0 auto" }}>
        {/* Navigation Tabs Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "800",
              color: "#ffffff",
              margin: 0,
            }}
          >
            CS2 Squad Matchmaker
          </h1>
          <div
            style={{
              display: "inline-flex",
              backgroundColor: "#161b22",
              padding: "4px",
              borderRadius: "30px",
              marginTop: "16px",
              border: "1px solid #30363d",
              gap: "4px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => setActiveTab("matchmaker")}
              style={{
                backgroundColor:
                  activeTab === "matchmaker" ? "#f59e0b" : "transparent",
                color: activeTab === "matchmaker" ? "#000" : "#8b949e",
                border: "none",
                padding: "8px 18px",
                borderRadius: "20px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Swords size={16} /> التشكيل والتقسيم
            </button>
            <button
              onClick={() => setActiveTab("players")}
              style={{
                backgroundColor:
                  activeTab === "players" ? "#f59e0b" : "transparent",
                color: activeTab === "players" ? "#000" : "#8b949e",
                border: "none",
                padding: "8px 18px",
                borderRadius: "20px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Users size={16} /> إدارة اللاعبين
            </button>
            <button
              onClick={() => setActiveTab("history")}
              style={{
                backgroundColor:
                  activeTab === "history" ? "#f59e0b" : "transparent",
                color: activeTab === "history" ? "#000" : "#8b949e",
                border: "none",
                padding: "8px 18px",
                borderRadius: "20px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <History size={16} /> أرشيف المباريات
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              style={{
                backgroundColor:
                  activeTab === "leaderboard" ? "#f59e0b" : "transparent",
                color: activeTab === "leaderboard" ? "#000" : "#8b949e",
                border: "none",
                padding: "8px 18px",
                borderRadius: "20px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Award size={16} /> جدول الصدارة
            </button>
          </div>
        </div>

        {/* TAB 1: Matchmaker */}
        {activeTab === "matchmaker" && (
          <>
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
                  <Users size={20} color="#38bdf8" /> اختيار الحاضرين للجولة (
                  {selectedPlayerIds.length})
                </h3>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: "12px",
                }}
              >
                {allPlayers.map((player) => {
                  const isSelected = selectedPlayerIds.includes(player.id);
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
                        justify: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "bold",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        {isSelected && <UserCheck size={16} color="#38bdf8" />}
                        {player.name}
                      </div>
                      <span
                        style={{
                          color: "#38bdf8",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        Elo {player.elo_rating}
                      </span>
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

            {/* شاشة التشكيلة */}
            {teams && (
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
                    }}
                  >
                    <Trophy size={20} color="#f59e0b" /> التشكيلة الجارية ({map}
                    )
                  </h3>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={switchSides}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        backgroundColor: "#21262d",
                        border: "1px solid #30363d",
                        color: "#f59e0b",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      <Repeat size={16} /> قلب الأطراف (Half-Time)
                    </button>
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
                        fontSize: "13px",
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
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "16px",
                    marginBottom: "20px",
                  }}
                >
                  {/* فريق CT */}
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
                      <Shield size={18} /> Counter-Terrorists (CT)
                    </h4>
                    {teams.ct.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          backgroundColor: "#0d1117",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          marginBottom: "6px",
                        }}
                      >
                        <span>{p.name}</span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <input
                            type="number"
                            placeholder="Kills"
                            value={playerKillsInput[p.id] || ""}
                            onChange={(e) =>
                              setPlayerKillsInput({
                                ...playerKillsInput,
                                [p.id]: Number(e.target.value),
                              })
                            }
                            style={{
                              width: "55px",
                              backgroundColor: "#161b22",
                              border: "1px solid #30363d",
                              color: "#22c55e",
                              padding: "4px",
                              borderRadius: "4px",
                              textAlign: "center",
                              fontWeight: "bold",
                            }}
                          />
                          <button
                            onClick={() => movePlayerToOtherTeam(p, "CT")}
                            style={{
                              backgroundColor: "transparent",
                              border: "none",
                              color: "#fb923c",
                              cursor: "pointer",
                              fontSize: "11px",
                            }}
                          >
                            ➔
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* فريق T */}
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
                      <Swords size={18} /> Terrorists (T)
                    </h4>
                    {teams.t.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          backgroundColor: "#0d1117",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          marginBottom: "6px",
                        }}
                      >
                        <span>{p.name}</span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <input
                            type="number"
                            placeholder="Kills"
                            value={playerKillsInput[p.id] || ""}
                            onChange={(e) =>
                              setPlayerKillsInput({
                                ...playerKillsInput,
                                [p.id]: Number(e.target.value),
                              })
                            }
                            style={{
                              width: "55px",
                              backgroundColor: "#161b22",
                              border: "1px solid #30363d",
                              color: "#22c55e",
                              padding: "4px",
                              borderRadius: "4px",
                              textAlign: "center",
                              fontWeight: "bold",
                            }}
                          />
                          <button
                            onClick={() => movePlayerToOtherTeam(p, "T")}
                            style={{
                              backgroundColor: "transparent",
                              border: "none",
                              color: "#60a5fa",
                              cursor: "pointer",
                              fontSize: "11px",
                            }}
                          >
                            ⬅
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "#0d1117",
                    padding: "16px",
                    borderRadius: "8px",
                    border: "1px solid #21262d",
                  }}
                >
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "15px" }}>
                    إنهاء المباراة وتسجيل النتيجة النهائية:
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <label style={{ fontSize: "12px", color: "#60a5fa" }}>
                          CT Score:
                        </label>
                        <input
                          type="number"
                          value={scoreCTInput}
                          onChange={(e) =>
                            setScoreCTInput(Number(e.target.value))
                          }
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
                      <span style={{ fontWeight: "bold", fontSize: "18px" }}>
                        :
                      </span>
                      <div>
                        <label style={{ fontSize: "12px", color: "#fb923c" }}>
                          T Score:
                        </label>
                        <input
                          type="number"
                          value={scoreTInput}
                          onChange={(e) =>
                            setScoreTInput(Number(e.target.value))
                          }
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
                    </div>

                    <button
                      onClick={handleEndMatch}
                      style={{
                        backgroundColor: "#22c55e",
                        color: "#000",
                        border: "none",
                        padding: "12px 24px",
                        borderRadius: "6px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginRight: "auto",
                      }}
                    >
                      <CheckCircle2 size={18} /> End Match (إنهاء المباراة)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: Players */}
        {activeTab === "players" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Users size={20} color="#38bdf8" /> إدارة اللاعبين (
                {allPlayers.length})
              </h3>
              <button
                onClick={handleResetAllStats}
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid #ef4444",
                  color: "#ef4444",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <RefreshCw size={14} /> تصفير جميع الإحصائيات (الموسم الجديد)
              </button>
            </div>

            {/* إضافة لاعب */}
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
                <UserPlus size={18} color="#f59e0b" /> إضافة لاعب جديد
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
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                    Skill:
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
                    color: "#ef4444",
                    fontSize: "13px",
                    marginTop: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
                gap: "16px",
              }}
            >
              {allPlayers.map((player) => {
                const totalKills = getPlayerTotalKills(player.id);
                const winRate =
                  player.matches_played > 0
                    ? Math.round((player.wins / player.matches_played) * 100)
                    : 0;
                const avgKills =
                  player.matches_played > 0
                    ? (totalKills / player.matches_played).toFixed(1)
                    : "0";

                return (
                  <div
                    key={player.id}
                    onClick={() => setViewingPlayer(player)}
                    style={{
                      backgroundColor: "#161b22",
                      border: "1px solid #30363d",
                      borderRadius: "12px",
                      padding: "16px",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                        borderBottom: "1px solid #21262d",
                        paddingBottom: "10px",
                      }}
                    >
                      <div>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: "18px",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          {player.name}
                          {player.win_streak >= 3 && (
                            <span
                              style={{
                                color: "#f59e0b",
                                fontSize: "12px",
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                            >
                              <Flame size={14} />
                              {player.win_streak}
                            </span>
                          )}
                        </h4>
                        <span style={{ fontSize: "12px", color: "#8b949e" }}>
                          Rating Lvl: {player.skill_rating}
                        </span>
                      </div>
                      <div style={{ textAlign: "left" }}>
                        <div
                          style={{
                            fontSize: "16px",
                            fontWeight: "bold",
                            color: "#38bdf8",
                          }}
                        >
                          Elo {player.elo_rating}
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#38bdf8",
                            display: "flex",
                            alignItems: "center",
                            gap: "2px",
                            marginTop: "2px",
                          }}
                        >
                          <Eye size={12} /> انقر للتاريخ
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "10px",
                        fontSize: "13px",
                        marginBottom: "12px",
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: "#0d1117",
                          padding: "8px",
                          borderRadius: "6px",
                        }}
                      >
                        <span
                          style={{
                            color: "#8b949e",
                            display: "block",
                            fontSize: "11px",
                          }}
                        >
                          المباريات
                        </span>
                        <strong style={{ color: "#fff", fontSize: "14px" }}>
                          {player.matches_played}
                        </strong>
                      </div>
                      <div
                        style={{
                          backgroundColor: "#0d1117",
                          padding: "8px",
                          borderRadius: "6px",
                        }}
                      >
                        <span
                          style={{
                            color: "#8b949e",
                            display: "block",
                            fontSize: "11px",
                          }}
                        >
                          نسبة الفوز
                        </span>
                        <strong style={{ color: "#22c55e", fontSize: "14px" }}>
                          {winRate}%
                        </strong>{" "}
                        ({player.wins}W / {player.losses}L)
                      </div>
                      <div
                        style={{
                          backgroundColor: "#0d1117",
                          padding: "8px",
                          borderRadius: "6px",
                        }}
                      >
                        <span
                          style={{
                            color: "#8b949e",
                            display: "block",
                            fontSize: "11px",
                          }}
                        >
                          إجمالي الكيلات
                        </span>
                        <strong
                          style={{
                            color: "#f59e0b",
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Target size={14} /> {totalKills}
                        </strong>
                      </div>
                      <div
                        style={{
                          backgroundColor: "#0d1117",
                          padding: "8px",
                          borderRadius: "6px",
                        }}
                      >
                        <span
                          style={{
                            color: "#8b949e",
                            display: "block",
                            fontSize: "11px",
                          }}
                        >
                          معدل Kills/Match
                        </span>
                        <strong style={{ color: "#38bdf8", fontSize: "14px" }}>
                          {avgKills}
                        </strong>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        borderTop: "1px solid #21262d",
                        paddingTop: "10px",
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditingPlayer(player);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#f59e0b",
                          cursor: "pointer",
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Edit size={14} /> تعديل البيانات
                      </button>
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
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Trash2 size={14} /> حذف
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: Match History */}
        {activeTab === "history" && (
          <div
            style={{
              backgroundColor: "#161b22",
              border: "1px solid #30363d",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <h3
              style={{
                margin: "0 0 20px 0",
                fontSize: "18px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <History size={20} color="#f59e0b" /> سجل المباريات المفصّل (
              {detailedMatches.length})
            </h3>

            <div style={{ display: "grid", gap: "16px" }}>
              {detailedMatches.map((m) => {
                const ctPlayers = m.players_details.filter(
                  (p) => p.team === "CT",
                );
                const tPlayers = m.players_details.filter(
                  (p) => p.team === "T",
                );

                return (
                  <div
                    key={m.id}
                    style={{
                      backgroundColor: "#0d1117",
                      borderRadius: "8px",
                      border: "1px solid #21262d",
                      padding: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                        borderBottom: "1px solid #21262d",
                        paddingBottom: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: "bold",
                            color: "#fff",
                            fontSize: "16px",
                          }}
                        >
                          {m.map_name}
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#8b949e",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Calendar size={14} />{" "}
                          {new Date(m.created_at).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                      <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                        <span style={{ color: "#60a5fa" }}>{m.score_ct}</span> :{" "}
                        <span style={{ color: "#fb923c" }}>{m.score_t}</span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(240px, 1fr))",
                        gap: "16px",
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: "rgba(59, 130, 246, 0.05)",
                          padding: "10px",
                          borderRadius: "6px",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: "bold",
                            color: "#60a5fa",
                            marginBottom: "6px",
                          }}
                        >
                          CT Side
                        </div>
                        {ctPlayers.map((p) => (
                          <div
                            key={p.player_id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "13px",
                              padding: "3px 0",
                            }}
                          >
                            <span>{p.player_name}</span>
                            <span
                              style={{ color: "#22c55e", fontWeight: "bold" }}
                            >
                              {p.kills} Kills
                            </span>
                          </div>
                        ))}
                      </div>

                      <div
                        style={{
                          backgroundColor: "rgba(249, 115, 22, 0.05)",
                          padding: "10px",
                          borderRadius: "6px",
                          border: "1px solid rgba(249, 115, 22, 0.2)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: "bold",
                            color: "#fb923c",
                            marginBottom: "6px",
                          }}
                        >
                          T Side
                        </div>
                        {tPlayers.map((p) => (
                          <div
                            key={p.player_id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "13px",
                              padding: "3px 0",
                            }}
                          >
                            <span>{p.player_name}</span>
                            <span
                              style={{ color: "#22c55e", fontWeight: "bold" }}
                            >
                              {p.kills} Kills
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: Leaderboard */}
        {activeTab === "leaderboard" && (
          <div
            style={{
              backgroundColor: "#161b22",
              border: "1px solid #30363d",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <h3
              style={{
                margin: "0 0 20px 0",
                fontSize: "18px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Award size={20} color="#f59e0b" /> ترتيب تصنيف اللاعبين
            </h3>

            <div style={{ display: "grid", gap: "10px" }}>
              {allPlayers.map((player, rank) => {
                const winRate =
                  player.matches_played > 0
                    ? Math.round((player.wins / player.matches_played) * 100)
                    : 0;

                return (
                  <div
                    key={player.id}
                    onClick={() => setViewingPlayer(player)}
                    style={{
                      backgroundColor: "#0d1117",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid #21262d",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: "bold",
                          fontSize: "16px",
                          color:
                            rank === 0
                              ? "#f59e0b"
                              : rank === 1
                                ? "#94a3b8"
                                : rank === 2
                                  ? "#854d0e"
                                  : "#484f58",
                        }}
                      >
                        #{rank + 1}
                      </span>
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
                          {player.name}
                          {player.win_streak >= 3 && (
                            <span
                              style={{
                                color: "#f59e0b",
                                fontSize: "12px",
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                            >
                              <Flame size={14} />
                              {player.win_streak}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#8b949e",
                            marginTop: "2px",
                          }}
                        >
                          مباريات: {player.matches_played} | فوز: {player.wins}{" "}
                          | خسارة: {player.losses} ({winRate}%)
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: "bold",
                        color: "#38bdf8",
                      }}
                    >
                      Elo {player.elo_rating}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MODAL: نافذة تعديل بيانات اللاعب */}
        {editingPlayer && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "16px",
            }}
          >
            <div
              style={{
                backgroundColor: "#161b22",
                border: "1px solid #30363d",
                borderRadius: "12px",
                width: "100%",
                maxWidth: "450px",
                padding: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <h3 style={{ margin: 0, color: "#fff" }}>
                  تعديل بيانات اللاعب
                </h3>
                <button
                  onClick={() => setEditingPlayer(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#8b949e",
                    cursor: "pointer",
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: "grid", gap: "16px" }}>
                <div>
                  <label
                    style={{
                      fontSize: "13px",
                      color: "#8b949e",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    الاسم:
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{
                      width: "100%",
                      backgroundColor: "#0d1117",
                      border: "1px solid #30363d",
                      color: "#fff",
                      padding: "10px",
                      borderRadius: "6px",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      fontSize: "13px",
                      color: "#8b949e",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Skill Rating (1-10):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editSkill}
                    onChange={(e) => setEditSkill(Number(e.target.value))}
                    style={{
                      width: "100%",
                      backgroundColor: "#0d1117",
                      border: "1px solid #30363d",
                      color: "#f59e0b",
                      padding: "10px",
                      borderRadius: "6px",
                      fontWeight: "bold",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      fontSize: "13px",
                      color: "#8b949e",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Elo Rating الحالي:
                  </label>
                  <input
                    type="number"
                    value={editElo}
                    onChange={(e) => setEditElo(Number(e.target.value))}
                    style={{
                      width: "100%",
                      backgroundColor: "#0d1117",
                      border: "1px solid #30363d",
                      color: "#38bdf8",
                      padding: "10px",
                      borderRadius: "6px",
                      fontWeight: "bold",
                    }}
                  />
                </div>

                <button
                  onClick={handleSavePlayerEdit}
                  style={{
                    backgroundColor: "#22c55e",
                    color: "#000",
                    border: "none",
                    padding: "12px",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    marginTop: "10px",
                  }}
                >
                  حفظ التعديلات
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: نافذة عرض الأرشيف الشخصي الكامل للاعب */}
        {viewingPlayer && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "16px",
            }}
          >
            <div
              style={{
                backgroundColor: "#161b22",
                border: "1px solid #30363d",
                borderRadius: "12px",
                width: "100%",
                maxWidth: "750px",
                maxHeight: "85vh",
                overflowY: "auto",
                padding: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid #21262d",
                  paddingBottom: "16px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      color: "#fff",
                      fontSize: "24px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {viewingPlayer.name}
                    {viewingPlayer.win_streak >= 3 && (
                      <span
                        style={{
                          color: "#f59e0b",
                          fontSize: "14px",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        <Flame size={16} />
                        {viewingPlayer.win_streak} Streak
                      </span>
                    )}
                  </h2>
                  <span style={{ fontSize: "13px", color: "#38bdf8" }}>
                    Elo Rating: {viewingPlayer.elo_rating}
                  </span>
                </div>
                <button
                  onClick={() => setViewingPlayer(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#8b949e",
                    cursor: "pointer",
                  }}
                >
                  <X size={24} />
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "12px",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#0d1117",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #21262d",
                    textAlign: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#8b949e",
                      display: "block",
                    }}
                  >
                    إجمالي المباريات
                  </span>
                  <strong style={{ fontSize: "18px", color: "#fff" }}>
                    {viewingPlayer.matches_played}
                  </strong>
                </div>
                <div
                  style={{
                    backgroundColor: "#0d1117",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #21262d",
                    textAlign: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#8b949e",
                      display: "block",
                    }}
                  >
                    نسبة الفوز
                  </span>
                  <strong style={{ fontSize: "18px", color: "#22c55e" }}>
                    {viewingPlayer.matches_played > 0
                      ? Math.round(
                          (viewingPlayer.wins / viewingPlayer.matches_played) *
                            100,
                        )
                      : 0}
                    %
                  </strong>
                </div>
                <div
                  style={{
                    backgroundColor: "#0d1117",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #21262d",
                    textAlign: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#8b949e",
                      display: "block",
                    }}
                  >
                    إجمالي الكيلات
                  </span>
                  <strong style={{ fontSize: "18px", color: "#f59e0b" }}>
                    {getPlayerTotalKills(viewingPlayer.id)}
                  </strong>
                </div>
              </div>

              <h3
                style={{
                  fontSize: "16px",
                  color: "#fff",
                  marginBottom: "16px",
                }}
              >
                أرشيف مباريات {viewingPlayer.name} بالتفصيل:
              </h3>

              {detailedMatches.filter((m) =>
                m.players_details.some((p) => p.player_id === viewingPlayer.id),
              ).length === 0 ? (
                <p style={{ color: "#8b949e", fontSize: "14px" }}>
                  لم يشارك هذا اللاعب في أي مباراة مسجلة حتى الآن.
                </p>
              ) : (
                <div style={{ display: "grid", gap: "16px" }}>
                  {detailedMatches
                    .filter((m) =>
                      m.players_details.some(
                        (p) => p.player_id === viewingPlayer.id,
                      ),
                    )
                    .map((match) => {
                      const playerDetail = match.players_details.find(
                        (p) => p.player_id === viewingPlayer.id,
                      );
                      const isWinner =
                        (playerDetail?.team === "CT" &&
                          match.score_ct > match.score_t) ||
                        (playerDetail?.team === "T" &&
                          match.score_t > match.score_ct);

                      return (
                        <div
                          key={match.id}
                          style={{
                            backgroundColor: "#0d1117",
                            border: `1px solid ${isWinner ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                            borderRadius: "8px",
                            padding: "14px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "8px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <span
                                style={{
                                  backgroundColor: isWinner
                                    ? "#22c55e"
                                    : "#ef4444",
                                  color: "#000",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: "bold",
                                }}
                              >
                                {isWinner ? "VICTORY 🏆" : "DEFEAT ❌"}
                              </span>
                              <strong style={{ color: "#fff" }}>
                                {match.map_name}
                              </strong>
                              <span
                                style={{ fontSize: "12px", color: "#8b949e" }}
                              >
                                (
                                {new Date(match.created_at).toLocaleDateString(
                                  "ar-EG",
                                )}
                                )
                              </span>
                            </div>
                            <div style={{ fontWeight: "bold" }}>
                              <span style={{ color: "#60a5fa" }}>
                                {match.score_ct}
                              </span>{" "}
                              :{" "}
                              <span style={{ color: "#fb923c" }}>
                                {match.score_t}
                              </span>
                            </div>
                          </div>

                          <div
                            style={{
                              fontSize: "13px",
                              color: "#22c55e",
                              fontWeight: "bold",
                              marginBottom: "10px",
                            }}
                          >
                            الكيلات التي سجلها {viewingPlayer.name}:{" "}
                            {playerDetail?.kills || 0} Kills
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "10px",
                              fontSize: "12px",
                              backgroundColor: "#161b22",
                              padding: "8px",
                              borderRadius: "6px",
                            }}
                          >
                            <div>
                              <span
                                style={{ color: "#60a5fa", fontWeight: "bold" }}
                              >
                                تشكيلة CT:
                              </span>
                              {match.players_details
                                .filter((p) => p.team === "CT")
                                .map((p) => (
                                  <div
                                    key={p.player_id}
                                    style={{
                                      color:
                                        p.player_id === viewingPlayer.id
                                          ? "#38bdf8"
                                          : "#8b949e",
                                      fontWeight:
                                        p.player_id === viewingPlayer.id
                                          ? "bold"
                                          : "normal",
                                    }}
                                  >
                                    • {p.player_name} ({p.kills} K)
                                  </div>
                                ))}
                            </div>
                            <div>
                              <span
                                style={{ color: "#fb923c", fontWeight: "bold" }}
                              >
                                تشكيلة T:
                              </span>
                              {match.players_details
                                .filter((p) => p.team === "T")
                                .map((p) => (
                                  <div
                                    key={p.player_id}
                                    style={{
                                      color:
                                        p.player_id === viewingPlayer.id
                                          ? "#38bdf8"
                                          : "#8b949e",
                                      fontWeight:
                                        p.player_id === viewingPlayer.id
                                          ? "bold"
                                          : "normal",
                                    }}
                                  >
                                    • {p.player_name} ({p.kills} K)
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
