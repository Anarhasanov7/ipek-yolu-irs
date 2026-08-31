// Ambient type declarations for the Supabase Edge Function runtime (Deno).
// This file silences local TS lint errors for Deno globals that are only
// available in the Supabase Edge Function runtime. It does not ship to the
// runtime — the real types are provided by Deno there.

declare global {
  const Deno: {
    env: { get(name: string): string | undefined };
    serve(handler: (req: Request) => Response | Promise<Response>): void;
    readonly args: string[];
    readonly mainModule: string;
  };
}

export {};
