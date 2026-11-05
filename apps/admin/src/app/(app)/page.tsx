import { redirect } from "next/navigation";

// Dashboard is built in Phase 4. Until then, the deliveries list is home.
export default function HomePage() {
  redirect("/deliveries");
}
