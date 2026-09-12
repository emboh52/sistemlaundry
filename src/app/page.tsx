import { redirect } from "next/navigation";

export default function RootPage() {
  // Paksa redirect langsung dari Server Side ke /admin/login
  redirect("/admin/login");
}