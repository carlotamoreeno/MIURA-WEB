import {
  AlertCircleIcon,
  ArrowRightIcon,
  BarChart3Icon,
  CheckIcon,
  InfoIcon,
  MessageSquareTextIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { SeverityIndicator } from "@/components/miura/severity-indicator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const tokenExamples = [
  { name: "Primario", className: "bg-primary" },
  { name: "Info", className: "bg-info" },
  {
    name: "Bajo",
    className: "bg-severity-low",
  },
  {
    name: "Medio",
    className: "bg-severity-medium",
  },
  {
    name: "Alto",
    className: "bg-severity-high",
  },
];

const pillarRows = [
  {
    pillar: "Código/arquitectura",
    status: "Base visual",
    signal: "Semáforo + ayuda",
  },
  {
    pillar: "Documentación/conocimiento",
    status: "Base visual",
    signal: "Formulario + evidencia",
  },
  {
    pillar: "Personas/proceso",
    status: "Base visual",
    signal: "Progreso + lectura",
  },
];

function DesignSystemShowcase() {
  return (
    <section
      aria-labelledby="showcase-title"
      className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="mb-6 max-w-3xl space-y-3">
        <Badge variant="outline" className="border-primary/30 text-primary">
          TASK-003 · sistema visual
        </Badge>
        <div className="space-y-2">
          <h2
            id="showcase-title"
            className="text-2xl leading-tight font-semibold text-balance sm:text-3xl"
          >
            Sistema visual MIURA
          </h2>
          <p className="text-muted-foreground text-sm leading-6 sm:text-base">
            Tokens, estados y componentes base para una demo de consultoría
            enterprise amable, accesible y preparada para wizard y scorecard.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tokens y semáforos</CardTitle>
            <CardDescription>
              Estados con texto e icono; el color acompaña, no sustituye.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {tokenExamples.map((token) => (
                <div
                  key={token.name}
                  className="border-border bg-background flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="text-sm font-medium">{token.name}</span>
                  <span
                    className={`${token.className} block size-7 rounded-md ring-1 ring-black/10`}
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>

            <div className="grid gap-3">
              <SeverityIndicator level="low" />
              <SeverityIndicator level="medium" />
              <SeverityIndicator level="high" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Componentes base</CardTitle>
            <CardDescription>
              Botones, estados, pestañas, diálogo, progreso y ayudas
              contextuales.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Button>
                Crear evaluación
                <ArrowRightIcon />
              </Button>
              <Button variant="secondary">
                <MessageSquareTextIcon />
                Preguntar a MIURA
              </Button>
              <Button variant="outline">
                <BarChart3Icon />
                Ver scorecard
              </Button>
            </div>

            <Tabs defaultValue="executive">
              <TabsList aria-label="Vistas de ejemplo">
                <TabsTrigger value="executive">Ejecutiva</TabsTrigger>
                <TabsTrigger value="technical">Técnica</TabsTrigger>
              </TabsList>
              <TabsContent
                value="executive"
                className="border-border bg-background mt-3 rounded-lg border p-4 leading-6"
              >
                Lectura clara para negocio, con siguiente acción y severidad
                visible.
              </TabsContent>
              <TabsContent
                value="technical"
                className="border-border bg-background mt-3 rounded-lg border p-4 leading-6"
              >
                Espacio reservado para fórmulas, pesos y trazabilidad cuando
                exista el motor MIURA.
              </TabsContent>
            </Tabs>

            <div className="grid gap-3 sm:grid-cols-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <InfoIcon />
                      Ayuda contextual
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={8}>
                    Define por qué se pide un dato sin exponer jerga técnica.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <ShieldCheckIcon />
                    Ver disclaimer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>MIURA es preliminar</DialogTitle>
                    <DialogDescription>
                      La demo presenta escenarios orientativos. No sustituye una
                      auditoría industrial ni una contabilidad exacta.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button>Entendido</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">Progreso visual</span>
                <span className="text-muted-foreground">62%</span>
              </div>
              <Progress value={62} aria-label="Progreso visual del ejemplo" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Formulario guiado</CardTitle>
            <CardDescription>
              Composición accesible con primitivas actuales, sin añadir
              dependencias de formulario antes de schemas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldSet>
              <FieldLegend>Datos de ejemplo</FieldLegend>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="project-name">Proyecto</FieldLabel>
                  <Input
                    id="project-name"
                    defaultValue="Portal de atención interna"
                  />
                  <FieldDescription>
                    Nombre legible para orientar la evaluación local.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="methodology">Metodología</FieldLabel>
                  <Select defaultValue="scrum">
                    <SelectTrigger id="methodology" className="w-full">
                      <SelectValue placeholder="Selecciona metodología" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scrum">Scrum</SelectItem>
                      <SelectItem value="kanban">Kanban</SelectItem>
                      <SelectItem value="mixed">Mixta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Se usará después para orientar recomendaciones.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="evidence">Evidencia opcional</FieldLabel>
                  <Textarea
                    id="evidence"
                    defaultValue="Se detectan retrasos recurrentes en cambios pequeños y dependencia de conocimiento informal."
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Superficies de validación</CardTitle>
            <CardDescription>
              Alertas, tabla y lectura compacta para futuras vistas de
              evaluación.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Alert className="border-info-border bg-info-bg text-info-foreground">
              <AlertCircleIcon />
              <AlertTitle>Diagnóstico parcial</AlertTitle>
              <AlertDescription>
                La monetización fuerte se bloqueará cuando la cobertura de un
                pilar sea insuficiente.
              </AlertDescription>
            </Alert>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pilar</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Señal UI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pillarRows.map((row) => (
                  <TableRow key={row.pillar}>
                    <TableCell className="font-medium">{row.pillar}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        <CheckIcon />
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.signal}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="border-border bg-background rounded-lg border p-4">
              <Field orientation="horizontal">
                <FieldContent>
                  <p className="text-sm font-medium">Compatibilidad mobile</p>
                  <p className="text-muted-foreground text-sm leading-5">
                    Las rejillas se apilan desde 390px y conservan controles
                    táctiles legibles.
                  </p>
                </FieldContent>
                <Badge variant="outline">Responsive</Badge>
              </Field>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export { DesignSystemShowcase };
