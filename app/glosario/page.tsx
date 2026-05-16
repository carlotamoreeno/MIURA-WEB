import type { Metadata } from "next";

import { MvpNotice, PageIntro } from "@/components/miura/page-structure";
import {
  MIURA_DISCLAIMERS,
  MIURA_FORMULA_HELP,
  MIURA_GLOSSARY_GROUPS,
} from "@/lib/miura/domain";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Glosario",
};

export default function GlossaryPage() {
  return (
    <>
      <PageIntro
        eyebrow="Ayuda contextual"
        title="Glosario MIURA"
        description="Definiciones breves para entender métricas, siglas, fórmulas y límites metodológicos sin depender de jerga técnica."
      />

      <section className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <MvpNotice title="Cómo leer este glosario">
          <span className="block">{MIURA_DISCLAIMERS.preliminary}</span>
          <span className="mt-2 block">{MIURA_DISCLAIMERS.economic}</span>
        </MvpNotice>

        <div className="space-y-4">
          <div className="max-w-3xl space-y-2">
            <Badge variant="secondary" className="w-fit">
              Fórmulas principales
            </Badge>
            <h2 className="text-2xl leading-tight font-semibold">
              Lectura rápida de índices y escenarios.
            </h2>
            <p className="text-muted-foreground leading-7">
              Estas ayudas explican qué significa cada cálculo antes de que las
              vistas finales de scorecard e informe usen los resultados.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {MIURA_FORMULA_HELP.map((help) => (
              <Card key={help.id}>
                <CardHeader>
                  <CardTitle className="text-base">{help.title}</CardTitle>
                  <CardDescription className="leading-6">
                    {help.summary}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-6">
                  <p className="border-border bg-muted/35 rounded-lg border p-3 font-mono text-xs text-foreground wrap-anywhere">
                    {help.formula}
                  </p>
                  <p className="text-muted-foreground">
                    {help.businessExplanation}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {MIURA_GLOSSARY_GROUPS.map((group) => (
          <div key={group.id} className="space-y-4">
            <div className="max-w-3xl space-y-2">
              <Badge variant="outline" className="w-fit">
                {group.title}
              </Badge>
              <p className="text-muted-foreground leading-7">
                {group.description}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {group.entries.map((entry) => (
                <Card key={entry.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">{entry.term}</CardTitle>
                      {entry.aliases?.map((alias) => (
                        <Badge key={alias} variant="secondary">
                          {alias}
                        </Badge>
                      ))}
                    </div>
                    <CardDescription className="leading-6">
                      {entry.shortDefinition}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm leading-6">
                    {entry.formula !== undefined && (
                      <p className="border-border bg-muted/35 rounded-lg border p-3 font-mono text-xs text-foreground wrap-anywhere">
                        {entry.formula}
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      {entry.businessExplanation}
                    </p>
                    {entry.example !== undefined && (
                      <p className="text-muted-foreground border-l-2 pl-3">
                        {entry.example}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
