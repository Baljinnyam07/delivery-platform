import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Signs out and returns to /login. `?reason=forbidden` shows a role error. */
async function signOut(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const url = new URL("/login", request.url);
  if (request.nextUrl.searchParams.get("reason") === "forbidden") {
    url.searchParams.set("error", "forbidden");
  }
  return NextResponse.redirect(url, { status: 303 });
}

export const GET = signOut;
export const POST = signOut;
