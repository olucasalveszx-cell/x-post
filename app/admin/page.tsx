import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/adminAuth";
import AdminDashboard from "@/components/AdminDashboard";

export default function AdminPage() {
  const token = cookies().get(ADMIN_COOKIE)?.value ?? "";
  if (!verifyAdminToken(token)) redirect("/admin/login");

  return <AdminDashboard />;
}
