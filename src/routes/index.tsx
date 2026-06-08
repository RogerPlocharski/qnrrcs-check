import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { ShieldCheck, Download, Search, RotateCcw, ListChecks, BarChart3, FileText, Presentation } from "lucide-react";
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

type State = Record<string, { checked: Record<string, boolean>; notes: string }>;

const STORAGE_KEY = "qnrcs-checklist-v1";

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

function maxReached(item: Item, st: { checked: Record<string, boolean> } | undefined) {
  if (!st) return 0;
  const reached = item.levels.map((l, i) => (st.checked[l.level] ? i + 1 : 0)).filter(Boolean);
  return reached.length ? Math.max(...reached) : 0;
}

function Index() {
  const items = checklistData as Item[];
  const [state, setState] = useState<State>({});
  const [query, setQuery] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

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
    const levelCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const it of items) {
      const m = maxReached(it, state[it.subcategory]);
      levelCounts[m as 0 | 1 | 2 | 3]++;
      if (m > 0) achieved++;
    }
    return { total: items.length, achieved, levelCounts };
  }, [items, state]);

  const objectiveStats = useMemo(() => {
    return OBJECTIVE_ORDER.map((obj) => {
      const cats = grouped.get(obj);
      const list: Item[] = [];
      if (cats) cats.forEach((arr) => list.push(...arr));
      const counts = { n0: 0, n1: 0, n2: 0, n3: 0 };
      let sum = 0;
      for (const it of list) {
        const m = maxReached(it, state[it.subcategory]);
        sum += m;
        counts[`n${m}` as keyof typeof counts]++;
      }
      return {
        objective: obj,
        total: list.length,
        avg: list.length ? sum / list.length : 0,
        ...counts,
      };
    });
  }, [grouped, state]);

  const toggle = (sub: string, level: string) =>
    setState((s) => {
      const cur = s[sub] ?? { checked: {}, notes: "" };
      return { ...s, [sub]: { ...cur, checked: { ...cur.checked, [level]: !cur.checked[level] } } };
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
    const rows = [["Objetivo", "Categoria", "Subcategoria", "Nível 1", "Nível 2", "Nível 3", "Observações"]];
    for (const it of items) {
      const st = state[it.subcategory] ?? { checked: {}, notes: "" };
      rows.push([
        it.objective,
        it.category,
        it.subcategory,
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
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="mr-2 h-4 w-4" /> Exportar CSV
              </Button>
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reiniciar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Tabs defaultValue="checklist" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="checklist">
              <ListChecks className="mr-2 h-4 w-4" /> Checklist
            </TabsTrigger>
            <TabsTrigger value="dashboard">
              <BarChart3 className="mr-2 h-4 w-4" /> Dashboard
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
