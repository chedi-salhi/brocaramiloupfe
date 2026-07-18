import { auth } from "@/lib/auth";

export default async function ClientHome() {
  const session = await auth();

  return (
    <div>
      <h1 className="text-xl font-semibold">Bonjour {session?.user?.name ?? ""}</h1>
      <p className="text-zinc-500 mt-2">
        Retrouve ton panier, tes commandes en cours et tes favoris dans le menu ci-dessus.
      </p>
    </div>
  );
}
