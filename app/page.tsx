const pillars = [
  {
    name: "Código y arquitectura",
    description:
      "Señales sobre mantenibilidad, complejidad y fricción técnica acumulada.",
  },
  {
    name: "Documentación y conocimiento",
    description:
      "Evidencia sobre trazabilidad, transferencia de conocimiento y dependencia de contexto informal.",
  },
  {
    name: "Personas y proceso",
    description:
      "Indicadores de coordinación, capacidad perdida y prácticas de mejora continua.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-between gap-14 px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between border-b border-border pb-5">
          <p className="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            MIURA
          </p>
          <p className="rounded-md border border-border px-3 py-1 text-sm text-muted-foreground">
            Demo sin login
          </p>
        </header>

        <div className="grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div className="space-y-7">
            <p className="text-sm font-medium text-muted-foreground">
              MVP 0.1 · baseline técnico
            </p>
            <h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-normal sm:text-5xl">
              Deuda técnica explicada en lenguaje de negocio.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              MIURA convierte señales técnicas, documentales y de proceso en una
              evaluación guiada para conversar sobre riesgo, capacidad y coste
              de no actuar con prudencia metodológica.
            </p>
          </div>

          <div className="grid gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              Estado del producto
            </p>
            <p className="text-2xl font-semibold">Base reproducible lista</p>
            <p className="text-sm leading-6 text-muted-foreground">
              La aplicación no solicita cuentas, corre sobre Next.js App Router
              y prepara el terreno para evaluación local, scorecard y RAG con
              citas en tareas posteriores.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {pillars.map((pillar) => (
            <article
              key={pillar.name}
              className="rounded-lg border border-border bg-card p-5"
            >
              <h2 className="text-base font-semibold">{pillar.name}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {pillar.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
