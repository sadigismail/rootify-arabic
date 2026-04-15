import type { RootType } from "./rootClassifier.js";

const WAW  = "\u0648";
const YA   = "\u064A";
const ALEF = "\u0627";

export type WeakCategory = "hollow" | "defective" | "assimilated" | "sound";

export interface RecoveredRoot {
  r1: string;
  r2: string;
  r3: string;
  type: RootType;
  weakCategory: WeakCategory;
  trueRoot: string;
}

export function getWeakCategory(type: RootType): WeakCategory {
  if (type === "hollow_waw" || type === "hollow_ya") return "hollow";
  if (type === "defective_waw" || type === "defective_ya") return "defective";
  if (type === "assimilated") return "assimilated";
  return "sound";
}

export function isWeak(type: RootType): boolean {
  return getWeakCategory(type) !== "sound";
}

export function recoverRadicals(
  r1: string,
  r2: string,
  r3: string,
  type: RootType,
): RecoveredRoot {
  let realR1 = r1;
  let realR2 = r2;
  let realR3 = r3;

  if (type === "hollow_waw" && (r2 === ALEF || r2 === WAW)) {
    realR2 = WAW;
  } else if (type === "hollow_ya" && (r2 === ALEF || r2 === YA)) {
    realR2 = YA;
  }

  if (type === "defective_waw" && (r3 === ALEF || r3 === "\u0649")) {
    realR3 = WAW;
  } else if (type === "defective_ya" && (r3 === ALEF || r3 === "\u0649" || r3 === YA)) {
    realR3 = YA;
  }

  const weakCategory = getWeakCategory(type);
  const trueRoot = realR1 + realR2 + realR3;
  return { r1: realR1, r2: realR2, r3: realR3, type, weakCategory, trueRoot };
}

const EXCEPTION_MAP: Record<string, Partial<{
  masdar: string;
  activePart: string;
  passivePart: string;
  exagFaal: string;
}>> = {};

export function getException(trueRoot: string, field: keyof typeof EXCEPTION_MAP[string]): string | null {
  const entry = EXCEPTION_MAP[trueRoot];
  if (!entry) return null;
  return entry[field] ?? null;
}
