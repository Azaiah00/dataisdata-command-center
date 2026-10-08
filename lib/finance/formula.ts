/**
 * Safe formula engine for calculated custom fields.
 *
 * Supports: numbers, field references, + - * / % ^, parentheses, comparison
 * (> < >= <= == !=), and functions: min, max, round, abs, ceil, floor, if,
 * sqrt, pct(part, whole), avg(...), sum(...).
 *
 * Example formulas:
 *   (bill_rate - pay_rate) * weekly_hours * 52        → annual spread
 *   round(spread / bill_rate * 100, 1)                → margin %
 *   if(weekly_hours > 40, (weekly_hours - 40) * bill_rate * 1.5, 0)
 *
 * No eval / Function constructor is used — expressions are tokenised and
 * parsed into an AST, so nothing in a formula can execute code.
 */

type Token =
  | { t: "num"; v: number }
  | { t: "id"; v: string }
  | { t: "op"; v: string }
  | { t: "lp" }
  | { t: "rp" }
  | { t: "comma" };

type Node =
  | { k: "num"; v: number }
  | { k: "ref"; name: string }
  | { k: "un"; op: string; a: Node }
  | { k: "bin"; op: string; a: Node; b: Node }
  | { k: "call"; fn: string; args: Node[] };

export class FormulaError extends Error {}

const FUNCTIONS: Record<string, { min: number; max: number }> = {
  min: { min: 1, max: 20 },
  max: { min: 1, max: 20 },
  sum: { min: 1, max: 20 },
  avg: { min: 1, max: 20 },
  round: { min: 1, max: 2 },
  abs: { min: 1, max: 1 },
  ceil: { min: 1, max: 1 },
  floor: { min: 1, max: 1 },
  sqrt: { min: 1, max: 1 },
  if: { min: 3, max: 3 },
  pct: { min: 2, max: 2 },
};

export const FORMULA_FUNCTIONS = Object.keys(FUNCTIONS);

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const raw = src.slice(i, j);
      const v = Number(raw);
      if (!isFinite(v) || (raw.match(/\./g) || []).length > 1) throw new FormulaError(`Invalid number "${raw}"`);
      out.push({ t: "num", v });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      out.push({ t: "id", v: src.slice(i, j).toLowerCase() });
      i = j;
      continue;
    }
    if (c === "{") {
      // allow {field_key} style references
      const j = src.indexOf("}", i);
      if (j === -1) throw new FormulaError("Missing closing }");
      const name = src.slice(i + 1, j).trim().toLowerCase();
      if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new FormulaError(`Invalid field reference {${name}}`);
      out.push({ t: "id", v: name });
      i = j + 1;
      continue;
    }
    const two = src.slice(i, i + 2);
    if ([">=", "<=", "==", "!="].includes(two)) {
      out.push({ t: "op", v: two });
      i += 2;
      continue;
    }
    if ("+-*/%^<>".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (c === "(") {
      out.push({ t: "lp" });
      i++;
      continue;
    }
    if (c === ")") {
      out.push({ t: "rp" });
      i++;
      continue;
    }
    if (c === ",") {
      out.push({ t: "comma" });
      i++;
      continue;
    }
    throw new FormulaError(`Unexpected character "${c}"`);
  }
  return out;
}

class Parser {
  private i = 0;
  constructor(private toks: Token[]) {}
  private peek() {
    return this.toks[this.i];
  }
  private next() {
    return this.toks[this.i++];
  }
  parse(): Node {
    if (!this.toks.length) throw new FormulaError("Formula is empty");
    const n = this.comparison();
    if (this.i < this.toks.length) throw new FormulaError("Unexpected input after the end of the formula");
    return n;
  }
  private isOp(...ops: string[]) {
    const p = this.peek();
    return p && p.t === "op" && ops.includes(p.v);
  }
  private comparison(): Node {
    let a = this.additive();
    while (this.isOp(">", "<", ">=", "<=", "==", "!=")) {
      const op = (this.next() as { v: string }).v;
      a = { k: "bin", op, a, b: this.additive() };
    }
    return a;
  }
  private additive(): Node {
    let a = this.term();
    while (this.isOp("+", "-")) {
      const op = (this.next() as { v: string }).v;
      a = { k: "bin", op, a, b: this.term() };
    }
    return a;
  }
  private term(): Node {
    let a = this.power();
    while (this.isOp("*", "/", "%")) {
      const op = (this.next() as { v: string }).v;
      a = { k: "bin", op, a, b: this.power() };
    }
    return a;
  }
  private power(): Node {
    const a = this.unary();
    if (this.isOp("^")) {
      this.next();
      return { k: "bin", op: "^", a, b: this.power() };
    }
    return a;
  }
  private unary(): Node {
    if (this.isOp("-", "+")) {
      const op = (this.next() as { v: string }).v;
      return { k: "un", op, a: this.unary() };
    }
    return this.primary();
  }
  private primary(): Node {
    const tok = this.next();
    if (!tok) throw new FormulaError("Formula ends too early");
    if (tok.t === "num") return { k: "num", v: tok.v };
    if (tok.t === "lp") {
      const n = this.comparison();
      if (this.next()?.t !== "rp") throw new FormulaError("Missing closing parenthesis");
      return n;
    }
    if (tok.t === "id") {
      if (this.peek()?.t === "lp") {
        const fn = tok.v;
        if (!FUNCTIONS[fn]) throw new FormulaError(`Unknown function "${fn}"`);
        this.next();
        const args: Node[] = [];
        if (this.peek()?.t !== "rp") {
          args.push(this.comparison());
          while (this.peek()?.t === "comma") {
            this.next();
            args.push(this.comparison());
          }
        }
        if (this.next()?.t !== "rp") throw new FormulaError(`Missing ")" after ${fn}(`);
        const spec = FUNCTIONS[fn];
        if (args.length < spec.min || args.length > spec.max)
          throw new FormulaError(`${fn}() takes ${spec.min === spec.max ? spec.min : `${spec.min}-${spec.max}`} argument(s)`);
        return { k: "call", fn, args };
      }
      return { k: "ref", name: tok.v };
    }
    throw new FormulaError("Unexpected symbol in formula");
  }
}

