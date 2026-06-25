import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import checklistData from "@/data/checklist.json";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ShieldCheck, Download, Search, RotateCcw, ListChecks, BarChart3, FileText, Presentation, Upload, FileJson, FileSpreadsheet, ChevronDown } from "lucide-react";
import { SupportDialog } from "@/components/SupportDialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  Cell,
  Pie,
  PieChart,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Checklist QNRCS — Avaliação de Capacidades de Cibersegurança" },
      {
        name: "description",
        content:
          "Checklist interativo baseado no Quadro Nacional de Referência para a Cibersegurança (CNCS).",
      },
    ],
  }),
  component: Index,
});

type Level = { level: string; description: string; evidence: string };
type Item = {
  objective: string;
  category: string;
  subcategory: string;
  reference: string;
  levels: Level[];
};

type State = Record<string, { checked: Record<string, boolean>; notes: string; none?: boolean }>;

const STORAGE_KEY = "qnrcs-checklist-v1";
const META_KEY = "qnrcs-meta-v1";
const PROJECT_VERSION = "1.0";
const FRAMEWORK = "QNRCS";

const OBJECTIVE_ORDER = ["IDENTIFICAR", "PROTEGER", "DETETAR", "RESPONDER", "RECUPERAR"];

const OBJECTIVE_META: Record<string, { color: string; desc: string }> = {
  IDENTIFICAR: { color: "bg-chart-1/15 text-chart-1 border-chart-1/30", desc: "Compreender o contexto e gerir o risco" },
  PROTEGER: { color: "bg-chart-2/15 text-chart-2 border-chart-2/30", desc: "Salvaguardar a entrega dos serviços críticos" },
  DETETAR: { color: "bg-chart-3/15 text-chart-3 border-chart-3/30", desc: "Identificar eventos de cibersegurança" },
  RESPONDER: { color: "bg-chart-4/15 text-chart-4 border-chart-4/30", desc: "Agir perante um incidente detetado" },
  RECUPERAR: { color: "bg-chart-5/15 text-chart-5 border-chart-5/30", desc: "Restaurar capacidades e serviços afetados" },
};

const LEVEL_STYLES: Record<string, { card: string; badge: string; dot: string }> = {
  "1 – Inicial": {
    card: "border-level-1/40 bg-level-1/5 hover:bg-level-1/10",
    badge: "bg-level-1 text-level-1-foreground border-transparent",
    dot: "bg-level-1",
  },
  "2 – Intermédio": {
    card: "border-level-2/40 bg-level-2/5 hover:bg-level-2/10",
    badge: "bg-level-2 text-level-2-foreground border-transparent",
    dot: "bg-level-2",
  },
  "3 – Avançado": {
    card: "border-level-3/40 bg-level-3/5 hover:bg-level-3/10",
    badge: "bg-level-3 text-level-3-foreground border-transparent",
    dot: "bg-level-3",
  },
};

const LEVEL_FILL = ["var(--level-0)", "var(--level-1)", "var(--level-2)", "var(--level-3)"];

function maxReached(item: Item, st: { checked: Record<string, boolean>; none?: boolean } | undefined) {
  if (!st || st.none) return 0;
  const reached = item.levels.map((l, i) => (st.checked[l.level] ? i + 1 : 0)).filter(Boolean);
  return reached.length ? Math.max(...reached) : 0;
}

function isNone(st: { none?: boolean } | undefined) {
  return !!st?.none;
}

