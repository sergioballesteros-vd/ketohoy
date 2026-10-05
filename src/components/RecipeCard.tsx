"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Check, ChefHat, ListPlus, Loader2 } from "lucide-react";
import { ToneLabel, focusRing } from "@/components/ui";

import { recipeAvailabilityLabel, type RecipeAvailability } from "@/lib/recipeAvailability";

type RecipeCardProps = {
  availability: RecipeAvailability;
  recipe: {
    id: string;
    title: string;
    prepTimeMinutes: number;
    difficulty: string;
    ketoLevel: string;
    imageUrl?: string | null;
  };
  availableIngredients: string[];
  missingIngredients: string[];
  /** Adds the missing ingredients to the shopping list; must reject on failure. */
  onAddMissingToCart?: () => Promise<void>;
  /** Hide the verified sufficiency badge (e.g. when the list is already filtered to cookable recipes). */
  hideReady?: boolean;
};

const difficultyLabel: Record<string, string> = {
  very_easy: "Muy fácil",
  easy: "Fácil",
  medium: "Media",
};

// Same scale the old card used: strict = full keto, moderate = flexible, otherwise low carb.
const ketoLevel = {
  strict: { label: "Keto", tone: "good" },
  moderate: { label: "Flexible", tone: "ok" },
} as const;

export default function RecipeCard({
  recipe,
  availability,
  missingIngredients,
  onAddMissingToCart,
  hideReady,
}: RecipeCardProps) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">(
    "idle",
  );
  const missing = missingIngredients.length;
  const keto = ketoLevel[recipe.ketoLevel as keyof typeof ketoLevel] ?? {
    label: "Low carb",
    tone: "ok" as const,
  };

  const addMissing = async () => {
    if (!onAddMissingToCart || state === "busy") return;
    setState("busy");
    try {
      await onAddMissingToCart();
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <li className="min-w-0">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-forest-800">
        {recipe.imageUrl ? (
          <Image
            src={recipe.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 270px, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
          />
        ) : (
          <ChefHat
            className="absolute inset-0 m-auto text-forest-500"
            size={32}
            strokeWidth={1.5}
          />
        )}
        {/* pointer-only hit area; the title below is the keyboard/AT link */}
        <Link
          href={`/recipes/${recipe.id}`}
          tabIndex={-1}
          aria-hidden
          className="absolute inset-0"
        />

        {missing > 0 && onAddMissingToCart && (
          <button
            type="button"
            onClick={() => void addMissing()}
            disabled={state === "busy" || state === "done"}
            aria-label={
              state === "done"
                ? "Ingredientes añadidos a la lista"
                : state === "error"
                  ? "No se pudo añadir. Reintentar"
                  : `Añadir ${missing === 1 ? "el ingrediente que falta" : `los ${missing} ingredientes que faltan`} a la lista`
            }
            title={
              state === "error"
                ? "No se pudo añadir. Reintentar"
                : "Añadir faltantes a la lista"
            }
            className={`absolute right-2 bottom-2 hit-area flex h-10 w-10 items-center justify-center rounded-full ${focusRing} ${
              state === "done"
                ? "bg-[#a3e635] text-forest-950"
                : state === "error"
                  ? "bg-red-500/90 text-white"
                  : "bg-forest-950 text-forest-50 hover:bg-forest-950"
            }`}
          >
            {state === "busy" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : state === "done" ? (
              <Check size={16} strokeWidth={3} />
            ) : (
              <ListPlus size={17} />
            )}
          </button>
        )}
      </div>

      {(missing > 0 || !hideReady) && (
        <p className="mt-2 text-xs text-forest-200">
          {recipeAvailabilityLabel(availability)}
        </p>
      )}

      <Link
        href={`/recipes/${recipe.id}`}
        className={`mt-2 block rounded-lg ${focusRing}`}
      >
        <h2 className="line-clamp-2 min-h-[2.5em] text-[15px] leading-tight font-semibold text-forest-50">
          {recipe.title}
        </h2>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-forest-300">
          <span className="inline-flex items-center gap-1">
            {recipe.prepTimeMinutes} min
          </span>
          <span aria-hidden>·</span>
          <span>{difficultyLabel[recipe.difficulty] ?? recipe.difficulty}</span>
          <span aria-hidden>·</span>
          <ToneLabel tone={keto.tone} label={keto.label} />
        </p>
      </Link>
    </li>
  );
}
