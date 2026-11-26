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
import {
  ShieldCheck,
  Download,
  Search,
  RotateCcw,
  ListChecks,
  BarChart3,
  FileText,
  Presentation,
  Upload,
  FileJson,
  FileSpreadsheet,
  ChevronDown,
  Filter,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// O título e a descrição desta página vêm da rota raiz (__root.tsx), que já
// define o conjunto completo de metatags Open Graph / Twitter. Redefini-los aqui
// só geraria uma segunda <meta name="description"> a sobrepor-se à primeira.
export const Route = createFileRoute("/")({
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

/**
 * Estado de uma subcategoria.
 *
 * `status` distingue dois casos que antes estavam fundidos numa única opção
 * "Não existe / Não aplicável":
 *   - "absent" → a capacidade devia existir mas não existe. É maturidade zero
 *                e conta para a média.
 *   - "na"     → a subcategoria não se aplica a esta organização. Sai
 *                inteiramente do denominador da maturidade.
 * Tratar as duas como equivalentes penalizava ou premiava injustamente,
 * conforme o caso.
 */
type ItemStatus = "absent" | "na";
type ItemState = { checked: Record<string, boolean>; notes: string; status?: ItemStatus };
type State = Record<string, ItemState>;

/** Formato legado (v1): indexado pelo texto da subcategoria, com `none` booleano. */
type LegacyItemState = { checked?: Record<string, boolean>; notes?: string; none?: boolean };

const STORAGE_KEY = "qnrcs-checklist-v2";
const LEGACY_STORAGE_KEY = "qnrcs-checklist-v1";
const META_KEY = "qnrcs-meta-v1";
const PROJECT_VERSION = "2.0";
const FRAMEWORK = "QNRCS";

const OBJECTIVE_ORDER = ["IDENTIFICAR", "PROTEGER", "DETETAR", "RESPONDER", "RECUPERAR"];

/**
 * Descrição de cada objetivo.
 *
 * Os objetivos deixaram de ter cor própria. Usavam os tokens --chart-1..5, cujas
 * matizes (41, 185, 227, 84, 70) colidiam com a rampa dos níveis de maturidade:
 * IDENTIFICAR (41), Nível 1 (55), RECUPERAR (70) e RESPONDER (84) caíam todos na
 * faixa laranja/âmbar, pelo que a mesma cor significava três coisas sem relação.
 *
 * Como os cinco objetivos são uma sequência (Identificar → … → Recuperar), não
 * categorias arbitrárias, um número ordena-os melhor do que uma matiz — e as
 * cores só apareciam aqui, em nenhum gráfico, por isso removê-las não custou
 * informação nenhuma.
 */
const OBJECTIVE_META: Record<string, { step: number; desc: string }> = {
  IDENTIFICAR: { step: 1, desc: "Compreender o contexto e gerir o risco" },
  PROTEGER: { step: 2, desc: "Salvaguardar a entrega dos serviços críticos" },
  DETETAR: { step: 3, desc: "Identificar eventos de cibersegurança" },
  RESPONDER: { step: 4, desc: "Agir perante um incidente detetado" },
  RECUPERAR: { step: 5, desc: "Restaurar capacidades e serviços afetados" },
};

/**
 * Estilos por nível.
 *
 * As opacidades do tema claro não se transferem para o escuro: no claro, 5% de
 * uma cor escura sobre branco é percetível; no escuro, 5% de uma cor clara
 * sobre o card dá 1.08:1 — invisível. As variantes `dark:` repõem valores
 * medidos (≈18% para superfície, ≈55% para contorno) que devolvem a mesma
 * legibilidade. O anel de seleção passa a usar a cor do próprio nível, em vez
 * do --ring genérico que era igual para os três.
 */
const LEVEL_STYLES: Record<string, { card: string; badge: string; dot: string; ring: string }> = {
  "1 – Inicial": {
    card: "border-level-1/40 bg-level-1/5 hover:bg-level-1/10 dark:border-level-1/55 dark:bg-level-1/18 dark:hover:bg-level-1/28",
    badge: "bg-level-1 text-level-1-foreground border-transparent",
    dot: "bg-level-1",
    ring: "ring-level-1",
  },
  "2 – Intermédio": {
    card: "border-level-2/40 bg-level-2/5 hover:bg-level-2/10 dark:border-level-2/57 dark:bg-level-2/18 dark:hover:bg-level-2/28",
    badge: "bg-level-2 text-level-2-foreground border-transparent",
    dot: "bg-level-2",
    ring: "ring-level-2",
  },
  "3 – Avançado": {
    card: "border-level-3/40 bg-level-3/5 hover:bg-level-3/10 dark:border-level-3/55 dark:bg-level-3/18 dark:hover:bg-level-3/28",
    badge: "bg-level-3 text-level-3-foreground border-transparent",
    dot: "bg-level-3",
    ring: "ring-level-3",
  },
};

/**
 * Equivalentes hexadecimais dos tokens --level-* definidos em styles.css.
 * Os relatórios são gerados numa janela isolada, sem acesso às CSS custom
 * properties da aplicação, por isso precisam das cores literais. Mantenha
 * sincronizado com styles.css.
 */
const LEVEL_HEX = {
  0: "#e2e5e8", // --level-0
  1: "#aa5910", // --level-1
  2: "#005bd2", // --level-2
  3: "#00723b", // --level-3
} as const;
/** "Não existe" é uma falha (vermelho); "não aplicável" é neutro (ardósia). */
const ABSENT_HEX = "#b91c1c";
const NA_HEX = "#475569";
const UNASSESSED_HEX = "#9ca3af";

/**
 * Estilos dos gráficos.
 *
 * O Recharts não conhece os tokens do tema: por omissão desenha os eixos a
 * #666, a grelha a #ccc e — pior — o texto da legenda na cor da própria série.
 * No tema escuro isso punha a legenda de "Por avaliar" (level-0, escuro) a
 * 1.41:1 sobre o card, ou seja invisível. Passar tudo pelas custom properties
 * faz os gráficos seguirem o tema.
 */
const AXIS_TICK = { fontSize: 12, fill: "var(--muted-foreground)" } as const;
const LEGEND_STYLE = { fontSize: 12, color: "var(--foreground)" } as const;

/** Força a cor do texto da legenda, que de outro modo herda a cor da série. */
function legendLabel(value: string) {
  return <span style={{ color: "var(--foreground)" }}>{value}</span>;
}

/**
 * Escapa conteúdo controlado pelo utilizador antes de o interpolar no HTML dos
 * relatórios. Sem isto, um ficheiro de projeto importado com HTML nas
 * observações executaria código na janela do relatório.
 */
function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escapa e converte quebras de linha em <br> para blocos de texto do relatório. */
function escapeMultiline(value: unknown) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

/**
 * Relação entre níveis.
 *
 * O Nível 2 substitui o 1: no ID.GA-1, o registo "sistemático" do Nível 2
 * sucede ao registo "isolado e pouco sistémico" do Nível 1. Por isso marcar o 2
 * marca o 1. O Nível 3 não repete o 2 — acrescenta-lhe práticas (monitorizar,
 * rever, melhorar) — por isso não o marca, mas só pode ser marcado com o 2
 * cumprido: sem inventário sistemático não há inventário para rever.
 *
 * Nível atingido: o mais alto com todos os anteriores cumpridos. Antes contava
 * o nível mais alto marcado, pelo que marcar só o Nível 3 dava pontuação 3.
 */
function maxReached(item: Item, st: ItemState | undefined) {
  if (!st || st.status) return 0;
  let reached = 0;
  for (const l of item.levels) {
    if (!st.checked[l.level]) break;
    reached++;
  }
  return reached;
}

/** Último nível (o 3), que não marca os anteriores. */
function topLevel(item: Item) {
  return item.levels[item.levels.length - 1]?.level;
}

/** O Nível 3 só pode ser marcado com todos os anteriores cumpridos. */
function canCheckTop(item: Item, st: ItemState | undefined) {
  return !!st && maxReached(item, { ...st, status: undefined }) >= item.levels.length - 1;
}

/**
 * Normaliza as marcações: ficam só os níveis consecutivos a partir do 1, como
 * booleanos. É o único estado que a interface permite construir.
 */
function normalizeChecked(item: Item, checked: Record<string, unknown>) {
  const out: Record<string, boolean> = {};
  for (const l of item.levels) {
    if (!checked[l.level]) break;
    out[l.level] = true;
  }
  return out;
}

function isAbsent(st: ItemState | undefined) {
  return st?.status === "absent";
}

function isNotApplicable(st: ItemState | undefined) {
  return st?.status === "na";
}

/**
 * Código estável da subcategoria (ex.: "ID.GA-1"), usado como chave de estado.
 *
 * Antes o estado era indexado pelo texto integral da subcategoria, o que
 * significava que corrigir uma gralha em checklist.json descartava
 * silenciosamente as respostas desse item. O código é curto, único (verificado
 * nas 102 subcategorias) e estável perante revisões de redação.
 */
const CODE_RE = /^([A-Z]{2}\.[A-Z]{2,3}-\d+)/;

function itemCode(it: Item) {
  return CODE_RE.exec(it.subcategory)?.[1] ?? it.subcategory;
}

/**
 * Título sem o código à cabeça.
 *
 * Todas as 102 subcategorias seguem o formato "ID.GA-1 – Texto". Mostrar o
 * código separado, em monoespaçado, dá uma âncora de leitura e encurta frases
 * que de outro modo ocupam três linhas de texto corrido.
 */
const CODE_PREFIX_RE = /^[A-Z]{2}\.[A-Z]{2,3}-\d+\s*[–—-]\s*/;

function itemTitle(it: Item) {
  return it.subcategory.replace(CODE_PREFIX_RE, "");
}

/**
 * Converte respostas guardadas no formato antigo para o novo.
 *
 * Aceita chaves por texto de subcategoria (v1) ou já por código (v2), e
 * converte `none: true` em `status: "absent"` — a leitura mais fiel, já que o
 * rótulo original começava por "Não existe". Quem tiver usado a opção com o
 * sentido de "não aplicável" pode reclassificar esses itens na interface.
 *
 * As marcações passam por `normalizeChecked`. `adjusted` conta as
 * subcategorias avaliadas que tinham níveis não consecutivos — o Nível 2 sem o
 * 1, ou o 3 sem o 2 — e cujos níveis seguintes foram descartados.
 */
function migrateResponses(
  raw: Record<string, unknown>,
  items: Item[],
): { state: State; adjusted: number } {
  const byText = new Map(items.map((it) => [it.subcategory, itemCode(it)]));
  const byCode = new Map(items.map((it) => [itemCode(it), it]));
  const out: State = {};
  let adjusted = 0;
  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") continue;
    const legacy = value as LegacyItemState & { status?: ItemStatus };
    const code = byCode.has(key) ? key : (byText.get(key) ?? CODE_RE.exec(key)?.[1]);
    const item = code ? byCode.get(code) : undefined;
    if (!code || !item) continue; // descarta entradas órfãs
    const status: ItemStatus | undefined =
      legacy.status === "absent" || legacy.status === "na"
        ? legacy.status
        : legacy.none
          ? "absent"
          : undefined;
    const rawChecked: Record<string, unknown> =
      typeof legacy.checked === "object" && legacy.checked ? legacy.checked : {};
    const checked = normalizeChecked(item, rawChecked);
    const marked = item.levels.filter((l) => rawChecked[l.level]).length;
    if (!status && marked > Object.keys(checked).length) adjusted++;
    out[code] = {
      checked,
      notes: typeof legacy.notes === "string" ? legacy.notes : "",
      ...(status ? { status } : {}),
    };
  }
  return { state: out, adjusted };
}

type StatusFilter = "all" | "unassessed" | "absent" | "na" | "1" | "2" | "3";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "unassessed", label: "Por avaliar" },
  { value: "absent", label: "Não existe" },
  { value: "na", label: "Não aplicável" },
  { value: "1", label: "Nível 1" },
  { value: "2", label: "Nível 2" },
  { value: "3", label: "Nível 3" },
];

