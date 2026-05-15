import type { ReactNode } from "react";
import { InfoIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";

type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

type InfoTile = {
  title: string;
  description: string;
};

type InfoTileGridProps = {
  items: InfoTile[];
};

type MvpNoticeProps = {
  title: string;
  children: ReactNode;
};

function PageIntro({ eyebrow, title, description, children }: PageIntroProps) {
  return (
    <section className="border-border bg-card border-b">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-10 sm:px-6 lg:px-8">
        <Badge
          variant="outline"
          className="w-fit border-primary/30 text-primary"
        >
          {eyebrow}
        </Badge>
        <div className="max-w-3xl space-y-3">
          <h1 className="text-3xl leading-tight font-semibold tracking-normal text-balance sm:text-4xl">
            {title}
          </h1>
          <p className="text-muted-foreground text-base leading-7 sm:text-lg">
            {description}
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}

function InfoTileGrid({ items }: InfoTileGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <Card key={item.title}>
          <CardHeader>
            <h2 className="font-heading text-base leading-snug font-medium">
              {item.title}
            </h2>
            <CardDescription className="leading-6">
              {item.description}
            </CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function MvpNotice({ title, children }: MvpNoticeProps) {
  return (
    <Alert className="border-info-border bg-info-bg text-info-foreground">
      <InfoIcon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="leading-6">{children}</AlertDescription>
    </Alert>
  );
}

export { InfoTileGrid, MvpNotice, PageIntro, type InfoTile };