export interface CompiledFormula {
  references: string[];
  evaluate: (vars: Record<string, number>) => number;
}

function collectRefs(n: Node, out: Set<string>) {
  if (n.k === "ref") out.add(n.name);
  else if (n.k === "un") collectRefs(n.a, out);
  else if (n.k === "bin") {
    collectRefs(n.a, out);
    collectRefs(n.b, out);
  } else if (n.k === "call") n.args.forEach((a) => collectRefs(a, out));
}

function evalNode(n: Node, vars: Record<string, number>): number {
  switch (n.k) {
    case "num":
      return n.v;
    case "ref": {
      const v = vars[n.name];
      return typeof v === "number" && isFinite(v) ? v : 0;
    }
    case "un": {
      const a = evalNode(n.a, vars);
      return n.op === "-" ? -a : a;
    }
    case "bin": {
      const a = evalNode(n.a, vars);
      const b = evalNode(n.b, vars);
      switch (n.op) {
        case "+":
          return a + b;
        case "-":
          return a - b;
        case "*":
          return a * b;
        case "/":
          return b === 0 ? 0 : a / b;
        case "%":
          return b === 0 ? 0 : a % b;
        case "^":
          return Math.pow(a, b);
        case ">":
          return a > b ? 1 : 0;
        case "<":
          return a < b ? 1 : 0;
        case ">=":
          return a >= b ? 1 : 0;
        case "<=":
          return a <= b ? 1 : 0;
        case "==":
          return a === b ? 1 : 0;
        case "!=":
          return a !== b ? 1 : 0;
      }
      return 0;
    }
    case "call": {
      if (n.fn === "if") return evalNode(n.args[0], vars) ? evalNode(n.args[1], vars) : evalNode(n.args[2], vars);
      const v = n.args.map((a) => evalNode(a, vars));
      switch (n.fn) {
        case "min":
          return Math.min(...v);
        case "max":
          return Math.max(...v);
        case "sum":
          return v.reduce((s, x) => s + x, 0);
        case "avg":
          return v.reduce((s, x) => s + x, 0) / v.length;
        case "round": {
          const d = Math.max(0, Math.min(6, Math.round(v[1] ?? 0)));
          const f = Math.pow(10, d);
          return Math.round(v[0] * f) / f;
        }
        case "abs":
          return Math.abs(v[0]);
        case "ceil":
          return Math.ceil(v[0]);
        case "floor":
          return Math.floor(v[0]);
        case "sqrt":
          return v[0] < 0 ? 0 : Math.sqrt(v[0]);
        case "pct":
          return v[1] === 0 ? 0 : (v[0] / v[1]) * 100;
      }
      return 0;
    }
  }
}

const cache = new Map<string, CompiledFormula>();

export function compileFormula(src: string): CompiledFormula {
  const key = src.trim();
  const hit = cache.get(key);
  if (hit) return hit;
  const ast = new Parser(tokenize(key)).parse();
  const refs = new Set<string>();
  collectRefs(ast, refs);
  const compiled: CompiledFormula = {
    references: Array.from(refs),
    evaluate: (vars) => {
      const r = evalNode(ast, vars);
      return isFinite(r) ? r : 0;
    },
  };
  if (cache.size > 500) cache.clear();
  cache.set(key, compiled);
  return compiled;
}

/** Validate a formula against the fields that are available to it. */
export function validateFormula(
  src: string,
  available: string[],
  selfKey?: string
): { ok: true; references: string[] } | { ok: false; error: string } {
  try {
    const c = compileFormula(src);
    const unknown = c.references.filter((r) => !available.includes(r));
    if (unknown.length) return { ok: false, error: `Unknown field${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}` };
    if (selfKey && c.references.includes(selfKey)) return { ok: false, error: "A formula cannot reference itself" };
    return { ok: true, references: c.references };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid formula" };
  }
}

/**
 * Evaluate every formula field for one record. Formula fields may reference
 * other formula fields; they are resolved in dependency order and cycles
 * evaluate to 0.
 */
export function evaluateFormulaFields(
  base: Record<string, number>,
  formulas: { key: string; formula: string }[]
): Record<string, number> {
  const vars: Record<string, number> = { ...base };
  const pending = new Map(formulas.map((f) => [f.key, f.formula]));
  const resolving = new Set<string>();

  const resolve = (key: string): number => {
    if (!pending.has(key)) return vars[key] ?? 0;
    if (resolving.has(key)) return 0; // cycle
    resolving.add(key);
    const src = pending.get(key)!;
    let value = 0;
    try {
      const c = compileFormula(src);
      for (const ref of c.references) if (pending.has(ref)) vars[ref] = resolve(ref);
      value = c.evaluate(vars);
    } catch {
      value = 0;
    }
    resolving.delete(key);
    pending.delete(key);
    vars[key] = value;
    return value;
  };

  for (const f of formulas) resolve(f.key);
  const out: Record<string, number> = {};
  for (const f of formulas) out[f.key] = vars[f.key] ?? 0;
  return out;
}