function Index() {
  const items = checklistData as Item[];
  const [state, setState] = useState<State>({});
  const [query, setQuery] = useState("");
  const [organization, setOrganization] = useState("");
  const [assessmentDate, setAssessmentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
      const meta = localStorage.getItem(META_KEY);
      if (meta) {
        const m = JSON.parse(meta);
        if (m.organization) setOrganization(m.organization);
        if (m.assessmentDate) setAssessmentDate(m.assessmentDate);
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem(META_KEY, JSON.stringify({ organization, assessmentDate }));
  }, [organization, assessmentDate]);

  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, Item[]>>();
    for (const it of items) {
      const obj = it.objective.replace(/\s+/g, "");
      if (!map.has(obj)) map.set(obj, new Map());
      const cats = map.get(obj)!;
      if (!cats.has(it.category)) cats.set(it.category, []);
      cats.get(it.category)!.push(it);
    }
    return map;
  }, [items]);

  const filtered = (it: Item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      it.subcategory.toLowerCase().includes(q) ||
      it.category.toLowerCase().includes(q) ||
      it.objective.toLowerCase().includes(q)
    );
  };

  const stats = useMemo(() => {
    let achieved = 0;
    let none = 0;
    const levelCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const it of items) {
      const st = state[it.subcategory];
      if (isNone(st)) {
        none++;
        continue;
      }
      const m = maxReached(it, st);
      levelCounts[m as 0 | 1 | 2 | 3]++;
      if (m > 0) achieved++;
    }
    return { total: items.length, achieved, none, levelCounts };
  }, [items, state]);

  const objectiveStats = useMemo(() => {
    return OBJECTIVE_ORDER.map((obj) => {
      const cats = grouped.get(obj);
      const list: Item[] = [];
      if (cats) cats.forEach((arr) => list.push(...arr));
      const counts = { n0: 0, n1: 0, n2: 0, n3: 0, nNone: 0 };
      let sum = 0;
      let evaluated = 0;
      for (const it of list) {
        const st = state[it.subcategory];
        if (isNone(st)) {
          counts.nNone++;
          continue;
        }
        const m = maxReached(it, st);
        sum += m;
        evaluated++;
        counts[`n${m}` as "n0" | "n1" | "n2" | "n3"]++;
      }
      return {
        objective: obj,
        total: list.length,
        avg: evaluated ? sum / evaluated : 0,
        ...counts,
      };
    });
  }, [grouped, state]);

  const toggle = (sub: string, level: string) =>
    setState((s) => {
      const cur = s[sub] ?? { checked: {}, notes: "" };
      return {
        ...s,
        [sub]: { ...cur, none: false, checked: { ...cur.checked, [level]: !cur.checked[level] } },
      };
    });

  const toggleNone = (sub: string) =>
    setState((s) => {
      const cur = s[sub] ?? { checked: {}, notes: "" };
      const next = !cur.none;
      return { ...s, [sub]: { ...cur, none: next, checked: next ? {} : cur.checked } };
    });

  const setNote = (sub: string, notes: string) =>
    setState((s) => {
      const cur = s[sub] ?? { checked: {}, notes: "" };
      return { ...s, [sub]: { ...cur, notes } };
    });

  const reset = () => {
    if (confirm("Tem a certeza? Todos os dados serão apagados.")) setState({});
  };

  const exportCsv = () => {
    const rows = [["Objetivo", "Categoria", "Subcategoria", "Não tem", "Nível 1", "Nível 2", "Nível 3", "Observações"]];
    for (const it of items) {
      const st = state[it.subcategory] ?? { checked: {}, notes: "" };
      rows.push([
        it.objective,
        it.category,
        it.subcategory,
        st.none ? "Sim" : "",
        st.checked["1 – Inicial"] ? "Sim" : "",
        st.checked["2 – Intermédio"] ? "Sim" : "",
        st.checked["3 – Avançado"] ? "Sim" : "",
        st.notes ?? "",
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "checklist-qnrcs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const pct = stats.total ? (stats.achieved / stats.total) * 100 : 0;
    const avgMaturity = objectiveStats.length
      ? objectiveStats.reduce((a, b) => a + b.avg, 0) / objectiveStats.length
      : 0;
    const payload = {
      version: PROJECT_VERSION,
      framework: FRAMEWORK,
      exportDate: new Date().toISOString().slice(0, 10),
      organization: organization || "",
      assessmentDate,
      assessmentData: {
        responses: state,
        summary: {
          total: stats.total,
          achieved: stats.achieved,
          conformityPct: Number(pct.toFixed(2)),
          avgMaturity: Number(avgMaturity.toFixed(2)),
          levelCounts: stats.levelCounts,
          objectiveStats,
        },
        settings: {
          objectiveOrder: OBJECTIVE_ORDER,
        },
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const safeOrg = (organization || "projeto").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qnrcs-${safeOrg}-${assessmentDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = () => fileInputRef.current?.click();

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data || typeof data !== "object") throw new Error("Ficheiro inválido.");
      if (data.framework && data.framework !== FRAMEWORK) {
        throw new Error(`Framework incompatível: ${data.framework}. Esperado: ${FRAMEWORK}.`);
      }
      if (!data.version) throw new Error("Ficheiro sem versão. Estrutura desconhecida.");

      // Future-version migration hook
      let responses: State | undefined;
      if (data.assessmentData?.responses && typeof data.assessmentData.responses === "object") {
        responses = data.assessmentData.responses as State;
      } else if (data.responses && typeof data.responses === "object") {
        // legacy fallback
        responses = data.responses as State;
      }
      if (!responses) throw new Error("Ficheiro sem respostas válidas.");

      // Basic shape validation
      for (const [k, v] of Object.entries(responses)) {
        if (!v || typeof v !== "object" || typeof (v as any).checked !== "object") {
          throw new Error(`Entrada inválida para "${k}".`);
        }
      }

      setState(responses);
      if (typeof data.organization === "string") setOrganization(data.organization);
      if (typeof data.assessmentDate === "string") setAssessmentDate(data.assessmentDate);

      alert(`Projeto importado com sucesso (versão ${data.version}).`);
    } catch (err) {
      console.error(err);
      alert(`Não foi possível importar o ficheiro:\n${err instanceof Error ? err.message : "Formato inválido."}`);
    }
  };

  const generateReport = (kind: "executive" | "technical") => {
    const date = new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
    const LEVEL_COLORS = ["#e5e7eb", "#f59e0b", "#3b82f6", "#10b981"];
    const pct = stats.total ? (stats.achieved / stats.total) * 100 : 0;

    const objBlocks = objectiveStats.map((o) => {
      const segs = [o.n1, o.n2, o.n3]
        .map((v, i) => v ? `<div style="width:${(v / o.total) * 100}%;background:${LEVEL_COLORS[i + 1]}"></div>` : "")
        .join("");
      return `
        <div class="obj-row">
          <div class="obj-head"><strong>${o.objective}</strong><span>${o.avg.toFixed(2)} / 3 · ${o.total} subcategorias</span></div>
          <div class="bar">${segs}</div>
        </div>`;
    }).join("");

    // Pie SVG
    const totalPie = stats.total;
    let cum = 0;
    const pieSegs = [
      { v: stats.levelCounts[0], c: LEVEL_COLORS[0], l: "Sem avaliação" },
      { v: stats.levelCounts[1], c: LEVEL_COLORS[1], l: "Nível 1" },
      { v: stats.levelCounts[2], c: LEVEL_COLORS[2], l: "Nível 2" },
      { v: stats.levelCounts[3], c: LEVEL_COLORS[3], l: "Nível 3" },
    ];
    const pieSvg = pieSegs.filter(s => s.v > 0).map((s) => {
      const start = (cum / totalPie) * 2 * Math.PI;
      cum += s.v;
      const end = (cum / totalPie) * 2 * Math.PI;
      const x1 = 100 + 80 * Math.sin(start), y1 = 100 - 80 * Math.cos(start);
      const x2 = 100 + 80 * Math.sin(end), y2 = 100 - 80 * Math.cos(end);
      const large = end - start > Math.PI ? 1 : 0;
      return `<path d="M100,100 L${x1},${y1} A80,80 0 ${large} 1 ${x2},${y2} Z" fill="${s.c}"/>`;
    }).join("");
    const legend = pieSegs.map(s => `<div class="leg"><span style="background:${s.c}"></span>${s.l}: <strong>${s.v}</strong></div>`).join("");

    const css = `
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:system-ui,-apple-system,sans-serif;color:#1f2937;padding:32px;max-width:900px;margin:auto;line-height:1.5}
      h1{font-size:24px;margin-bottom:4px;color:#0f172a}
      h2{font-size:18px;margin:24px 0 12px;color:#0f172a;border-bottom:2px solid #e5e7eb;padding-bottom:6px}
      h3{font-size:14px;margin:16px 0 8px;color:#374151}
      .sub{color:#6b7280;font-size:13px;margin-bottom:24px}
      .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}
      .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:12px;background:#f9fafb}
      .kpi .l{font-size:11px;color:#6b7280;text-transform:uppercase}
      .kpi .v{font-size:28px;font-weight:700;margin-top:4px}
      .progress{height:12px;background:#e5e7eb;border-radius:6px;overflow:hidden;margin:8px 0 4px}
      .progress>div{height:100%;background:linear-gradient(90deg,#3b82f6,#10b981)}
      .obj-row{margin-bottom:14px}
      .obj-head{display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px}
      .obj-head span{color:#6b7280}
      .bar{display:flex;height:10px;background:#f3f4f6;border-radius:5px;overflow:hidden}
      .pie-wrap{display:flex;gap:24px;align-items:center;margin:12px 0}
      .leg{font-size:13px;display:flex;align-items:center;gap:8px;margin:4px 0}
      .leg span{display:inline-block;width:12px;height:12px;border-radius:2px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
      th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left;vertical-align:top}
      th{background:#f3f4f6;font-weight:600}
      .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;color:#fff}
      .cat{background:#f9fafb;font-weight:600}
      .notes{font-style:italic;color:#4b5563;font-size:11px}
      .footer{margin-top:32px;text-align:center;color:#9ca3af;font-size:11px;border-top:1px solid #e5e7eb;padding-top:12px}
      @media print {body{padding:16px} .no-print{display:none} h2{page-break-after:avoid} tr{page-break-inside:avoid}}
      .toolbar{position:fixed;top:12px;right:12px;display:flex;gap:8px}
      .toolbar button{padding:8px 14px;border:1px solid #d1d5db;background:#fff;border-radius:6px;cursor:pointer;font-size:13px}
      .toolbar button.primary{background:#0f172a;color:#fff;border-color:#0f172a}
    `;

    const header = `
      <div class="toolbar no-print">
        <button onclick="window.print()" class="primary">Imprimir</button>
        <button onclick="window.close()">Fechar</button>
      </div>
      <h1>${kind === "executive" ? "Relatório Executivo" : "Relatório Técnico"} — QNRCS</h1>
      <div class="sub">Quadro Nacional de Referência para a Cibersegurança · ${date}</div>
      <div class="kpis">
        <div class="kpi"><div class="l">Subcategorias</div><div class="v">${stats.total}</div></div>
        <div class="kpi"><div class="l">Avaliadas</div><div class="v">${stats.achieved}</div></div>
        <div class="kpi"><div class="l">Cobertura</div><div class="v">${pct.toFixed(0)}%</div></div>
        <div class="kpi"><div class="l">Maturidade média</div><div class="v">${(objectiveStats.reduce((a, b) => a + b.avg, 0) / objectiveStats.length).toFixed(2)}</div></div>
      </div>
      <div class="progress"><div style="width:${pct}%"></div></div>
    `;

    let body = "";
    if (kind === "executive") {
      body = `
        <h2>Distribuição global por nível</h2>
        <div class="pie-wrap">
          <svg viewBox="0 0 200 200" width="200" height="200">${pieSvg}<circle cx="100" cy="100" r="40" fill="#fff"/></svg>
          <div>${legend}</div>
        </div>
        <h2>Maturidade por objetivo</h2>
        ${objBlocks}
        <h2>Síntese</h2>
        <table>
          <thead><tr><th>Objetivo</th><th>Total</th><th>Nível 1</th><th>Nível 2</th><th>Nível 3</th><th>Sem aval.</th><th>Maturidade</th></tr></thead>
          <tbody>
            ${objectiveStats.map(o => `<tr><td><strong>${o.objective}</strong></td><td>${o.total}</td><td>${o.n1}</td><td>${o.n2}</td><td>${o.n3}</td><td>${o.n0}</td><td>${o.avg.toFixed(2)} / 3</td></tr>`).join("")}
          </tbody>
        </table>
      `;
    } else {
      const sections = OBJECTIVE_ORDER.map((objKey) => {
        const cats = grouped.get(objKey);
        if (!cats) return "";
        const catBlocks = Array.from(cats.entries()).map(([catName, subs]) => {
          const rows = subs.map((it) => {
            const st = state[it.subcategory] ?? { checked: {}, notes: "" };
            const max = maxReached(it, st);
            const badge = max ? `<span class="badge" style="background:${LEVEL_COLORS[max]}">Nível ${max}</span>` : `<span class="badge" style="background:#9ca3af">Não avaliado</span>`;
            const lvls = it.levels.map((l) => {
              const checked = st.checked[l.level] ? "✓" : "✗";
              return `<div><strong>${checked} ${l.level}</strong>${l.description ? `<div style="color:#4b5563">${l.description.replace(/\n/g, "<br>")}</div>` : ""}${l.evidence ? `<div class="notes"><em>Evidências:</em> ${l.evidence.replace(/\n/g, "<br>")}</div>` : ""}</div>`;
            }).join("<hr style='border:0;border-top:1px dashed #e5e7eb;margin:6px 0'>");
            return `
              <tr><td colspan="2">${badge} <strong>${it.subcategory}</strong>${it.reference ? `<div class="notes">Refs: ${it.reference}</div>` : ""}</td></tr>
              <tr><td style="width:55%">${lvls}</td><td>${st.notes ? `<strong>Observações:</strong><br>${st.notes.replace(/\n/g, "<br>")}` : "<em style='color:#9ca3af'>Sem observações</em>"}</td></tr>
            `;
          }).join("");
          return `<table><thead><tr><th colspan="2" class="cat">${catName}</th></tr></thead><tbody>${rows}</tbody></table><br>`;
        }).join("");
        return `<h2>${objKey}</h2>${catBlocks}`;
      }).join("");
      body = `<h2>Resumo por objetivo</h2>${objBlocks}${sections}`;
    }

    const html = `<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>${kind === "executive" ? "Relatório Executivo" : "Relatório Técnico"} QNRCS</title><style>${css}</style></head><body>${header}${body}<div class="footer">Gerado automaticamente · Checklist QNRCS</div></body></html>`;

    const w = window.open("", "_blank");
    if (!w) return alert("Permita pop-ups para gerar o relatório.");
    w.document.write(html);
    w.document.close();
  };

  const progress = stats.total ? (stats.achieved / stats.total) * 100 : 0;

  const pieData = [
    { name: "Sem avaliação", value: stats.levelCounts[0], color: "var(--level-0)" },
    { name: "Nível 1 — Inicial", value: stats.levelCounts[1], color: "var(--level-1)" },
    { name: "Nível 2 — Intermédio", value: stats.levelCounts[2], color: "var(--level-2)" },
    { name: "Nível 3 — Avançado", value: stats.levelCounts[3], color: "var(--level-3)" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Checklist QNRCS — Avaliação de Capacidades de Cibersegurança
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Quadro Nacional de Referência para a Cibersegurança · Centro Nacional de Cibersegurança
              </p>
            </div>
            <SupportDialog />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  Progresso: {stats.achieved} / {stats.total} subcategorias
                </span>
                <span className="text-muted-foreground">{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} className="mt-2" />
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-level-1/15 px-2.5 py-1">
                  <span className="h-2 w-2 rounded-full bg-level-1" /> Nível 1: {stats.levelCounts[1]}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-level-2/15 px-2.5 py-1">
                  <span className="h-2 w-2 rounded-full bg-level-2" /> Nível 2: {stats.levelCounts[2]}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-level-3/15 px-2.5 py-1">
                  <span className="h-2 w-2 rounded-full bg-level-3" /> Nível 3: {stats.levelCounts[3]}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" size="sm">
                    <Download className="mr-2 h-4 w-4" /> Exportar
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Dados</DropdownMenuLabel>
                  <DropdownMenuItem onClick={exportCsv}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportJson}>
                    <FileJson className="mr-2 h-4 w-4" /> Exportar Projeto JSON
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Relatórios</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => generateReport("executive")}>
                    <Presentation className="mr-2 h-4 w-4" /> Relatório Executivo PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => generateReport("technical")}>
                    <FileText className="mr-2 h-4 w-4" /> Relatório Técnico PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" onClick={importJson}>
                <Upload className="mr-2 h-4 w-4" /> Importar Projeto
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleFileImport}
              />
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reiniciar
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="org" className="text-xs">Organização</Label>
              <Input
                id="org"
                placeholder="Nome da organização"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adate" className="text-xs">Data da avaliação</Label>
              <Input
                id="adate"
                type="date"
                value={assessmentDate}
                onChange={(e) => setAssessmentDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard">
              <BarChart3 className="mr-2 h-4 w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="checklist">
              <ListChecks className="mr-2 h-4 w-4" /> Checklist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="space-y-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Pesquisar subcategoria, categoria ou objetivo…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {OBJECTIVE_ORDER.map((objKey) => {
              const cats = grouped.get(objKey);
              if (!cats) return null;
              const meta = OBJECTIVE_META[objKey];
              return (
                <section key={objKey}>
                  <div className={`mb-4 inline-flex items-center gap-3 rounded-full border px-4 py-1.5 ${meta.color}`}>
                    <span className="text-sm font-semibold tracking-wide">{objKey}</span>
                    <span className="text-xs opacity-80">{meta.desc}</span>
                  </div>
                  <div className="space-y-4">
                    {Array.from(cats.entries()).map(([catName, subs]) => {
                      const visible = subs.filter(filtered);
                      if (!visible.length) return null;
                      return (
                        <Card key={catName} className="overflow-hidden">
                          <div className="border-b bg-muted/40 px-5 py-3">
                            <h3 className="text-sm font-semibold">{catName}</h3>
                          </div>
                          <Accordion type="multiple" className="divide-y">
                            {visible.map((it) => {
                              const st = state[it.subcategory] ?? { checked: {}, notes: "" };
                              const max = maxReached(it, st);
                              const badgeStyle =
                                max === 0
                                  ? "bg-level-0 text-level-0-foreground border-transparent"
                                  : LEVEL_STYLES[it.levels[max - 1].level].badge;
                              return (
                                <AccordionItem key={it.subcategory} value={it.subcategory} className="border-0">
                                  <AccordionTrigger className="px-5 py-3 hover:no-underline">
                                    <div className="flex w-full items-start gap-3 text-left">
                                      <Badge className={`mt-0.5 shrink-0 ${badgeStyle}`}>
                                        {max ? `Nível ${max}` : "—"}
                                      </Badge>
                                      <span className="text-sm font-medium">{it.subcategory}</span>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-5 pb-5">
                                    {it.reference && (
                                      <p className="mb-3 text-xs text-muted-foreground">
                                        <span className="font-medium">Referências:</span> {it.reference}
                                      </p>
                                    )}
                                    <div className="space-y-3">
                                      {it.levels.map((lvl) => {
                                        const s = LEVEL_STYLES[lvl.level] ?? LEVEL_STYLES["1 – Inicial"];
                                        const isChecked = !!st.checked[lvl.level];
                                        return (
                                          <label
                                            key={lvl.level}
                                            className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${s.card} ${
                                              isChecked ? "ring-2 ring-offset-1 ring-offset-background" : ""
                                            }`}
                                            style={isChecked ? { boxShadow: `inset 0 0 0 1px transparent` } : undefined}
                                          >
                                            <Checkbox
                                              checked={isChecked}
                                              onCheckedChange={() => toggle(it.subcategory, lvl.level)}
                                              className="mt-0.5"
                                            />
                                            <div className="flex-1 space-y-2">
                                              <div className="flex items-center gap-2">
                                                <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                                                <span className="text-sm font-semibold">{lvl.level}</span>
                                              </div>
                                              {lvl.description && (
                                                <div className="whitespace-pre-line text-sm text-muted-foreground">
                                                  {lvl.description}
                                                </div>
                                              )}
                                              {lvl.evidence && (
                                                <div className="rounded-md bg-background/70 p-2 text-xs whitespace-pre-line">
                                                  <span className="font-medium">Evidências: </span>
                                                  {lvl.evidence}
                                                </div>
                                              )}
                                            </div>
                                          </label>
                                        );
                                      })}
                                    </div>
                                    <Textarea
                                      className="mt-3"
                                      placeholder="Observações e anexos…"
                                      value={st.notes}
                                      onChange={(e) => setNote(it.subcategory, e.target.value)}
                                    />
                                  </AccordionContent>
                                </AccordionItem>
                              );
                            })}
                          </Accordion>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: "Sem avaliação", value: stats.levelCounts[0], cls: "bg-level-0/40" },
                { label: "Nível 1 — Inicial", value: stats.levelCounts[1], cls: "bg-level-1/20 border-level-1/40" },
                { label: "Nível 2 — Intermédio", value: stats.levelCounts[2], cls: "bg-level-2/20 border-level-2/40" },
                { label: "Nível 3 — Avançado", value: stats.levelCounts[3], cls: "bg-level-3/20 border-level-3/40" },
              ].map((c) => (
                <Card key={c.label} className={`p-4 border ${c.cls}`}>
                  <div className="text-xs text-muted-foreground">{c.label}</div>
                  <div className="mt-1 text-3xl font-bold">{c.value}</div>
                </Card>
              ))}
            </div>

            <Card className="p-5">
              <h3 className="mb-4 text-sm font-semibold">Distribuição por objetivo e nível atingido</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={objectiveStats}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="objective" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="n0" stackId="a" name="Sem avaliação" fill="var(--level-0)" />
                    <Bar dataKey="n1" stackId="a" name="Nível 1" fill="var(--level-1)" />
                    <Bar dataKey="n2" stackId="a" name="Nível 2" fill="var(--level-2)" />
                    <Bar dataKey="n3" stackId="a" name="Nível 3" stroke="var(--level-3)" fill="var(--level-3)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-5">
                <h3 className="mb-4 text-sm font-semibold">Maturidade média por objetivo (0–3)</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={objectiveStats}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="objective" tick={{ fontSize: 12 }} />
                      <Radar
                        name="Maturidade média"
                        dataKey="avg"
                        stroke="var(--primary)"
                        fill="var(--primary)"
                        fillOpacity={0.3}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => v.toFixed(2)}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="mb-4 text-sm font-semibold">Distribuição global por nível</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={2}>
                        {pieData.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <Card className="p-5">
              <h3 className="mb-4 text-sm font-semibold">Detalhe por objetivo</h3>
              <div className="space-y-3">
                {objectiveStats.map((o) => {
                  const pct = o.total ? (o.avg / 3) * 100 : 0;
                  return (
                    <div key={o.objective}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{o.objective}</span>
                        <span className="text-muted-foreground">
                          {o.avg.toFixed(2)} / 3 · {o.total} subcategorias
                        </span>
                      </div>
                      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                        {[o.n1, o.n2, o.n3].map((v, i) => (
                          <div
                            key={i}
                            style={{
                              width: `${(v / o.total) * 100}%`,
                              background: LEVEL_FILL[i + 1],
                            }}
                          />
                        ))}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">Maturidade global: {pct.toFixed(0)}%</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Baseado no Quadro Nacional de Referência para a Cibersegurança (QNRCS) · Respostas guardadas localmente no navegador.
      </footer>
    </div>
  );
}