/**
 * Normaliza texto para pesquisa: minúsculas e sem diacríticos, para que
 * "gestao" encontre "Gestão" e "detecao" encontre "Deteção".
 */
function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function Index() {
  const items = checklistData as Item[];
  const [state, setState] = useState<State>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  /** Subcategorias com o acordeão aberto. Controlado para permitir expandir/colapsar tudo. */
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [organization, setOrganization] = useState("");
  const [assessmentDate, setAssessmentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      // v2 primeiro; se não existir, migra o que estiver guardado em v1.
      const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setState(migrateResponses(parsed as Record<string, unknown>, items).state);
        }
      }
      const meta = localStorage.getItem(META_KEY);
      if (meta) {
        const m = JSON.parse(meta);
        if (m.organization) setOrganization(m.organization);
        if (m.assessmentDate) setAssessmentDate(m.assessmentDate);
      }
    } catch {
      /* estado corrompido ou localStorage indisponível: começa vazio */
    }
    // `items` é a importação estática do checklist — referência estável.
  }, [items]);

  /**
   * Persistência com atraso: escrever a cada tecla obrigava a serializar o
   * estado inteiro por cada caractere digitado nas observações. 400 ms é
   * impercetível para o utilizador e reduz drasticamente as escritas.
   */
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        toast.error("Não foi possível guardar as respostas neste navegador.");
      }
    }, 400);
    return () => clearTimeout(id);
  }, [state]);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(META_KEY, JSON.stringify({ organization, assessmentDate }));
      } catch {
        /* ignorado: metadados são secundários */
      }
    }, 400);
    return () => clearTimeout(id);
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

  /**
   * Índice de pesquisa: um texto por subcategoria, sem acentuação.
   *
   * A pesquisa passa a cobrir também as referências normativas (ISO, NIST,
   * CIS…), as descrições e as evidências de cada nível — antes só olhava para
   * o objetivo, a categoria e o nome da subcategoria, pelo que procurar
   * "backup" ou "ISO 27001 A.8.1.1" não devolvia nada apesar de os termos
   * existirem nos dados.
   */
  const searchIndex = useMemo(() => {
    const map = new Map<string, string>();
    for (const it of items) {
      const haystack = [
        it.objective,
        it.category,
        it.subcategory,
        it.reference,
        ...it.levels.flatMap((l) => [l.level, l.description, l.evidence]),
      ].join(" ");
      map.set(itemCode(it), normalizeText(haystack));
    }
    return map;
  }, [items]);

  const normalizedQuery = useMemo(() => normalizeText(query.trim()), [query]);

  const filtered = (it: Item) => {
    const code = itemCode(it);
    if (normalizedQuery && !(searchIndex.get(code) ?? "").includes(normalizedQuery)) {
      return false;
    }
    if (statusFilter === "all") return true;
    const st = state[code];
    if (statusFilter === "absent") return isAbsent(st);
    if (statusFilter === "na") return isNotApplicable(st);
    if (st?.status) return false;
    const max = maxReached(it, st);
    if (statusFilter === "unassessed") return max === 0;
    return String(max) === statusFilter;
  };

  const matchCount = useMemo(
    () => items.filter(filtered).length,
    // `filtered` é recriada a cada render, mas depende apenas destes valores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, normalizedQuery, searchIndex, statusFilter, state],
  );

  const isFiltering = normalizedQuery !== "" || statusFilter !== "all";

  const visibleKeys = useMemo(
    () => items.filter(filtered).map(itemCode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, normalizedQuery, searchIndex, statusFilter, state],
  );

  const stats = useMemo(() => {
    /**
     * Métricas deliberadamente distintas:
     *  - `assessed`     → subcategorias já decididas (nível atribuído, "não
     *                     existe" ou "não aplicável"). Mede o preenchimento.
     *  - `withMaturity` → subcategorias com pelo menos um nível atingido.
     *  - `applicable`   → total menos as "não aplicável". É o denominador da
     *                     maturidade: "não existe" conta como zero, "não
     *                     aplicável" não conta de todo.
     */
    let withMaturity = 0;
    let absent = 0;
    let na = 0;
    const levelCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const it of items) {
      const st = state[itemCode(it)];
      if (isNotApplicable(st)) {
        na++;
        continue;
      }
      if (isAbsent(st)) {
        absent++;
        continue;
      }
      const m = maxReached(it, st);
      levelCounts[m as 0 | 1 | 2 | 3]++;
      if (m > 0) withMaturity++;
    }
    const total = items.length;
    const assessed = total - levelCounts[0];
    return {
      total,
      withMaturity,
      absent,
      na,
      applicable: total - na,
      assessed,
      unassessed: levelCounts[0],
      coveragePct: total ? (assessed / total) * 100 : 0,
      levelCounts,
    };
  }, [items, state]);

  const objectiveStats = useMemo(() => {
    return OBJECTIVE_ORDER.map((obj) => {
      const cats = grouped.get(obj);
      const list: Item[] = [];
      if (cats) cats.forEach((arr) => list.push(...arr));
      const counts = { n0: 0, n1: 0, n2: 0, n3: 0, nAbsent: 0, nNa: 0 };
      let sum = 0;
      for (const it of list) {
        const st = state[itemCode(it)];
        if (isNotApplicable(st)) {
          counts.nNa++;
          continue;
        }
        if (isAbsent(st)) {
          counts.nAbsent++; // maturidade zero: entra no denominador, soma 0
          continue;
        }
        const m = maxReached(it, st);
        counts[`n${m}` as "n0" | "n1" | "n2" | "n3"]++;
        sum += m;
      }
      /**
       * Denominador da maturidade: subcategorias decididas e aplicáveis, ou
       * seja as que têm nível atribuído mais as marcadas como inexistentes.
       * As que ainda estão por avaliar ficam de fora — não se sabe o valor —
       * e as não aplicáveis também.
       */
      const scored = counts.nAbsent + counts.n1 + counts.n2 + counts.n3;
      return {
        objective: obj,
        total: list.length,
        applicable: list.length - counts.nNa,
        scored,
        avg: scored ? sum / scored : 0,
        ...counts,
      };
    });
  }, [grouped, state]);

  /**
   * Maturidade média global (0–3).
   *
   * Calculada sobre o conjunto de todas as subcategorias pontuadas, e não como
   * média das cinco médias por objetivo: os objetivos têm dimensões muito
   * diferentes (PROTEGER tem 38 subcategorias, RECUPERAR tem 5), pelo que a
   * média das médias dava a RECUPERAR quase oito vezes o peso por subcategoria.
   */
  const avgMaturity = useMemo(() => {
    const scored = objectiveStats.reduce((a, o) => a + o.scored, 0);
    const sum = objectiveStats.reduce((a, o) => a + o.avg * o.scored, 0);
    return scored ? sum / scored : 0;
  }, [objectiveStats]);

  const itemsByCode = useMemo(() => new Map(items.map((it) => [itemCode(it), it])), [items]);

  /**
   * Marcar o Nível 2 marca também o 1; desmarcar um nível desmarca os
   * seguintes. O Nível 3 não marca os anteriores e só pode ser marcado com o 2
   * cumprido (ver `maxReached` para a relação entre níveis).
   */
  const toggle = (code: string, level: string) =>
    setState((s) => {
      const item = itemsByCode.get(code);
      const idx = item ? item.levels.findIndex((l) => l.level === level) : -1;
      if (!item || idx < 0) return s;
      const cur = s[code] ?? { checked: {}, notes: "" };
      const isTop = level === topLevel(item);
      if (isTop && !cur.checked[level] && !canCheckTop(item, cur)) return s;
      const { status: _dropped, ...rest } = cur;
      // Marcar o nível N atinge N; desmarcá-lo deixa atingido N-1.
      const reached = cur.checked[level] ? idx : idx + 1;
      const checked = Object.fromEntries(item.levels.slice(0, reached).map((l) => [l.level, true]));
      return {
        ...s,
        // Atribuir um nível anula qualquer estado de "não existe"/"não aplicável".
        [code]: { ...rest, checked },
      };
    });

  /** Alterna entre um estado especial e nenhum; escolher um limpa os níveis. */
  const setStatus = (code: string, status: ItemStatus) =>
    setState((s) => {
      const cur = s[code] ?? { checked: {}, notes: "" };
      if (cur.status === status) {
        const { status: _cleared, ...rest } = cur;
        return { ...s, [code]: rest };
      }
      return { ...s, [code]: { ...cur, status, checked: {} } };
    });

  const setNote = (code: string, notes: string) =>
    setState((s) => {
      const cur = s[code] ?? { checked: {}, notes: "" };
      return { ...s, [code]: { ...cur, notes } };
    });

  const reset = () => {
    if (
      !confirm(
        "Tem a certeza? Todas as respostas, observações e dados da organização serão apagados.",
      )
    ) {
      return;
    }
    setState({});
    setOrganization("");
    setAssessmentDate(new Date().toISOString().slice(0, 10));
    toast.success("Avaliação reiniciada.");
  };

  const exportCsv = () => {
    const rows = [
      [
        "Código",
        "Objetivo",
        "Categoria",
        "Subcategoria",
        "Estado",
        "Não existe",
        "Não aplicável",
        "Nível 1",
        "Nível 2",
        "Nível 3",
        "Nível atingido",
        "Observações",
      ],
    ];
    for (const it of items) {
      const code = itemCode(it);
      const st = state[code] ?? { checked: {}, notes: "" };
      const max = maxReached(it, st);
      const estado = isNotApplicable(st)
        ? "Não aplicável"
        : isAbsent(st)
          ? "Não existe"
          : max
            ? `Nível ${max}`
            : "Por avaliar";
      rows.push([
        code,
        it.objective,
        it.category,
        it.subcategory,
        estado,
        isAbsent(st) ? "Sim" : "",
        isNotApplicable(st) ? "Sim" : "",
        st.checked["1 – Inicial"] ? "Sim" : "",
        st.checked["2 – Intermédio"] ? "Sim" : "",
        st.checked["3 – Avançado"] ? "Sim" : "",
        isNotApplicable(st) ? "" : String(max),
        st.notes ?? "",
      ]);
    }
    const csv = rows
      .map((r) => r.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "checklist-qnrcs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
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
          assessed: stats.assessed,
          unassessed: stats.unassessed,
          withMaturity: stats.withMaturity,
          absent: stats.absent,
          notApplicable: stats.na,
          applicable: stats.applicable,
          coveragePct: Number(stats.coveragePct.toFixed(2)),
          avgMaturity: Number(avgMaturity.toFixed(2)),
          levelCounts: stats.levelCounts,
          objectiveStats,
        },
        settings: {
          objectiveOrder: OBJECTIVE_ORDER,
          /** As respostas são indexadas pelo código da subcategoria (ex.: ID.GA-1). */
          responseKey: "subcategoryCode",
        },
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const safeOrg = (organization || "projeto")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
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

      let raw: Record<string, unknown> | undefined;
      if (data.assessmentData?.responses && typeof data.assessmentData.responses === "object") {
        raw = data.assessmentData.responses;
      } else if (data.responses && typeof data.responses === "object") {
        raw = data.responses; // formato ainda mais antigo
      }
      if (!raw) throw new Error("Ficheiro sem respostas válidas.");

      const imported = Object.keys(raw).length;
      // Aceita projetos v1 (chaves por texto, `none`) e v2 (chaves por código).
      const { state: responses, adjusted } = migrateResponses(raw, items);
      const kept = Object.keys(responses).length;
      if (!kept) {
        throw new Error("Nenhuma resposta do ficheiro corresponde a subcategorias conhecidas.");
      }

      setState(responses);
      if (typeof data.organization === "string") setOrganization(data.organization);
      if (typeof data.assessmentDate === "string") setAssessmentDate(data.assessmentDate);

      const dropped = imported - kept;
      const details = [
        dropped
          ? `${kept} respostas carregadas; ${dropped} não correspondem a subcategorias atuais e foram ignoradas.`
          : `${kept} respostas carregadas.`,
        adjusted
          ? `${adjusted} ${adjusted === 1 ? "subcategoria tinha" : "subcategorias tinham"} níveis não consecutivos (por exemplo, o Nível 3 sem o Nível 2) e ${adjusted === 1 ? "foi recalculada" : "foram recalculadas"}.`
          : "",
      ];
      toast.success(`Projeto importado (versão ${data.version}).`, {
        description: details.filter(Boolean).join(" "),
        duration: adjusted ? 10000 : undefined,
      });
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível importar o ficheiro", {
        description: err instanceof Error ? err.message : "Formato inválido.",
      });
    }
  };

  const generateReport = (kind: "executive" | "technical") => {
    const generatedAt = new Date().toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const orgLabel = organization.trim() || "Organização não identificada";
    const assessmentLabel = assessmentDate
      ? new Date(`${assessmentDate}T00:00:00`).toLocaleDateString("pt-PT", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "—";

    /**
     * Segmentos de uma barra por objetivo. Inclui "por avaliar" para que a barra
     * some sempre 100% — sem isso, uma barra vazia tanto podia significar
     * "ainda não avaliado" como "maturidade nula".
     */
    const objBlocks = objectiveStats
      .map((o) => {
        const segs = [
          { v: o.n0, c: LEVEL_HEX[0] },
          { v: o.nNa, c: NA_HEX },
          { v: o.nAbsent, c: ABSENT_HEX },
          { v: o.n1, c: LEVEL_HEX[1] },
          { v: o.n2, c: LEVEL_HEX[2] },
          { v: o.n3, c: LEVEL_HEX[3] },
        ]
          .map((s) =>
            s.v && o.total
              ? `<div style="width:${(s.v / o.total) * 100}%;background:${s.c}"></div>`
              : "",
          )
          .join("");
        return `
        <div class="obj-row">
          <div class="obj-head"><strong>${escapeHtml(o.objective)}</strong><span>${o.avg.toFixed(2)} / 3 · ${o.total} subcategorias${o.nAbsent ? ` · ${o.nAbsent} não existe` : ""}${o.nNa ? ` · ${o.nNa} n/a` : ""}${o.n0 ? ` · ${o.n0} por avaliar` : ""}</span></div>
          <div class="bar">${segs}</div>
        </div>`;
      })
      .join("");

    const pieSegs = [
      { v: stats.levelCounts[0], c: LEVEL_HEX[0], l: "Por avaliar" },
      { v: stats.na, c: NA_HEX, l: "Não aplicável" },
      { v: stats.absent, c: ABSENT_HEX, l: "Não existe" },
      { v: stats.levelCounts[1], c: LEVEL_HEX[1], l: "Nível 1 — Inicial" },
      { v: stats.levelCounts[2], c: LEVEL_HEX[2], l: "Nível 2 — Intermédio" },
      { v: stats.levelCounts[3], c: LEVEL_HEX[3], l: "Nível 3 — Avançado" },
    ];
    let cum = 0;
    const pieSvg = pieSegs
      .filter((s) => s.v > 0)
      .map((s) => {
        // Um único segmento a 100% não pode ser desenhado como arco (início = fim).
        if (s.v === stats.total) return `<circle cx="100" cy="100" r="80" fill="${s.c}"/>`;
        const start = (cum / stats.total) * 2 * Math.PI;
        cum += s.v;
        const end = (cum / stats.total) * 2 * Math.PI;
        const x1 = 100 + 80 * Math.sin(start);
        const y1 = 100 - 80 * Math.cos(start);
        const x2 = 100 + 80 * Math.sin(end);
        const y2 = 100 - 80 * Math.cos(end);
        const large = end - start > Math.PI ? 1 : 0;
        return `<path d="M100,100 L${x1},${y1} A80,80 0 ${large} 1 ${x2},${y2} Z" fill="${s.c}"/>`;
      })
      .join("");
    const legend = pieSegs
      .map(
        (s) =>
          `<div class="leg"><span style="background:${s.c}"></span>${escapeHtml(s.l)}: <strong>${s.v}</strong> <em>(${stats.total ? ((s.v / stats.total) * 100).toFixed(0) : 0}%)</em></div>`,
      )
      .join("");

    /**
     * Lacunas prioritárias: subcategorias ainda sem nível atribuído, ordenadas
     * pelos objetivos com menor maturidade média. O texto do Nível 1 serve de
     * próximo passo concreto — é o que transforma o relatório de "estado atual"
     * em "o que fazer a seguir".
     */
    const gaps = OBJECTIVE_ORDER.flatMap((objKey) => {
      const cats = grouped.get(objKey);
      if (!cats) return [];
      const list: Item[] = [];
      cats.forEach((arr) => list.push(...arr));
      const objAvg = objectiveStats.find((o) => o.objective === objKey)?.avg ?? 0;
      return list
        .filter((it) => {
          const st = state[itemCode(it)];
          return !st?.status && maxReached(it, st) === 0;
        })
        .map((it) => ({ objective: objKey, objAvg, item: it }));
    }).sort((a, b) => a.objAvg - b.objAvg);

    const GAP_LIMIT = 25;
    const gapsBlock = gaps.length
      ? `
        <table>
          <thead><tr><th style="width:14%">Objetivo</th><th style="width:36%">Subcategoria</th><th>Próximo passo (Nível 1 — Inicial)</th></tr></thead>
          <tbody>
            ${gaps
              .slice(0, GAP_LIMIT)
              .map(
                (g) =>
                  `<tr><td><strong>${escapeHtml(g.objective)}</strong></td><td>${escapeHtml(g.item.subcategory)}</td><td>${escapeMultiline(g.item.levels[0]?.description ?? "")}</td></tr>`,
              )
              .join("")}
          </tbody>
        </table>
        ${gaps.length > GAP_LIMIT ? `<p class="notes">Mostradas as ${GAP_LIMIT} lacunas mais prioritárias, de um total de ${gaps.length}.</p>` : ""}`
      : `<p class="notes">Não há subcategorias por avaliar — todas têm um nível atribuído ou estão marcadas como não aplicáveis.</p>`;

    const css = `
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:system-ui,-apple-system,sans-serif;color:#1f2937;padding:32px;max-width:900px;margin:auto;line-height:1.5}
      h1{font-size:24px;margin-bottom:4px;color:#0f172a}
      h2{font-size:18px;margin:24px 0 12px;color:#0f172a;border-bottom:2px solid #e5e7eb;padding-bottom:6px}
      h3{font-size:14px;margin:16px 0 8px;color:#374151}
      .sub{color:#6b7280;font-size:13px}
      .meta{display:flex;flex-wrap:wrap;gap:8px 24px;margin:12px 0 24px;padding:12px 16px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;font-size:13px}
      .meta span{color:#6b7280}
      .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}
      .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:12px;background:#f9fafb}
      .kpi .l{font-size:11px;color:#6b7280;text-transform:uppercase}
      .kpi .v{font-size:28px;font-weight:700;margin-top:4px}
      .kpi .h{font-size:11px;color:#9ca3af;margin-top:2px}
      .progress{height:12px;background:#e5e7eb;border-radius:6px;overflow:hidden;margin:8px 0 4px}
      .progress>div{height:100%;background:#1d4ed8}
      .obj-row{margin-bottom:14px}
      .obj-head{display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;gap:12px}
      .obj-head span{color:#6b7280;text-align:right}
      .bar{display:flex;height:10px;background:#f3f4f6;border-radius:5px;overflow:hidden}
      .pie-wrap{display:flex;gap:24px;align-items:center;margin:12px 0;flex-wrap:wrap}
      .leg{font-size:13px;display:flex;align-items:center;gap:8px;margin:4px 0}
      .leg span{display:inline-block;width:12px;height:12px;border-radius:2px;flex:none}
      .leg em{color:#6b7280;font-style:normal}
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

    const title = kind === "executive" ? "Relatório Executivo" : "Relatório Técnico";

    const header = `
      <div class="toolbar no-print">
        <button onclick="window.print()" class="primary">Guardar como PDF / Imprimir</button>
        <button onclick="window.close()">Fechar</button>
      </div>
      <h1>${title} — QNRCS</h1>
      <div class="sub">Quadro Nacional de Referência para a Cibersegurança</div>
      <div class="meta">
        <div><span>Organização:</span> <strong>${escapeHtml(orgLabel)}</strong></div>
        <div><span>Data da avaliação:</span> <strong>${escapeHtml(assessmentLabel)}</strong></div>
        <div><span>Relatório gerado em:</span> <strong>${escapeHtml(generatedAt)}</strong></div>
      </div>
      <div class="kpis">
        <div class="kpi"><div class="l">Subcategorias</div><div class="v">${stats.total}</div><div class="h">total do referencial</div></div>
        <div class="kpi"><div class="l">Cobertura</div><div class="v">${stats.coveragePct.toFixed(0)}%</div><div class="h">${stats.assessed} de ${stats.total} decididas</div></div>
        <div class="kpi"><div class="l">Com maturidade</div><div class="v">${stats.withMaturity}</div><div class="h">${stats.absent} sem capacidade · ${stats.na} n/a</div></div>
        <div class="kpi"><div class="l">Maturidade média</div><div class="v">${avgMaturity.toFixed(2)}</div><div class="h">escala 0–3</div></div>
      </div>
      <div class="progress"><div style="width:${stats.coveragePct}%"></div></div>
      <div class="sub">Cobertura da avaliação — percentagem de subcategorias já decididas, seja com nível atribuído seja marcadas como não aplicáveis.</div>
    `;

    let body = "";
    if (kind === "executive") {
      body = `
        <h2>Distribuição global por nível</h2>
        <div class="pie-wrap">
          <svg viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="Distribuição das subcategorias por nível">${pieSvg}<circle cx="100" cy="100" r="40" fill="#fff"/></svg>
          <div>${legend}</div>
        </div>
        <h2>Maturidade por objetivo</h2>
        ${objBlocks}
        <h2>Síntese</h2>
        <table>
          <thead><tr><th>Objetivo</th><th>Total</th><th>Por avaliar</th><th>Não existe</th><th>N/A</th><th>Nível 1</th><th>Nível 2</th><th>Nível 3</th><th>Maturidade</th></tr></thead>
          <tbody>
            ${objectiveStats
              .map(
                (o) =>
                  `<tr><td><strong>${escapeHtml(o.objective)}</strong></td><td>${o.total}</td><td>${o.n0}</td><td style="color:${ABSENT_HEX};font-weight:600">${o.nAbsent}</td><td style="color:${NA_HEX}">${o.nNa}</td><td>${o.n1}</td><td>${o.n2}</td><td>${o.n3}</td><td>${o.avg.toFixed(2)} / 3<div class="notes">${o.scored} pontuadas</div></td></tr>`,
              )
              .join("")}
          </tbody>
        </table>
        <h2>Lacunas prioritárias</h2>
        <p class="sub">Subcategorias ainda sem nível atribuído, ordenadas pelos objetivos com menor maturidade média. A última coluna indica o que é preciso para atingir o Nível 1.</p>
        ${gapsBlock}
      `;
    } else {
      const sections = OBJECTIVE_ORDER.map((objKey) => {
        const cats = grouped.get(objKey);
        if (!cats) return "";
        const catBlocks = Array.from(cats.entries())
          .map(([catName, subs]) => {
            const rows = subs
              .map((it) => {
                const st = state[itemCode(it)] ?? { checked: {}, notes: "" };
                const max = maxReached(it, st);
                const badge = isNotApplicable(st)
                  ? `<span class="badge" style="background:${NA_HEX}">Não aplicável</span>`
                  : isAbsent(st)
                    ? `<span class="badge" style="background:${ABSENT_HEX}">Não existe</span>`
                    : max
                      ? `<span class="badge" style="background:${LEVEL_HEX[max as 1 | 2 | 3]}">Nível ${max}</span>`
                      : `<span class="badge" style="background:${UNASSESSED_HEX}">Por avaliar</span>`;
                const lvls = it.levels
                  .map((l) => {
                    const checked = st.checked[l.level] ? "✓" : "✗";
                    return `<div><strong>${checked} ${escapeHtml(l.level)}</strong>${l.description ? `<div style="color:#4b5563">${escapeMultiline(l.description)}</div>` : ""}${l.evidence ? `<div class="notes"><em>Evidências:</em> ${escapeMultiline(l.evidence)}</div>` : ""}</div>`;
                  })
                  .join("<hr style='border:0;border-top:1px dashed #e5e7eb;margin:6px 0'>");
                return `
              <tr><td colspan="2">${badge} <strong>${escapeHtml(it.subcategory)}</strong>${it.reference ? `<div class="notes">Refs: ${escapeHtml(it.reference)}</div>` : ""}</td></tr>
              <tr><td style="width:55%">${lvls}</td><td>${st.notes ? `<strong>Observações:</strong><br>${escapeMultiline(st.notes)}` : "<em style='color:#9ca3af'>Sem observações</em>"}</td></tr>
            `;
              })
              .join("");
            return `<table><thead><tr><th colspan="2" class="cat">${escapeHtml(catName)}</th></tr></thead><tbody>${rows}</tbody></table><br>`;
          })
          .join("");
        return `<h2>${escapeHtml(objKey)}</h2>${catBlocks}`;
      }).join("");
      body = `<h2>Resumo por objetivo</h2>${objBlocks}${sections}`;
    }

    const html = `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} QNRCS — ${escapeHtml(orgLabel)}</title><style>${css}</style></head><body>${header}${body}<div class="footer">Gerado pela Checklist QNRCS · Baseado no Quadro Nacional de Referência para a Cibersegurança (CNCS)</div></body></html>`;

    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Não foi possível abrir o relatório", {
        description: "Permita janelas pop-up para este site e tente novamente.",
      });
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  const pieData = [
    { name: "Por avaliar", value: stats.levelCounts[0], color: "var(--level-0)" },
    { name: "Não aplicável", value: stats.na, color: "var(--muted-foreground)" },
    { name: "Não existe", value: stats.absent, color: "var(--destructive)" },
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
                Quadro Nacional de Referência para a Cibersegurança · Centro Nacional de
                Cibersegurança
              </p>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  Avaliadas: {stats.assessed} / {stats.total} subcategorias
                </span>
                <span className="text-muted-foreground">{stats.coveragePct.toFixed(0)}%</span>
              </div>
              <Progress
                value={stats.coveragePct}
                className="mt-2"
                aria-label={`Cobertura da avaliação: ${stats.coveragePct.toFixed(0)} por cento`}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Cobertura do preenchimento · Maturidade média{" "}
                <strong className="font-medium text-foreground">
                  {avgMaturity.toFixed(2)} / 3
                </strong>
              </p>
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
                    <Presentation className="mr-2 h-4 w-4" /> Relatório Executivo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => generateReport("technical")}>
                    <FileText className="mr-2 h-4 w-4" /> Relatório Técnico
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" onClick={importJson}>
                <Upload className="mr-2 h-4 w-4" /> Importar Projeto JSON
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
            <div className="space-y-2">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  aria-label="Pesquisar na checklist"
                  placeholder="Pesquisar por texto, referência normativa (ISO, NIST, CIS)…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Um Select em vez de sete botões: em ecrã estreito os botões
                    quebravam em três filas e empurravam a checklist para baixo
                    da dobra. */}
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                >
                  <SelectTrigger className="w-[190px]" aria-label="Filtrar por estado">
                    <Filter className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTERS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="ml-auto flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setOpenItems(visibleKeys)}
                    disabled={!visibleKeys.length}
                  >
                    Expandir tudo
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setOpenItems([])}
                    disabled={!openItems.length}
                  >
                    Colapsar tudo
                  </Button>
                </div>
              </div>

              {isFiltering && (
                <p className="text-xs text-muted-foreground" role="status">
                  {matchCount === 0
                    ? "Nenhuma subcategoria corresponde aos critérios."
                    : `${matchCount} de ${stats.total} subcategorias correspondem aos critérios.`}
                </p>
              )}
            </div>

            {matchCount === 0 && isFiltering && (
              <Card className="p-8 text-center">
                <p className="text-sm font-medium">Sem resultados.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {normalizedQuery
                    ? "Experimente outros termos — a pesquisa abrange descrições, evidências e referências normativas."
                    : "Nenhuma subcategoria está neste estado."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Limpar filtros
                </Button>
              </Card>
            )}

            {OBJECTIVE_ORDER.map((objKey) => {
              const cats = grouped.get(objKey);
              if (!cats) return null;
              // Sem isto, uma pesquisa restritiva deixava na página os cabeçalhos
              // dos objetivos sem qualquer subcategoria por baixo.
              const hasVisible = Array.from(cats.values()).some((subs) => subs.some(filtered));
              if (!hasVisible) return null;
              const meta = OBJECTIVE_META[objKey];
              return (
                <section key={objKey}>
                  <div className="mb-4 flex items-baseline gap-3 border-b pb-2">
                    <span
                      className="flex h-6 w-6 shrink-0 translate-y-0.5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                      aria-hidden="true"
                    >
                      {meta.step}
                    </span>
                    <h2 className="text-base font-semibold tracking-tight">{objKey}</h2>
                    <span className="text-xs text-muted-foreground">{meta.desc}</span>
                  </div>
                  <div className="space-y-4">
                    {Array.from(cats.entries()).map(([catName, subs]) => {
                      const visible = subs.filter(filtered);
                      if (!visible.length) return null;
                      return (
                        <Card key={catName} className="overflow-hidden">
                          <div className="border-b bg-muted/40 px-5 py-3 dark:bg-muted-foreground/14">
                            <h3 className="text-sm font-semibold">{catName}</h3>
                          </div>
                          <Accordion
                            type="multiple"
                            className="divide-y"
                            value={openItems.filter((k) => visible.some((v) => itemCode(v) === k))}
                            onValueChange={(next) =>
                              setOpenItems((prev) => [
                                // mantém abertas as subcategorias de outros cartões
                                ...prev.filter((k) => !visible.some((v) => itemCode(v) === k)),
                                ...next,
                              ])
                            }
                          >
                            {visible.map((it) => {
                              const code = itemCode(it);
                              const st = state[code] ?? { checked: {}, notes: "" };
                              const max = maxReached(it, st);
                              const absent = isAbsent(st);
                              const na = isNotApplicable(st);
                              const badgeStyle = absent
                                ? "bg-destructive text-destructive-foreground border-transparent"
                                : na
                                  ? "bg-muted-foreground text-background border-transparent"
                                  : max === 0
                                    ? "bg-level-0 text-level-0-foreground border-transparent"
                                    : LEVEL_STYLES[it.levels[max - 1].level].badge;
                              return (
                                <AccordionItem key={code} value={code} className="border-0">
                                  <AccordionTrigger className="px-5 py-3 hover:no-underline">
                                    <div className="flex w-full items-baseline gap-3 text-left">
                                      <code className="shrink-0 font-mono text-xs font-semibold tracking-tight text-muted-foreground">
                                        {code}
                                      </code>
                                      <span className="flex-1 text-sm font-medium">
                                        {itemTitle(it)}
                                      </span>
                                      <Badge className={`shrink-0 ${badgeStyle}`}>
                                        {absent
                                          ? "Não existe"
                                          : na
                                            ? "N/A"
                                            : max
                                              ? `Nível ${max}`
                                              : "—"}
                                      </Badge>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-5 pb-5">
                                    {it.reference && (
                                      <p className="mb-3 text-xs text-muted-foreground">
                                        <span className="font-medium">Referências:</span>{" "}
                                        {it.reference}
                                      </p>
                                    )}
                                    {/* Dois estados distintos: "não existe" é maturidade zero e
                                        conta para a média; "não aplicável" sai do cálculo. */}
                                    <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                      <label
                                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                                          absent
                                            ? "border-destructive bg-destructive/15 ring-2 ring-destructive/40 dark:bg-destructive/27"
                                            : "border-destructive/30 bg-destructive/5 hover:bg-destructive/10 dark:border-destructive/62 dark:bg-destructive/21 dark:hover:bg-destructive/27"
                                        }`}
                                      >
                                        <Checkbox
                                          checked={absent}
                                          onCheckedChange={() => setStatus(code, "absent")}
                                        />
                                        <span className="text-sm">
                                          <span className="font-semibold">Não existe</span>
                                          <span className="mt-0.5 block text-xs text-muted-foreground">
                                            Aplica-se, mas a capacidade não existe. Conta como
                                            maturidade zero.
                                          </span>
                                        </span>
                                      </label>
                                      <label
                                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                                          na
                                            ? "border-muted-foreground bg-muted ring-2 ring-muted-foreground/40 dark:bg-muted-foreground/23"
                                            : "bg-muted/30 hover:bg-muted/60 dark:bg-muted-foreground/17 dark:hover:bg-muted-foreground/23"
                                        }`}
                                      >
                                        <Checkbox
                                          checked={na}
                                          onCheckedChange={() => setStatus(code, "na")}
                                        />
                                        <span className="text-sm">
                                          <span className="font-semibold">Não aplicável</span>
                                          <span className="mt-0.5 block text-xs text-muted-foreground">
                                            Fora do âmbito da organização. Excluída da média.
                                          </span>
                                        </span>
                                      </label>
                                    </div>
                                    <div
                                      className={`space-y-3 ${st.status ? "pointer-events-none opacity-40" : ""}`}
                                    >
                                      <p className="text-xs text-muted-foreground">
                                        Marcar o Nível 2 marca também o Nível 1. O Nível 3 só pode
                                        ser marcado com o Nível 2 cumprido.
                                      </p>
                                      {it.levels.map((lvl) => {
                                        const s =
                                          LEVEL_STYLES[lvl.level] ?? LEVEL_STYLES["1 – Inicial"];
                                        const isChecked = !!st.checked[lvl.level];
                                        const locked =
                                          lvl.level === topLevel(it) &&
                                          !isChecked &&
                                          !canCheckTop(it, st);
                                        return (
                                          <label
                                            key={lvl.level}
                                            title={
                                              locked ? "Marque primeiro o Nível 2." : undefined
                                            }
                                            className={`flex gap-3 rounded-lg border p-3 transition-colors ${s.card} ${
                                              locked
                                                ? "cursor-not-allowed opacity-50"
                                                : "cursor-pointer"
                                            } ${
                                              isChecked
                                                ? `ring-2 ring-offset-1 ring-offset-background ${s.ring}`
                                                : ""
                                            }`}
                                          >
                                            <Checkbox
                                              checked={isChecked}
                                              disabled={locked}
                                              onCheckedChange={() => toggle(code, lvl.level)}
                                              className="mt-0.5"
                                            />
                                            <div className="flex-1 space-y-2">
                                              <div className="flex items-center gap-2">
                                                <span
                                                  className={`h-2.5 w-2.5 rounded-full ${s.dot}`}
                                                />
                                                <span className="text-sm font-semibold">
                                                  {lvl.level}
                                                </span>
                                              </div>
                                              {lvl.description && (
                                                <div className="whitespace-pre-line text-sm text-muted-foreground">
                                                  {lvl.description}
                                                </div>
                                              )}
                                              {lvl.evidence && (
                                                <div className="rounded-md bg-background/70 p-2 text-xs whitespace-pre-line dark:bg-background">
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
                                      onChange={(e) => setNote(code, e.target.value)}
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
            {/* Identificação da avaliação: são metadados de relatório, não da
                checklist. Estavam no cabeçalho a competir com o preenchimento;
                aqui ficam junto de onde os relatórios são gerados. */}
            <Card className="p-5">
              <h3 className="mb-1 text-sm font-semibold">Identificação da avaliação</h3>
              <p className="mb-4 text-xs text-muted-foreground">
                Aparecem no cabeçalho dos relatórios e no nome do ficheiro exportado.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="org" className="text-xs">
                    Organização
                  </Label>
                  <Input
                    id="org"
                    placeholder="Nome da organização"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adate" className="text-xs">
                    Data da avaliação
                  </Label>
                  <Input
                    id="adate"
                    type="date"
                    value={assessmentDate}
                    onChange={(e) => setAssessmentDate(e.target.value)}
                  />
                </div>
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-6">
              {[
                {
                  label: "Por avaliar",
                  value: stats.unassessed,
                  cls: "bg-muted dark:bg-muted-foreground/20",
                },
                {
                  label: "Não existe",
                  value: stats.absent,
                  cls: "bg-destructive/10 border-destructive/40 dark:bg-destructive/22 dark:border-destructive/62",
                },
                {
                  label: "Não aplicável",
                  value: stats.na,
                  cls: "bg-muted border-muted-foreground/30 dark:bg-muted-foreground/20 dark:border-muted-foreground/57",
                },
                {
                  label: "Nível 1 — Inicial",
                  value: stats.levelCounts[1],
                  cls: "bg-level-1/20 border-level-1/40 dark:bg-level-1/25 dark:border-level-1/55",
                },
                {
                  label: "Nível 2 — Intermédio",
                  value: stats.levelCounts[2],
                  cls: "bg-level-2/20 border-level-2/40 dark:bg-level-2/25 dark:border-level-2/57",
                },
                {
                  label: "Nível 3 — Avançado",
                  value: stats.levelCounts[3],
                  cls: "bg-level-3/20 border-level-3/40 dark:bg-level-3/25 dark:border-level-3/55",
                },
              ].map((c) => (
                <Card key={c.label} className={`p-4 border ${c.cls}`}>
                  <div className="text-xs text-muted-foreground">{c.label}</div>
                  <div className="mt-1 text-3xl font-bold">{c.value}</div>
                </Card>
              ))}
            </div>

            <Card className="p-5">
              <h3 className="mb-4 text-sm font-semibold">
                Distribuição por objetivo e nível atingido
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={objectiveStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="objective" tick={AXIS_TICK} stroke="var(--border)" />
                    <YAxis allowDecimals={false} tick={AXIS_TICK} stroke="var(--border)" />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={LEGEND_STYLE} formatter={legendLabel} />
                    <Bar dataKey="n0" stackId="a" name="Por avaliar" fill="var(--level-0)" />
                    <Bar
                      dataKey="nNa"
                      stackId="a"
                      name="Não aplicável"
                      fill="var(--muted-foreground)"
                    />
                    <Bar
                      dataKey="nAbsent"
                      stackId="a"
                      name="Não existe"
                      fill="var(--destructive)"
                    />
                    <Bar dataKey="n1" stackId="a" name="Nível 1" fill="var(--level-1)" />
                    <Bar dataKey="n2" stackId="a" name="Nível 2" fill="var(--level-2)" />
                    <Bar
                      dataKey="n3"
                      stackId="a"
                      name="Nível 3"
                      stroke="var(--level-3)"
                      fill="var(--level-3)"
                      radius={[6, 6, 0, 0]}
                    />
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
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="objective" tick={AXIS_TICK} />
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
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={2}
                      >
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
                      <Legend wrapperStyle={LEGEND_STYLE} formatter={legendLabel} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <Card className="p-5">
              <h3 className="mb-4 text-sm font-semibold">Detalhe por objetivo</h3>
              <div className="space-y-3">
                {objectiveStats.map((o) => {
                  const pct = (o.avg / 3) * 100;
                  return (
                    <div key={o.objective}>
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 text-sm">
                        <span className="font-medium">{o.objective}</span>
                        <span className="text-muted-foreground">
                          {o.avg.toFixed(2)} / 3 · {o.total} subcategorias
                          {o.nAbsent ? ` · ${o.nAbsent} não existe` : ""}
                          {o.nNa ? ` · ${o.nNa} n/a` : ""}
                          {o.n0 ? ` · ${o.n0} por avaliar` : ""}
                        </span>
                      </div>
                      {/* Todos os segmentos, incluindo "por avaliar", para que a
                          barra some 100% e não se confunda com maturidade nula. */}
                      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                        {[
                          { v: o.n0, c: "var(--level-0)" },
                          { v: o.nNa, c: "var(--muted-foreground)" },
                          { v: o.nAbsent, c: "var(--destructive)" },
                          { v: o.n1, c: "var(--level-1)" },
                          { v: o.n2, c: "var(--level-2)" },
                          { v: o.n3, c: "var(--level-3)" },
                        ].map((seg, i) => (
                          <div
                            key={i}
                            style={{
                              width: o.total ? `${(seg.v / o.total) * 100}%` : "0%",
                              background: seg.c,
                            }}
                          />
                        ))}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Maturidade: {pct.toFixed(0)}%
                        {o.scored ? ` (sobre ${o.scored} subcategorias pontuadas)` : " (sem dados)"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Baseado no Quadro Nacional de Referência para a Cibersegurança (QNRCS) · Respostas guardadas
        localmente no navegador.
      </footer>
    </div>
  );
}
