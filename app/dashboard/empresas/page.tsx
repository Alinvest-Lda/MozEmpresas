import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createBusiness } from "@/lib/businesses/actions";
import { BusinessForm } from "@/components/business-form";

export default async function MyBusinesses() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: businesses }, { data: categories }] = await Promise.all([
    supabase.from("businesses").select("id,name,slug,description,location,is_public,created_at").eq("owner_id", user.id).order("created_at", { ascending: false }),
    supabase.from("business_categories").select("id,name,slug").order("name").limit(100),
  ]);

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <span className="eyebrow">Presença empresarial</span>
          <h1>Minhas empresas</h1>
          <p className="muted">Registe uma empresa, complete o perfil e publique-o no directório para começar a ser encontrado.</p>
        </div>

        <div className="grid" style={{ marginBottom: 38 }}>
          {businesses?.map((business) => (
            <Link href={"/empresas/" + business.slug} className="card" key={business.id}>
              <div className="icon">{business.name[0]}</div>
              <h3>{business.name}</h3>
              <div className="meta">
                <span className="tag">{business.location || "Sem localização"}</span>
                <span className="tag">{business.is_public ? "Publicado" : "Privado"}</span>
              </div>
              <p style={{ marginTop: 12 }}>{business.description || "Perfil ainda sem descrição."}</p>
              <span className="muted" style={{ display: "block", marginTop: 14, fontWeight: 800 }}>Ver perfil público →</span>
            </Link>
          ))}
          {(!businesses || businesses.length === 0) && (
            <div className="notice">Ainda não tem empresas. Registe a primeira abaixo.</div>
          )}
        </div>

        <section className="card" style={{ padding: 28, marginBottom: 18 }}>
          <span className="eyebrow">Publicação no directório</span>
          <h2 style={{ marginTop: 10 }}>Crie o perfil da sua empresa</h2>
          <p className="muted" style={{ maxWidth: 700 }}>
            Preencha os dados essenciais. Ao escolher “Pública”, o perfil fica disponível no directório e pode ser encontrado através da pesquisa.
          </p>
        </section>

        <BusinessForm action={createBusiness} categories={categories ?? []} />
      </div>
    </div>
  );
}
