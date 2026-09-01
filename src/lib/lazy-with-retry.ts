import { lazy, ComponentType } from "react";

type ComponentModule = { default: ComponentType<Record<string, unknown>> };

export function lazyWithRetry(
  factory: () => Promise<ComponentModule>,
  retries = 3,
  delay = 1000
): ReturnType<typeof lazy> {
  return lazy(() => retryImport(factory, retries, delay));
}

async function retryImport(
  factory: () => Promise<ComponentModule>,
  retries: number,
  delay: number
): Promise<ComponentModule> {
  try {
    return await factory();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise((r) => setTimeout(r, delay));
    return retryImport(factory, retries - 1, delay * 1.5);
  }
}
