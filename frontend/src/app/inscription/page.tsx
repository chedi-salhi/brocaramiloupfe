import Link from "next/link";
import { RegisterForm } from "@/components/register-form";

export default function InscriptionPage() {
  return (
    <div className="max-w-md mx-auto px-6 py-12 animate-fade-in">
      <h1 className="text-xl font-semibold mb-1">Créer un compte</h1>
      <p className="text-sm text-foreground/60 mb-6">
        L'adresse de livraison est obligatoire — elle sera utilisée pour tes commandes.
      </p>
      <RegisterForm />
      <p className="text-sm text-foreground/60 mt-4 text-center">
        Déjà client ?{" "}
        <Link href="/connexion" className="text-brand font-medium hover:underline">
          Connecte-toi
        </Link>
      </p>
    </div>
  );
}
