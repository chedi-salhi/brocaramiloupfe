import { apiFetch } from "@/lib/api-client";
import { ChatAdmin } from "@/components/admin/chat-admin";

interface UtilisateurAvecRole {
  idUtilisateur: number;
  nom: string;
  prenom: string | null;
  role?: { name: string } | null;
}

export default async function AdminMessagesPage() {
  const utilisateurs = await apiFetch<UtilisateurAvecRole[]>("/users");
  const contacts = utilisateurs.filter((u) => u.role?.name !== "admin");

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Messages</h1>
      <ChatAdmin contacts={contacts} />
    </div>
  );
}
