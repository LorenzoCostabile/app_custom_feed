import "dotenv/config";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { sources, users } from "@/db/schema";

type SeedSource = {
  title: string;
  feedUrl: string;
  siteUrl: string;
};

const NEWS_SOURCES: SeedSource[] = [
  // Generalistas
  { title: "El País", feedUrl: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada", siteUrl: "https://elpais.com" },
  { title: "El Mundo", feedUrl: "https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml", siteUrl: "https://www.elmundo.es" },
  { title: "elDiario.es", feedUrl: "https://www.eldiario.es/rss/", siteUrl: "https://www.eldiario.es" },
  { title: "El Confidencial · España", feedUrl: "https://rss.elconfidencial.com/espana/", siteUrl: "https://www.elconfidencial.com" },
  { title: "La Vanguardia", feedUrl: "https://www.lavanguardia.com/rss/home.xml", siteUrl: "https://www.lavanguardia.com" },
  { title: "ABC · España", feedUrl: "https://www.abc.es/rss/feeds/abc_EspanaEspana.xml", siteUrl: "https://www.abc.es" },
  { title: "20minutos", feedUrl: "https://www.20minutos.es/rss/", siteUrl: "https://www.20minutos.es" },
  { title: "El Independiente", feedUrl: "https://www.elindependiente.com/feed/", siteUrl: "https://www.elindependiente.com" },
  { title: "El Español", feedUrl: "https://www.elespanol.com/rss/", siteUrl: "https://www.elespanol.com" },
  { title: "El HuffPost", feedUrl: "https://www.huffingtonpost.es/feeds/index.xml", siteUrl: "https://www.huffingtonpost.es" },
  { title: "The Objective", feedUrl: "https://theobjective.com/feed/", siteUrl: "https://theobjective.com" },
  { title: "La Marea", feedUrl: "https://www.lamarea.com/feed/", siteUrl: "https://www.lamarea.com" },
  { title: "Okdiario", feedUrl: "https://okdiario.com/feed/", siteUrl: "https://okdiario.com" },

  // Secciones
  { title: "El País · España", feedUrl: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/espana/portada", siteUrl: "https://elpais.com/espana/" },
  { title: "El País · Internacional", feedUrl: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/internacional/portada", siteUrl: "https://elpais.com/internacional/" },
  { title: "El País · Tecnología", feedUrl: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/tecnologia/portada", siteUrl: "https://elpais.com/tecnologia/" },
  { title: "El País · Cultura", feedUrl: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/cultura/portada", siteUrl: "https://elpais.com/cultura/" },
  { title: "ABC · Internacional", feedUrl: "https://www.abc.es/rss/feeds/abc_Internacional.xml", siteUrl: "https://www.abc.es/internacional/" },
  { title: "ABC · Cultura", feedUrl: "https://www.abc.es/rss/feeds/abc_Cultura.xml", siteUrl: "https://www.abc.es/cultura/" },
  { title: "La Vanguardia · Política", feedUrl: "https://www.lavanguardia.com/rss/politica.xml", siteUrl: "https://www.lavanguardia.com/politica" },
  { title: "elDiario · Economía", feedUrl: "https://www.eldiario.es/rss/economia/", siteUrl: "https://www.eldiario.es/economia/" },
  { title: "elDiario · Cultura", feedUrl: "https://www.eldiario.es/rss/cultura/", siteUrl: "https://www.eldiario.es/cultura/" },
  { title: "elDiario · Tecnología", feedUrl: "https://www.eldiario.es/rss/tecnologia/", siteUrl: "https://www.eldiario.es/tecnologia/" },
  { title: "El Español · España", feedUrl: "https://www.elespanol.com/rss/espana/", siteUrl: "https://www.elespanol.com/espana/" },

  // Economía
  { title: "Expansión", feedUrl: "https://e00-expansion.uecdn.es/rss/portada.xml", siteUrl: "https://www.expansion.com" },
  { title: "Cinco Días", feedUrl: "https://cincodias.elpais.com/rss/cincodias/portada.xml", siteUrl: "https://cincodias.elpais.com" },

  // Tecnología
  { title: "Xataka", feedUrl: "https://feeds.weblogssl.com/xataka2", siteUrl: "https://www.xataka.com" },
  { title: "Xataka Móvil", feedUrl: "https://feeds.weblogssl.com/xatakamovil", siteUrl: "https://www.xatakamovil.com" },
  { title: "Genbeta", feedUrl: "https://feeds.weblogssl.com/genbeta", siteUrl: "https://www.genbeta.com" },
  { title: "Hipertextual", feedUrl: "https://hipertextual.com/feed", siteUrl: "https://hipertextual.com" },
  { title: "ADSLZone", feedUrl: "https://www.adslzone.net/feed/", siteUrl: "https://www.adslzone.net" },
  { title: "Microsiervos", feedUrl: "https://www.microsiervos.com/index.xml", siteUrl: "https://www.microsiervos.com" },

  // Cultura
  { title: "Jot Down", feedUrl: "https://www.jotdown.es/feed/", siteUrl: "https://www.jotdown.es" },
  { title: "Zenda", feedUrl: "https://www.zendalibros.com/feed/", siteUrl: "https://www.zendalibros.com" },

  // Deportes
  { title: "Marca", feedUrl: "https://e00-marca.uecdn.es/rss/portada.xml", siteUrl: "https://www.marca.com" },
  { title: "AS", feedUrl: "https://feeds.as.com/mrss-s/pages/as/site/as.com/portada", siteUrl: "https://as.com" },
  { title: "Mundo Deportivo", feedUrl: "https://www.mundodeportivo.com/rss/portada.xml", siteUrl: "https://www.mundodeportivo.com" },
];

async function main(): Promise<void> {
  const email = (process.argv[2] ?? process.env.SEED_USER_EMAIL ?? process.env.ADMIN_EMAIL)
    ?.trim()
    .toLowerCase();

  if (!email) {
    console.log(
      "[seed] Indica el usuario: npm run db:seed -- correo@ejemplo.com (o SEED_USER_EMAIL).",
    );
    return;
  }

  const [user] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    console.log(`[seed] No existe el usuario ${email}.`);
    return;
  }

  let inserted = 0;
  for (const source of NEWS_SOURCES) {
    const [existing] = await db
      .select({ id: sources.id })
      .from(sources)
      .where(and(eq(sources.userId, user.id), eq(sources.feedUrl, source.feedUrl)))
      .limit(1);
    if (existing) continue;

    await db.insert(sources).values({
      userId: user.id,
      kind: "news",
      title: source.title,
      feedUrl: source.feedUrl,
      siteUrl: source.siteUrl,
      isFollowed: true,
      isActive: true,
    });
    inserted += 1;
  }

  console.log(
    `[seed] ${inserted} fuentes nuevas para ${user.name} (${email}). Total en catálogo: ${NEWS_SOURCES.length}.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
