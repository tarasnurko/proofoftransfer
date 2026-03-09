import type { Nullable } from "@/types";
import { EntityNotFoundException } from "@/exceptions";
import { SQL, sql } from "drizzle-orm";
import { AnyPgColumn } from "drizzle-orm/pg-core";

export function entityOrError<T>(
  entity: Nullable<T> | T[],
  errorMessage: string,
): T {
  if (Array.isArray(entity)) {
    const first = entity[0];
    if (!first) {
      throw new EntityNotFoundException(errorMessage);
    }
    return first;
  }

  if (!entity) {
    throw new EntityNotFoundException(errorMessage);
  }

  return entity;
}

export function entityOrNull<T>(entity: Nullable<T> | T[]): T | null {
  if (Array.isArray(entity)) {
    return entity[0] ?? null;
  }

  return entity ?? null;
}

// https://github.com/drizzle-team/drizzle-orm/discussions/1914#discussioncomment-9600199
export function enumToPgEnum<T extends Record<string, any>>(
  myEnum: T,
): [T[keyof T], ...T[keyof T][]] {
  return Object.values(myEnum).map((value: any) => `${value}`) as any;
}

export function lower(column: AnyPgColumn): SQL {
  return sql`lower(${column})`;
}
